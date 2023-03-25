//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

import type { AdHocQueryRunner } from '@powerbi/ExploreUI';
import type { AzureOpenAILLMService } from '../../services/llm/llm-azure-openai.service';
import { SimpleIndexedDB } from './indexed-db';
import { multiplicityToString, primitiveTypeToString } from './conceptual-schema';
import { cosineSimilarity } from './math';
import { getEncoder } from './encoder';

import SQExprBuilder = powerbi.data.SQExprBuilder;
import ConceptualPropertyKind = powerbi.data.ConceptualPropertyKind;
import ConceptualVisibility = powerbi.data.ConceptualVisibility;
import ConceptualSchema = powerbi.data.ConceptualSchema;
import ConceptualEntity = powerbi.data.ConceptualEntity;
import ConceptualProperty = powerbi.data.ConceptualProperty;
import QueryAggregateFunction = powerbi.data.QueryAggregateFunction;
import { NgZone } from '@angular/core';

export interface PropertySummary {
    entityName: string;
    propertyName: string;
    [QueryAggregateFunction.Count]: number;
    [QueryAggregateFunction.Avg]?: number;
    [QueryAggregateFunction.Max]?: number;
    [QueryAggregateFunction.Median]?: number;
    [QueryAggregateFunction.Min]?: number;
    [QueryAggregateFunction.StandardDeviation]?: number;
    [QueryAggregateFunction.Sum]?: number;
    [QueryAggregateFunction.Variance]?: number;
    sampleValues: any[];
}

export type PropertySummaries = Record<string, PropertySummary>;

export interface SchemaPart {
    schema: ConceptualSchema;
    entity: ConceptualEntity;
    property: ConceptualProperty;
}

export interface EnrichedSchemaPart {
    similarity: number;
    part: SchemaPart;
    summary: PropertySummary;
}

export type SchemaSerializer = (parts: EnrichedSchemaPart[]) => string;

export interface BudgetOptions {
    maxTokens: number;
    top?: number;
    threshold?: number;
}

export class SchemaReducer {

    private readonly db = new SimpleIndexedDB<PropertySummaries>('SchemaReducer.Summaries');
    private readonly schemaSummary = this.ngZone.runOutsideAngular(() => this.getSchemaSummary());
    private readonly embeddedSchema = this.ngZone.runOutsideAngular(() => this.getEmbeddedSchema());
    private readonly encoder = this.ngZone.runOutsideAngular(() => getEncoder());

    private readonly propertyLookup: Record<string, Record<string, SchemaPart>> = {};

    constructor(
        private readonly schema: ConceptualSchema,
        private readonly llm: AzureOpenAILLMService,
        private readonly ngZone: NgZone,
        private readonly adHocQueryRunner?: AdHocQueryRunner,
        private readonly useEmbedding: boolean = true,
    ) {
        for (const entity of this.schema.entities) {
            const entityLookup = this.propertyLookup[entity.name] ||= {};
            for (const property of entity.properties) {
                entityLookup[property.name] = {
                    schema: this.schema,
                    entity,
                    property,
                };
            }
        }
    }

    /**
     * Computes a maximized serialized schema based on similarity to `prompt` that fits within the `budget`
     * @param prompt The text to rank similarity of the schema parts against
     * @param budget The max token count for the serialized schema
     */
    public getSerializedSchema(prompt: string, budget: number | BudgetOptions, serializer?: SchemaSerializer | Partial<SchemaSerializerOptions>) {
        return this.ngZone.runOutsideAngular(async () => {
            const encoder = await this.encoder;
            budget =
                typeof budget === 'number' ? { maxTokens: budget }
                : budget;
            let rankedSchemaParts = await this.getSchemaSubset(prompt, budget.top, budget.threshold);
            serializer = typeof serializer === 'function'
                ? serializer
                : serializer
                    ? schemaSerializer(serializer)
                    : schemaSerializer();
            let lastSerializedSchema = '';
            let serializedSchema = serializer(rankedSchemaParts);
            let tokenCount = encoder(serializedSchema).length;
            // TODO: optimize with binary search
            while (tokenCount > budget.maxTokens && lastSerializedSchema !== serializedSchema && rankedSchemaParts.length > 1) {
                rankedSchemaParts.pop();
                lastSerializedSchema = serializedSchema;
                serializedSchema = serializer(rankedSchemaParts);
                tokenCount = encoder(serializedSchema).length;
            }
            return serializedSchema;
        });
    }

