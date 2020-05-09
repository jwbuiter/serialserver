import { combineReducers } from "redux";
import { Action } from "../actions/types";
import lastActionReducer from "./lastActionReducer";
import serialReducer, { ISerialState } from "./serialReducer";
import outputReducer, { IOutputState } from "./outputReducer";
import inputReducer, { IInputState } from "./inputReducer";
import tableReducer, { ITableState } from "./tableReducer";
import loggerReducer, { ILoggerState } from "./loggerReducer";
import selfLearningReducer, {
  ISelfLearningState,
} from "./selfLearning/selfLearningReducer";
import configProvider from "./configProvider";

export type ReducerState = {
  lastAction: Action | null;
  serial: ISerialState;
  output: IOutputState;
  input: IInputState;
  table: ITableState;
  logger: ILoggerState;
  selfLearning: ISelfLearningState;
  config: any;
};

export default combineReducers<ReducerState, Action>({
  lastAction: lastActionReducer,
  serial: serialReducer,
  output: outputReducer,
  input: inputReducer,
  table: tableReducer,
  logger: loggerReducer,
  selfLearning: selfLearningReducer,
  config: configProvider,
});
