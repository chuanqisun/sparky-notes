export type Fn = (...args: any[]) => any;

export type Keyed<T> = T & { key: string };

export type NonNullableObject<T> = {
  [key in keyof T]: NonNullable<T[key]>;
};