    public async getSchemaSubset(prompt: string, top: number = Infinity, threshold: number = -1): Promise<EnrichedSchemaPart[]> {
        const propertySimilarities = await this.getPropertySimilarity(prompt);
        const schemaSubset = propertySimilarities
            .filter(({ similarity }, i) => i < top && similarity >= threshold)
            .map(({ property: { entity, property }, summary, similarity }) => ({
                similarity,
                part: this.propertyLookup[entity][property],
                summary,
            }));
        console.log('SchemaReducer.SchemaSubset', {
            this: this,
            prompt,
            top,
            threshold,
            propertyDistances: propertySimilarities,
            schemaSubset,
        });
        return schemaSubset;
    }

    private async getPropertySimilarity(prompt: string) {
        if (!this.useEmbedding) {
            const [summaries, { properties }] = await Promise.all([
                this.schemaSummary,
                this.embeddedSchema,
            ]);
            return properties.map(property => ({
                property,
                summary: summaries[`'${property.entity}'[${property.property}]`],
                similarity: 1,
            })).sort((a, b) => a.property.index - b.property.index);
        }
        const [
            summaries,
            { embeddings, properties },
            { data: [{ embedding: result }] },
        ] = await Promise.all([
            this.schemaSummary,
            this.embeddedSchema,
            this.llm.embedding({
                model: 'text-embedding-ada-002',
                input: prompt,
            }),
        ]);
        const promptEmbedding = new Float32Array(result);
        return embeddings
            .map((propertyEmbedding, i) => ({
                property: properties[i],
                summary: summaries[`'${properties[i].entity}'[${properties[i].property}]`],
                similarity: cosineSimilarity(promptEmbedding, propertyEmbedding),
            }))
            .sort((a, b) => b.similarity - a.similarity); // Descending similarity
    }

    private async getSchemaSummary() {
        if (!this.adHocQueryRunner) {
            return {};
        }
        const key = this.schema.entities.flatMap(entity =>
            entity.properties.map(property =>
                `'${entity.name}'[${property.name}](${property.kind},${property.type.primitiveType})`,
            ),
        ).join('\n');
        const cachedSummary = await this.db.get(key);
        if (cachedSummary) {
            console.log('SchemaReducer.SchemaSummary.Cache.Hit', this.schema, cachedSummary);
            return cachedSummary;
        }
        const summaries = [] as Promise<PropertySummary>[];
        for (const entity of this.schema.entities) {
            for (const property of entity.properties) {
                if (property.kind === ConceptualPropertyKind.Column) {
                    const columnExpr = SQExprBuilder.fieldExpr({
                        column: {
                            schema: this.schema.name,
                            entity: entity.name,
                            name: property.name,
                        },
                    });
                    const all = [QueryAggregateFunction.Count] as const;
                    const aggregates = property.type.numeric
                        ? [
                            ...all,
                            QueryAggregateFunction.Avg,
                            QueryAggregateFunction.Max,
                            QueryAggregateFunction.Median,
                            QueryAggregateFunction.Min,
                            QueryAggregateFunction.StandardDeviation,
                            QueryAggregateFunction.Sum,
                            QueryAggregateFunction.Variance,
                        ] as const
                        : all;
                    const aggregateExprs = aggregates.map(stat => SQExprBuilder.aggregate(
                        columnExpr,
                        stat,
                    ));
                    const aggregateResult = this.adHocQueryRunner.getValues(aggregateExprs, {});
                    const sampleValueResult = this.adHocQueryRunner.getValues([columnExpr], {
                        top: 100,
                    });
                    summaries.push(new Promise(async resolve => {
                        const summary = {
                            entityName: entity.name,
                            propertyName: property.name,
                        } as PropertySummary;
                        const [
                            { result: aggregateResultValues },
                            { result: sampleValueResultValues },
                        ] = await Promise.all([aggregateResult, sampleValueResult] as const);
                        summary.sampleValues = sampleValueResultValues.map(row => row[0]?.toString() || 'null');
                        for (let i = 0; i < aggregateExprs.length; i++) {
                            summary[aggregates[i]] = aggregateResultValues[0][i] as number;
                        }
                        resolve(summary);
                    }));
                }
            }
        }
        const resolvedSummaries = await Promise.all(summaries);
        const propertySummaries = {} as PropertySummaries;
        for (const summary of resolvedSummaries) {
            propertySummaries[`'${summary.entityName}'[${summary.propertyName}]`] = summary;
        }
        console.log('SchemaReducer.SchemaSummary.Cache.Miss', this.schema, propertySummaries);
        this.db.set(key, propertySummaries);
        return propertySummaries;
    }

