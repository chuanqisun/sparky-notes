//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

export const sha256 = async (object: unknown): Promise<string> => {
    const seen = new Map<any, string>();
    const buffer = await (window as any).crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(object, (key, value) => {
            if (seen.has(value)) {
                return seen.get(value);
            } else {
                seen.set(value, key);
                return value;
            }
        })),
    );
    return new TextDecoder().decode(buffer);
};

export interface DBObject<T> {
    readonly id: string;
    readonly object: T;
}

export class SimpleIndexedDB<T> {

    private readonly db = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.name, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('objects', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
        request.onblocked = reject;
    });

    constructor(
        private readonly name: string,
    ) { }

    private async transaction(mode: IDBTransactionMode) {
        const db = await this.db;
        return db.transaction('objects', mode).objectStore('objects');
    }

    public async getAll() {
        const transaction = await this.transaction('readonly');
        const request = transaction.getAll();
        return new Promise<DBObject<T>[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });
    }

    public async get<TId extends string | any>(id: TId) {
        const key = typeof id === 'string' ? id : await sha256(id);
        const transaction = await this.transaction('readonly');
        const request = transaction.get(key);
        return new Promise<T>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result?.object);
            request.onerror = reject;
        });
    }

    public async set<TId extends string | any>(id: TId, object: T, keepOriginalId = false) {
        const key = typeof id === 'string' ? id : await sha256(id);
        const transaction = await this.transaction('readwrite');
        const request = transaction.put({
            id: key,
            object,
            ...(keepOriginalId ? {
                originalId: id, // For debug purposes, not needed
            } : undefined),
        });
        return new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve;
            request.onerror = reject;
        });
    }
}
