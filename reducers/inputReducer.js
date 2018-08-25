const {
  INPUT_STATE_CHANGED,
  INPUT_FORCED_CHANGED,
  INPUT_FOLLOWING_CHANGED,
  INPUT_BLOCKING_CHANGED,
  EXECUTE_START,
  EXECUTE_STOP,
} = require('../actions/types.js');

const {input} = require('../config.js');

const initialState = {
  states: Array(input.length).fill(false),
  forced: Array(input.length).fill(false),
  following: Array(input.length).fill(false),
  blocking: Array(input.length).fill(false),
  executing: false,
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
  case INPUT_STATE_CHANGED:
    const {index, state} = action.payload;
    const newStates = Obect.assign({},state.states);
    newStates[index] = state
    return {
      ...state,
      states: newStates,
    }
  case INPUT_FORCED_CHANGED:
    const {index, forced} = action.payload;
    const newForced = Obect.assign({},state.forced);
    newForced[index] = forced;
    return {
      ...state,
      forced: newForced,
    }
  case INPUT_FOLLOWING_CHANGED:
    const {index, following} = action.payload;
    const newFollowing = Obect.assign({},state.following);
    newFollowing[index] = following;
    return {
      ...state,
      following: newFollowing,
    }
  case INPUT_Blocking_CHANGED:
    const {index, blocking} = action.payload;
    const newBlocking = Obect.assign({},state.blocking);
    newBlocking[index] = blocking;
    return {
      ...state,
      blocking: newBlocking,
    }
  case EXECUTE_START:
    return {
      ...state,
      executing: true,
    }
  case EXECUTE_STOP:
    return {
      ...state,
      executing: false,
    }
  }
};