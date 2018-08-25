const { combineReducers } = require('redux');
const serialReducer = require('./serialReducer');
const outputReducer = require('./outputReducer');
const inputReducer = require('./inputReducer');
const tableReducer = require('./tableReducer');
const lastActionReducer = require('./lastActionReducer');

module.exports = combineReducers({
  serial: serialReducer,
  output: outputReducer,
  input: inputReducer,
  table: tableReducer,
  lastAction: lastActionReducer,
});