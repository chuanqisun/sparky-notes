//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

import { cosineSimilarity } from './math';
import { AzureOpenAILLMService } from '@powerbi/PBIAssistant/services/llm/llm-azure-openai.service';

export interface SemanticDocument<T> {
    datum: T;
    serialization: string;
}

export interface SemanticDocumentEmbedding<T> {
    document: SemanticDocument<T>;
    embedding: Float32Array;
}

export interface SemanticDocumentSimilarity<T> {
    document: SemanticDocument<T>;
    similarity: number;
}

export interface SemanticDocumentSimilarityRanked<T> extends SemanticDocumentSimilarity<T> {
    rank: number;
}

export class SemanticSimilarity<T> {

    private readonly documentsEmbeddings: Promise<SemanticDocumentEmbedding<T>[]>;

    constructor(
        private readonly llm: AzureOpenAILLMService,
        private readonly documents: SemanticDocument<T>[],
    ) {
        this.documentsEmbeddings = this.getDocumentEmbeddings(this.documents);
    }

    public async getRankedDocuments(target: string | SemanticDocument<T>): Promise<SemanticDocumentSimilarityRanked<T>[]> {
        const documentSimilarities = await this.getDocumentSimilarities(target);
        return documentSimilarities
            .sort((a, b) => b.similarity - a.similarity)
            .map((documentSimilarity, index) => ({
                document: documentSimilarity.document,
                similarity: documentSimilarity.similarity,
                rank: index,
            }));
    }

    public async getDocumentSimilarities(target: string | SemanticDocument<T>): Promise<SemanticDocumentSimilarity<T>[]> {
        const targetEmbeddingRequest = this.llm.embedding({
            model: 'text-embedding-ada-002',
            input: typeof target === 'string' ? target : target.serialization,
        }, { delayCache: 0 });
        const [
            targetEmbedding,
            documentsEmbeddings,
        ] = await Promise.all([targetEmbeddingRequest, this.documentsEmbeddings]);
        const targetEmbeddingVector = new Float32Array(targetEmbedding.data[0].embedding);
        return documentsEmbeddings.map(documentEmbedding => ({
            document: documentEmbedding.document,
            similarity: cosineSimilarity(targetEmbeddingVector, documentEmbedding.embedding),
        }));
    }

    private async getDocumentEmbeddings(documents: SemanticDocument<T>[]): Promise<SemanticDocumentEmbedding<T>[]> {
        const embeddings = await this.llm.embedding({
            model: 'text-embedding-ada-002',
            input: documents.map(document => document.serialization),
        }, { delayCache: 0 });
        return embeddings.data.map(({ index, embedding }) => ({
            document: documents[index],
            embedding: new Float32Array(embedding),
        }));
    }
}
