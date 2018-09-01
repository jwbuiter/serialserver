const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
} = require('../actions/types');

const {serial} = require('../configs/current');

const initialState = {
  coms: Array(serial.coms.length).fill({
    entry: '0',
    average: '0',
  })
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case SERIAL_ENTRY:{
      const {index, entry} = action.payload;
      const newComs = Object.assign({}, state.coms);
      newComs[index].entry = entry;
      return {
        ...state,
        coms, newComs,
      }
    }
    case SERIAL_AVERAGE:{
      const {index, average} = action.payload;
      const newComs = Object.assign({}, state.coms);
      newComs[index].average = average;
      return {
        ...state,
        coms, newComs,
      }
    }
    case SERIAL_RESET:{
      if (action.payload){
        const index = action.payload;
        const newComs = Object.assign({}, state.coms);
        newComs[index] = initialState[index];
        return {
          ...state,
          coms, newComs,
        }
      } else {
        return initialState;
      }
    }
    default:
      return state;
  }
};