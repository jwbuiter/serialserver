const {
  OUTPUT_STATE_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
} = require('../actions/types.js');

const {output} = require('../config.js');

const initialState = {
  states: Array(output.length).fill(false),
  forced: Array(output.length).fill(false),
  executing: Array(output.length).fill(false),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
  case OUTPUT_STATE_CHANGED:
    const {index, state} = action.payload;
    const newStates = Obect.assign({},state.states);
    newStates[index] = state
    return {
      ...state,
      states: newStates,
    }
  case OUTPUT_FORCED_CHANGED:
    const {index, forced} = action.payload;
    const newForced = Obect.assign({},state.forced);
    newForced[index] = forced;
    return {
      ...state,
      forced: newForced,
    }
  }
  case OUTPUT_EXECUTING_CHANGED:
  const {index, executing} = action.payload;
  const newExecuting = Obect.assign({},state.executing);
  newExecuting[index] = executing;
  return {
    ...state,
    executing: newExecuting,
  }
};