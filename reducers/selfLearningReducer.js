const {
  SL_START,
  SL_RESET,
  SL_ENTRY,
  SL_SUCCESS,
} = require('../actions/types');

const {selfLearning} = require('../configs/current');

const initialState = {
  entries: [],
  calibration: selfLearning.startCalibration,
  tolerance: selfLearning.tolerance*(1 + selfLearning.startTolerance/100)/100,
  succes: 1,
  startTime: new Date(),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case SL_START:{
      return {
        ...state,
        succes: 0,
      }
    }
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
        succes: 0,
        startTime: new Date(),
        endTime: undefined,
      };
    }
    case SL_SUCCESS:{
      const {success, calibration} = action.payload;
      return {
        ...state,
        succes,
        calibration,
        tolerance: selfLearning.tolerance/100,
        endTime: new Date(),
      }
    }
    default:
      return state;
  }
};