const {
  SL_ENTRY,
  SL_SUCCESS,
} = require('../../actions/types');


function initialStateGlobal(){
  return {
    entries: [],
    matchedTolerance: 0,
  }
}

module.exports = function globalReducer(state = initialStateGlobal(), action = {type: null, payload: null}){
  switch(action.type) {
    case SL_ENTRY:{
      if (state.succes) return state;

      const {entry} = action.payload;
      const newEntries =  Array.from(state.entries);
      newEntries.push(entry);
      return {
        ...state,
        entries: newEntries,
      }
    }
    case SL_SUCCESS:{
      const {matchedTolerance} = action.payload;
      return {
        ...state,
        matchedTolerance,
      }
    }
    default:
      return state;
  }
}
