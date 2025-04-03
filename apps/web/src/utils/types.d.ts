export type Fn = (...args: any[]) => any;

export type NonNullableObject<T> = {
  [key in keyof T]: NonNullable<T[key]>;
};
