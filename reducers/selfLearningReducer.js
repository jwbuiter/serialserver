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
      const {entry, key, extra} = action.payload;

      const newGeneralEntries =  Object.assign({}, state.generalEntries);
      const newIndividualEntries =  Object.assign({}, state.individualEntries);

      if (key in state.individualEntries){
        const tolerance = entry*selfLearning.individualTolerance/100 + selfLearning.individualToleranceAbs;
        newIndividualEntries[key] = {calibration: entry, extra, tolerance, numUpdates: newIndividualEntries[key].numUpdates + 1, increments: 0};
      } else if (key in state.generalEntries) {
        newGeneralEntries[key] = {entries: [entry].concat(Array.from(newGeneralEntries[key].entries)), extra} ;
      } else {
        newGeneralEntries[key] = {entries: [entry], extra};
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

      const tolerance = calibration*selfLearning.individualTolerance/100 + selfLearning.individualToleranceAbs;
      newIndividualEntries[key]={calibration, extra: state.generalEntries[key].extra ,tolerance, numUpdates: 1, increments: 0};
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
        if (entry.numUpdates){
          newIndividualEntries[key] = {...entry, numUpdates: 0}
        }
        else{
          const tolerance = (entry.calibration*selfLearning.individualTolerance/100 + selfLearning.individualToleranceAbs)*Math.pow(1+selfLearning.individualCorrectionIncrement/100, entry.increments + 1);
          newIndividualEntries[key] =  {...entry, tolerance, increments: entry.increments+1};
        }
      }

      return {
        ...state,
        individualEntries: newIndividualEntries
      }
    }
    case SL_INDIVIDUAL_DELETE_GENERAL: {
      if (action.payload){
        const key = action.payload;
      
        const newGeneralEntries =  Object.assign({}, state.generalEntries);
        delete newGeneralEntries[key];

        return {
          ...state,
          generalEntries: newGeneralEntries
        }
      } else {
        return {
          ...state,
          generalEntries: {}
        }
      }
    }
    case SL_INDIVIDUAL_DELETE_INDIVIDUAL: {
      if (action.payload){
        const key = action.payload;
      
        const newIndividualEntries =  Object.assign({}, state.individualEntries);
        delete newIndividualEntries[key];

        return {
          ...state,
          individualEntries: newIndividualEntries
        }
      } else {
        return {
          ...state,
          individualEntries: {}
        }
      }
    }
    case SL_INDIVIDUAL_EXTRA:{
      return {...state}
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

