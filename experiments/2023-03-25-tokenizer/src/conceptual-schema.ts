//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

import { fuzzySearch, toStringLike } from './search';

import PrimitiveType = powerbi.PrimitiveType;
import ConceptualMultiplicity = powerbi.data.ConceptualMultiplicity;
import ConceptualSchema = powerbi.data.ConceptualSchema;
import ConceptualEntity = powerbi.data.ConceptualEntity;
import ConceptualProperty = powerbi.data.ConceptualProperty;

export const primitiveTypeToString: Readonly<Record<PrimitiveType, string>> = {
    [PrimitiveType.Null]: 'Null',
    [PrimitiveType.Text]: 'Text',
    [PrimitiveType.Decimal]: 'Decimal',
    [PrimitiveType.Double]: 'Double',
    [PrimitiveType.Integer]: 'Integer',
    [PrimitiveType.Boolean]: 'Boolean',
    [PrimitiveType.Date]: 'Date',
    [PrimitiveType.DateTime]: 'DateTime',
    [PrimitiveType.DateTimeZone]: 'DateTimeZone',
    [PrimitiveType.Time]: 'Time',
    [PrimitiveType.Duration]: 'Duration',
    [PrimitiveType.Binary]: 'Binary',
    [PrimitiveType.None]: 'None',
    [PrimitiveType.Variant]: 'Variant',
    [PrimitiveType.Json]: 'Json',
};

export const multiplicityToString: Readonly<Record<ConceptualMultiplicity, string>> = {
    [ConceptualMultiplicity.ZeroOrOne]: '0',
    [ConceptualMultiplicity.One]: '1',
    [ConceptualMultiplicity.Many]: 'N',
};

export interface ConceptualPropertyContext {
    schema: ConceptualSchema;
    entity: ConceptualEntity;
    property: ConceptualProperty;
};

const asStringLike = toStringLike<ConceptualPropertyContext>(context => `'${context.entity.name}'[${context.property.name}]`);

// First tries to find the exact property otherwise falls back to fuzzy search
export const createSchemaSearcher = (schema: ConceptualSchema) => {
    const properties = {} as Record<string, ReturnType<typeof asStringLike>>;
    for (const entity of schema.entities) {
        for (const property of entity.properties) {
            properties[`'${entity.name}'[${property.name}]`] = asStringLike({
                schema,
                entity,
                property,
            });
        }
    }
    const fuzzyItems = Object.values(properties);
    return (identifier: string) => properties[identifier]?.object
        || fuzzySearch(identifier, fuzzyItems)?.[0].item.object;
};
