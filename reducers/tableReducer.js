const {
  TABLE_ENTRY,
  TABLE_RESET,
} = require('../actions/types.js');

const initialState = {
  entries: Array(10)
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
  case TABLE_ENTRY:
    const {index, entry} = action.payload;
    const newEntries = Obect.assign({},state.entries);
    newEntries[index] = entry;
    return {
      ...state,
      entries: newEntries,
    }
  case TABLE_RESET:
    return {
      ...state,
      entries: initialState.entries,
    }
  }
};