    private async getEmbeddedSchema() {
        const embeddingInputs = [] as {
            input: string;
            entity: string;
            property: string;
            index: number;
        }[];
        const schemaSummary = await this.schemaSummary;
        let index = 0;
        for (const entity of this.schema.entities) {
            if (entity.visibility !== ConceptualVisibility.Visible) continue;
            const relationships = [] as string[];
            const relatedEntities = entity.navigationProperties
                ?.filter(p => p.isActive && p.targetEntity.visibility === ConceptualVisibility.Visible)
                .map(property => {
                    const multiplicity = `${multiplicityToString[property.sourceMultiplicity]}:${multiplicityToString[property.targetMultiplicity]}`;
                    return `${property.targetEntity.name} (multiplicity=${multiplicity})`;
                })|| [];
            for (const property of entity.properties) {
                const identifier = `'${entity.name}'[${property.name}]`;
                const propertyKindName = property.kind === ConceptualPropertyKind.Column ? 'Column' : 'Measure';
                const parts = [
                    `# Summary of a ${property.kind === ConceptualPropertyKind.Column ? 'column' : 'measure'} in a table from a data schema`,
                    `- Table: ${entity.name}`,
                    `- ${propertyKindName}: ${property.name}`,
                    `- Identifier: ${identifier}`,
                    `- Data Type: ${primitiveTypeToString[property.type.primitiveType]}`,
                ];
                if (property.format) {
                    parts.push(`- Format: ${property.format}`);
                }
                if (relationships.length) {
                    parts.push(
                        '',
                        `## Related Tables`,
                        ...relatedEntities,
                    );
                }
                const propertySummary = schemaSummary[identifier];
                if (propertySummary) {
                    parts.push(
                        '',
                        `## Column Statistics`,
                        `- Count: ${propertySummary[QueryAggregateFunction.Count]}`,
                    );
                    if (property.type.numeric) {
                        parts.push(
                            `- Average: ${propertySummary[QueryAggregateFunction.Avg]}`,
                            `- Max: ${propertySummary[QueryAggregateFunction.Max]}`,
                            `- Median: ${propertySummary[QueryAggregateFunction.Median]}`,
                            `- Min: ${propertySummary[QueryAggregateFunction.Min]}`,
                            `- Standard Deviation: ${propertySummary[QueryAggregateFunction.StandardDeviation]}`,
                            `- Sum: ${propertySummary[QueryAggregateFunction.Sum]}`,
                            `- Variance: ${propertySummary[QueryAggregateFunction.Variance]}`,
                        );
                    }
                    parts.push(
                        '',
                        `## Sample Data (top 100 values from the column)`,
                        JSON.stringify(propertySummary.sampleValues),
                    );
                }
                embeddingInputs.push({
                    input: parts.join('\n'),
                    entity: entity.name,
                    property: property.name,
                    index: index++,
                });
            }
        }
        console.log('SchemaReducer.EmbeddedSchema.Inputs', embeddingInputs);

        let embeddings: Float32Array[] = [];
        if (this.useEmbedding) {
            const embeddingResult = await this.llm.embedding({
                model: 'text-embedding-ada-002',
                input: embeddingInputs.map(x => x.input),
            });

            embeddings = embeddingResult.data.map(result => new Float32Array(result.embedding));

            console.log('SchemaReducer.EmbeddedSchema.Result', embeddingInputs, embeddingResult);
        }

        const properties = embeddingInputs.map(({ entity, property }) => ({
            entity,
            property,
            index,
        }));

        return {
            embeddings,
            properties,
        };
    }
}

export interface PropertyOptions {
    types: boolean;
    labeled: boolean;
}

export type NameStyle = 'identifier' | 'text';

export interface SchemaSerializerOptions {
    nameStyle: NameStyle;
    table: {
        labeled: boolean;
        includeIfEmpty?: boolean;
    };
    relationships: false | {
        multiplicity: boolean;
        labeled: boolean;
    };
    measures: false | PropertyOptions;
    columns: false | PropertyOptions;
}

export const nonTechnicalSchemaStyle: SchemaSerializerOptions = {
    nameStyle: 'text',
    relationships: false,
    table: {
        labeled: false,
    },
    columns: {
        types: false,
        labeled: false,
    },
    measures: false,
    // measures: {
    //     types: false,
    //     labeled: false,
    // },
};

