const { combineReducers } = require('redux');
const comReducer  = require('./comReducer');
const outputReducer  = require('./outputReducer');
const inputReducer  = require('./inputReducer');

module.exports = combineReducers({
  com: comReducer,
  output: outputReducer,
  input: inputReducer,
});