import { createStore } from "redux";
import rootReducer from "./reducers/index.js";
import { Action } from "./actions/types";

type StoreCallback = (lastAction: Action) => void;

const listeners: StoreCallback[] = [];

const store = {
  ...createStore(rootReducer),
  listeners,
  listen: (callback: StoreCallback) => {
    if (typeof callback !== "function") {
      throw new Error("Expected the listener to be a function.");
    }
    store.listeners.push(callback);
  }
};

store.subscribe(() => {
  const lastAction = store.getState().lastAction;
  store.listeners.forEach(listener => {
    listener(lastAction);
  });
});

export type StoreType = typeof store;

export default store;