export const technicalSchemaStyle: SchemaSerializerOptions = {
    nameStyle: 'text',
    table: {
        labeled: true,
    },
    relationships: {
        multiplicity: false,
        labeled: true,
    },
    columns: {
        types: true,
        labeled: true,
    },
    measures: false,
    // measures: {
    //     types: true,
    //     labeled: true,
    // },
};

export const defaultOptions: SchemaSerializerOptions = nonTechnicalSchemaStyle;

export const schemaSerializer = (options?: Partial<SchemaSerializerOptions>) => (parts: EnrichedSchemaPart[]): string => {
    options = {
        ...defaultOptions,
        ...options,
    };
    const entities = {} as Record<string, {
        similarities: number[];
        avgSimilarity: number;
        entity: ConceptualEntity;
        properties: Record<string, EnrichedSchemaPart>;
    }>;
    for (const part of parts) {
        const table = entities[part.part.entity.name] ||= {
            similarities: [],
            avgSimilarity: -1,
            properties: {},
            entity: part.part.entity,
        };
        table.properties[part.part.property.name] = part;
        table.similarities.push(part.similarity);
    }

    for (const entity of Object.values(entities).filter(x => x.properties.length)) {
        entity.avgSimilarity = entity.similarities.reduce((sum, s) => sum + s, 0) / entity.similarities.length;
    }

    const sortedEntities = Object.values(entities).sort((a, b) => b.avgSimilarity - a.avgSimilarity);

    const schemaParts = [] as string[];
    for (const { entity, properties: propertyMap } of sortedEntities) {
        if (entity.visibility !== ConceptualVisibility.Visible) continue;
        const entityName = options.nameStyle === 'text' ? entity.name : `'${entity.name}'`;
        const tableParts = [''];
        const tableLabel = options.table.labeled ? 'Table: ' : '';
        tableParts.push(`${tableLabel}${entityName}`);
        if (options.relationships && entity.navigationProperties?.length) {
            if (entity.navigationProperties.some(p => p.isActive)) {
                let indent = ' ';
                if (options.relationships.labeled) {
                    tableParts.push(`${indent}Related Tables:`);
                    indent += ' ';
                }
                for (const property of entity.navigationProperties) {
                    if (!property.isActive || property.targetEntity.visibility !== ConceptualVisibility.Visible) continue;
                    const multiplicity = options.relationships.multiplicity
                        ? ` (multiplicity=${multiplicityToString[property.sourceMultiplicity]}:${multiplicityToString[property.targetMultiplicity]})`
                        : '';
                    const targetEntityName = options.nameStyle === 'text' ? property.targetEntity.name : `'${property.targetEntity.name}'`;
                    tableParts.push(`${indent}${targetEntityName}${multiplicity}`);
                }
            }
        }
        const serializeProperty = (part: EnrichedSchemaPart, propOptions: PropertyOptions) => {
            const property = part.part.property;
            const type = primitiveTypeToString[property.type.primitiveType];
            const propertyName = options.nameStyle === 'text' ? property.name : `[${property.name}]`;
            return propOptions.types ? `${propertyName} : ${type}` : propertyName;
        };
        const properties = Object.values(propertyMap).sort((a, b) => b.similarity - a.similarity);
        if (options.columns) {
            const propertyIndent = options.columns && options.columns.labeled ? '  ' : ' ';
            const columnParts = [] as string[];
            for (const part of properties) {
                if (part.part.property.kind === ConceptualPropertyKind.Column) {
                    columnParts.push(`${propertyIndent}${serializeProperty(part, options.columns)}`);
                }
            }
            if (columnParts.length) {
                if (options.columns.labeled) {
                    tableParts.push(' Columns:');
                }
                tableParts.push(...columnParts);
            }
        }
        if (options.measures) {
            const propertyIndent = options.measures && options.measures.labeled ? '  ' : ' ';
            const measureParts = [] as string[];
            for (const part of properties) {
                if (part.part.property.kind === ConceptualPropertyKind.Measure) {
                    measureParts.push(`${propertyIndent}${serializeProperty(part, options.measures)}`);
                }
            }
            if (measureParts.length) {
                if (options.measures.labeled) {
                    tableParts.push(' Measures:');
                }
                tableParts.push(...measureParts);
            }
        }
        if (tableParts.length > 2 || options.table?.includeIfEmpty) {
            schemaParts.push(...tableParts);
        }
    }
    return schemaParts.slice(1).join('\n');
};
