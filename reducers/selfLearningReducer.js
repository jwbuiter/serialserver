const {
  SL_RESET,
  SL_ENTRY,
  SL_SUCCESS,
} = require('../actions/types');

const {selfLearning} = require('../configs/current');

const initialState = {
  entries: [],
  calibration: selfLearning.startCalibration,
  tolerance: selfLearning.tolerance*(1 + selfLearning.startTolerance/100)/100,
  success: 1,
  startTime: null,
  matchedTolerance: 0,
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case SL_ENTRY:{
      if (state.succes) return state;

      const entry = action.payload;
      const newEntries =  Array.from(state.entries);
      newEntries.push(entry);
      return {
        ...state,
        entries: newEntries,
      }
    }
    case SL_RESET:{
      return {
        ...initialState,
        success: 0,
        startTime: new Date(),
        endTime: undefined,
      };
    }
    case SL_SUCCESS:{
      const {success, calibration, matchedTolerance} = action.payload;
      return {
        ...state,
        success,
        calibration,
        tolerance: selfLearning.tolerance/100,
        matchedTolerance,
        endTime: new Date(),
      }
    }
    default:
      return state;
  }
};