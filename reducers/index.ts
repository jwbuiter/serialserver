import { combineReducers } from "redux";
import lastActionReducer from "./lastActionReducer";
import serialReducer from "./serialReducer";
import outputReducer from "./outputReducer";
import inputReducer from "./inputReducer";
import tableReducer from "./tableReducer";
import loggerReducer from "./loggerReducer";
import selfLearningReducer from "./selfLearning/selfLearningReducer";
import configProvider from "./configProvider";

export default combineReducers({
  lastAction: lastActionReducer,
  serial: serialReducer,
  output: outputReducer,
  input: inputReducer,
  table: tableReducer,
  logger: loggerReducer,
  selfLearning: selfLearningReducer,
  config: configProvider
});
