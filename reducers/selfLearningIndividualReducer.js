const {
  SL_RESET,
  SL_ENTRY_INDIVIDUAL,
  SL_INDIVIDUAL_UPGRADE,
  SL_INDIVIDUAL_DOWNGRADE,
  SL_INDIVIDUAL_LOAD,
  SL_SUCCESS_INDIVIDUAL,
} = require('../actions/types');

const {selfLearning} = require('../configs/current');

const {tolerance} = selfLearning;

function initialState(){
  const {selfLearning} = require('../configs/current');
  return {
    generalEntries: {},
    individualEntries: {},
    calibration: selfLearning.startCalibration,
    success: 0,
  }
};

module.exports = function(state = initialState(), action) {
  switch(action.type) {
    case SL_ENTRY_INDIVIDUAL:{
      const {entry, key} = action.payload;

      const newGeneralEntries =  Array.from(state.generalEntries);
      const newIndividualEntries =  Array.from(state.individualEntries);

      if (key in state.individualEntries){
        newIndividualEntries[key] = {value: entry, tolerance: indTolerance, hasUpdated: true};
      } else if (key in state.generalEntries) {
        newGeneralEntries[key] = Array.from(newGeneralEntries[key]).concat(entry);
      } else {
        newGeneralEntries[key] = [entry];
      }

      return {
        ...state,
        individualEntries: newIndividualEntries,
        generalEntries: newGeneralEntries,
      }
    }
    case SL_INDIVIDUAL_UPGRADE:{
      const {entry, key} = action.payload;

      const newGeneralEntries =  Array.from(state.generalEntries);
      const newIndividualEntries =  Array.from(state.individualEntries);

      newGeneralEntries[key]=undefined;
      newIndividualEntries[key]={value: entry, tolerance: indTolerance, hasUpdated: true};
      return {
        ...state,
        individualEntries: newIndividualEntries,
        generalEntries: newGeneralEntries,
      }
    }
    case SL_INDIVIDUAL_DOWNGRADE:{
      const key = action.payload;

      const newIndividualEntries =  Array.from(state.individualEntries);

      newIndividualEntries[key]=undefined;
      return {
        ...state,
        individualEntries: newIndividualEntries,
      }
    }
    case SL_RESET:{
      return initialState()
    }
    case SL_SUCCESS_INDIVIDUAL:{
      const calibration = action.payload;
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