const {
  SL_RESET_GLOBAL,
  SL_RESET_INDIVIDUAL,
  SL_START_INDIVIDUAL,
  SL_ENTRY,
  SL_SUCCESS,
  SL_SET_TOLERANCE,
  SL_INDIVIDUAL_UPGRADE,
  SL_INDIVIDUAL_DOWNGRADE,
  SL_INDIVIDUAL_LOAD,
  SL_INDIVIDUAL_INCREMENT,
  SL_INDIVIDUAL_DELETE_GENERAL,
  SL_INDIVIDUAL_DELETE_INDIVIDUAL,
  SL_INDIVIDUAL_EXTRA,
  SL_TEACH,
} = require('../../actions/types');

const {selfLearning} = require('../../configs/current');

const globalReducer = require('./globalReducer');
const individualReducer = require('./individualReducer')

function initialState(){
  const {selfLearning} = require('../../configs/current');
  return {
    global: globalReducer(),
    individual: individualReducer(),
    calibration: selfLearning.startCalibration,
    tolerance: selfLearning.tolerance/100,
    comIndex: Number(selfLearning.enabled[3]),
    type: 'none',
    success: 1,
    teaching: false,
    startTime: null,
  }
};

module.exports = function(state = initialState(), action) {
  const newState = {
    ...state,
    global: globalReducer(state.global, action),
    individual: individualReducer(state.individual, action)
  }

  switch(action.type) {
    case SL_TEACH:{
      const teaching = action.payload;
      return {
        ...state,
        teaching
      }
    }
    case SL_RESET_GLOBAL:{
      return {
        ...initialState(),
        type: 'global',
        tolerance: selfLearning.tolerance*(1+selfLearning.startTolerance/100)/100,
        success: 0,
        startTime: new Date(),
        endTime: undefined,
      }
    }
    case SL_RESET_INDIVIDUAL:{
      return {
        ...initialState(),
        type: 'individual',
        success: 0,
        startTime: new Date(),
        endTime: undefined,
      }
    }
    case SL_START_INDIVIDUAL:{
      return {
        ...state,
        type: 'individual',
        success: 0,
        startTime: new Date(),
        endTime: undefined,
      }
    }
    case SL_SUCCESS:{
      const {success, calibration, matchedTolerance} = action.payload;
      return {
        ...newState,
        success,
        calibration,
        tolerance: selfLearning.tolerance/100,
        endTime: new Date(),
      }
    }
    default:
      return newState;
  }
};

