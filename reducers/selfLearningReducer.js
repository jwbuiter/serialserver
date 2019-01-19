const {
  SL_RESET_GLOBAL,
  SL_RESET_INDIVIDUAL,
  SL_ENTRY,
  SL_SUCCESS,
  SL_SET_TOLERANCE,
  SL_INDIVIDUAL_UPGRADE,
  SL_INDIVIDUAL_DOWNGRADE,
  SL_INDIVIDUAL_LOAD,
  SL_INDIVIDUAL_INCREMENT,
  SL_TEACH,
} = require('../actions/types');

const {selfLearning} = require('../configs/current');

function initialState(){
  const {selfLearning} = require('../configs/current');
  return {
    global: initialStateGlobal(),
    individual: initialStateIndividual(),
    calibration: selfLearning.startCalibration,
    tolerance: selfLearning.tolerance/100,
    comIndex: Number(selfLearning.enabled[3]),
    type: 'none',
    success: 1,
    teaching: false,
    startTime: null,
  }
};

function initialStateGlobal(){
  return {
    entries: [],
    matchedTolerance: 0,
  }
}

function initialStateIndividual(){
  return {
    generalEntries: {},
    individualEntries: {},
  }
}

function globalReducer(state, action){
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

function individualReducer(state, action){
  switch(action.type) {
    case SL_ENTRY:{
      const {entry, key} = action.payload;

      const newGeneralEntries =  Object.assign({}, state.generalEntries);
      const newIndividualEntries =  Object.assign({}, state.individualEntries);

      if (key in state.individualEntries){
        newIndividualEntries[key] = {calibration: entry, tolerance: selfLearning.individualTolerance, numUpdates: newIndividualEntries[key].numUpdates + 1, increments: 0};
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
      const {calibration, key} = action.payload;

      const newGeneralEntries =  Object.assign({}, state.generalEntries);
      const newIndividualEntries =  Object.assign({}, state.individualEntries);

      delete newGeneralEntries[key];
      newIndividualEntries[key]={calibration, tolerance: selfLearning.individualTolerance, numUpdates: 1, increments: 0};
      return {
        ...state,
        individualEntries: newIndividualEntries,
        generalEntries: newGeneralEntries,
      }
    }
    case SL_INDIVIDUAL_DOWNGRADE:{
      const key = action.payload;

      const newIndividualEntries =  Object.assign({}, state.individualEntries);

      delete newIndividualEntries[key];
      return {
        ...state,
        individualEntries: newIndividualEntries,
      }
    }
    case SL_INDIVIDUAL_LOAD:{
      const {individualEntries, generalEntries} = action.payload;
      return {
        ...state,
        individualEntries,
        generalEntries,
      }
    }
    case SL_INDIVIDUAL_INCREMENT:{
      const newIndividualEntries = {};
      for (let key in state.individualEntries){
        const entry = state.individualEntries[key];
        if (entry.numUpdates)
          newIndividualEntries[key] = {...entry, numUpdates: 0}
        else
          newIndividualEntries[key] =  {...entry, tolerance: entry.tolerance+selfLearning.individualToleranceIncrement, increments: entry.increments+1}
      }

      return {
        ...state,
        individualEntries: newIndividualEntries
      }
    }
    default:
      return state;
  }
}

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

