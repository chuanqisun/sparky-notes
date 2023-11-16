import { BehaviorSubject, Subject, scan, tap } from "rxjs";

export interface BaseAction {
  type: string;
}

export interface StoreConfig<StateType, ActionType = BaseAction> {
  reducers: ((state: StateType, action: ActionType) => StateType)[];
  initialState: StateType;
}
export function createStore<StateType, ActionType extends BaseAction>({ reducers, initialState }: StoreConfig<StateType, ActionType>) {
  const $actions = new Subject<ActionType>();
  const $state = new BehaviorSubject(initialState);
  $actions
    .pipe(
      scan((state, action) => {
        const newState = reducers.reduce((state, reducer) => {
          return reducer(state, action);
        }, state);

        return newState;
      }, initialState),
      tap($state)
    )
    .subscribe();

  const dispatch = (action: ActionType) => {
    $actions.next(action);
  };

  return {
    dispatch,
    $state,
  };
}
