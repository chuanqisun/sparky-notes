export type BaseRouteTypes = Record<string, RouteHandler>;
export type RouteHandler<ReqType = any, ResType = any> = (props: { req: ReqType }) => Promise<ResType>;

export type BaseEventTypes = Record<string, any>;

// credit: https://stackoverflow.com/questions/70344859/
export type PickKeysByValueType<T, TYPE> = {
  [K in keyof T]: T[K] extends TYPE ? K : never;
}[keyof T];
