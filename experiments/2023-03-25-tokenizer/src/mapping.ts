type IsDebug = true;

export type DebugNever<TDebug> = IsDebug extends true ? TDebug : never;

export type ItemName<T> = [T] extends [{ named: infer N }] ? [N] extends [string] ? N : never : never;
export type NonElementKeys = keyof any[];
export type IfElementKey<K, T> = K extends NonElementKeys ? never : T;
export type MapFromNamedArrayWithIndex<TItems> = {
    [K in keyof TItems as IfElementKey<K, ItemName<TItems[K]>>]: TItems[K] & {
        index: K;
    };
};

export type MapFromNamedArray<TItems> = {
    [K in keyof TItems as IfElementKey<K, ItemName<TItems[K]>>]: TItems[K];
};

export type Kindless<T> = {
    [K in keyof T as K extends 'kind' ? never : K]: T[K];
};

export const mapFromNamedArray = <TItems extends readonly { named: string }[]>(items: TItems) => items.reduce((v: any, param, index) => (v[param.named] = {
    ...param,
    index,
}, v), {} as MapFromNamedArrayWithIndex<TItems>);
