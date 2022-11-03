export type BaseRouteTypes = Record<string, RouteHandler>;
export type RouteHandler<ReqType = any, ResType = any, EventTypes = Record<string, any>> = (props: {
  req: ReqType;
  emit: <EventType extends keyof EventTypes>(type: EventType, ...args: EventTypes[EventType] extends undefined ? [] : [data: EventTypes[EventType]]) => any;
}) => Promise<ResType>;

export type BaseEventTypes = Record<string, any>;

// credit: https://stackoverflow.com/questions/70344859/
export type PickKeysByValueType<T, TYPE> = {
  [K in keyof T]: T[K] extends TYPE ? K : never;
}[keyof T];
