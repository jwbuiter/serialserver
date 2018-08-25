const {
  COM_ENTRY,
  COM_RESET,
} = require('../actions/types.js');

const initialState = {
  entries: [
    '0',
    '0'
  ]
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case COM_ENTRY:
      const {index, entry} = action.payload;
      const newEntries = Obect.assign({},state.entries);
      newEntries[index] = entry;
      return {
        ...state,
        entries: newEntries,
      }
    case COM_RESET:
      return {
        ...state,
        entries: initialState.entries,
      }
  }
};