const { combineReducers } = require('redux');
const serialReducer = require('./serialReducer');
const outputReducer = require('./outputReducer');
const inputReducer = require('./inputReducer');
const tableReducer = require('./tableReducer');
const lastActionReducer = require('./lastActionReducer');
const loggerReducer = require('./loggerReducer');
const selfLearningReducer = require('./selfLearningReducer');
const selfLearningIndividualReducer = require('./selfLearningIndividualReducer');

module.exports = combineReducers({
  serial: serialReducer,
  output: outputReducer,
  input: inputReducer,
  table: tableReducer,
  lastAction: lastActionReducer,
  logger: loggerReducer,
  selfLearning: selfLearningReducer,
  selfLearningIndividual: selfLearningIndividualReducer,
});