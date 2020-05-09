import { createStore, Store } from "redux";
import rootReducer, { ReducerState } from "./reducers/index.js";
import { Action } from "./actions/types";

export type StoreCallback = (lastAction: Action) => void;

export interface IStore extends Store<ReducerState, Action> {
  listeners: StoreCallback[];
  listen: (callback: StoreCallback) => void;
}

const store: IStore = {
  ...createStore(rootReducer),
  listeners: [],
  listen: (callback: StoreCallback) => {
    if (typeof callback !== "function") {
      throw new Error("Expected the listener to be a function.");
    }
    store.listeners.push(callback);
  },
};

store.subscribe(() => {
  const lastAction = store.getState().lastAction;
  store.listeners.forEach((listener) => {
    listener(lastAction);
  });
});

type bla = typeof store;

export default store;
