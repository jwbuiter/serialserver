const { combineReducers } = require('redux');
const comReducer = require('./comReducer');
const outputReducer = require('./outputReducer');
const inputReducer = require('./inputReducer');
const tableReducer = require('./tableReducer');
const lastActionReducer = require('./lastActionReducer');

module.exports = combineReducers({
  com: comReducer,
  output: outputReducer,
  input: inputReducer,
  table: tableReducer,
  lastAction: lastActionReducer,
});