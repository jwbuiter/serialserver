const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
  SERIAL_TIMEOUT,
} = require('../actions/types');

const {serial} = require('../configs/current');

const initialState = {
  histories: Array.from({length: serial.coms.length}, u => ([])),
  coms: Array.from({length: serial.coms.length}, u => ({
    time: null,
    entry: '',
    average: '',
  })),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case SERIAL_ENTRY:{
      const {index, entry} = action.payload;
      
      const newHistories = Array.from(state.histories);
      if (state.coms[index].entry){
        newHistories[index].push({
          entry: state.coms[index].entry,
          time: state.coms[index].time,
        });
      }
      
      const newComs = Array.from(state.coms);
      newComs[index].entry = entry;
      
      return {
        ...state,
        coms: newComs,
        histories: newHistories,
      }
    }
    case SERIAL_AVERAGE:{
      const {index, average} = action.payload;
      const newComs = Array.from(state.coms);
      newComs[index].average = average;
      return {
        ...state,
        coms: newComs,
      }
    }
    case SERIAL_RESET:{
      if (action.payload){
        const index = action.payload;

        const newHistories = Array.from(state.histories);
        if (state.coms[index].entry){
          newHistories[index].push({
            entry: state.coms[index].entry,
            time: state.coms[index].time,
          });
        }

        const newComs = Array.from(state.coms);
        newComs[index] = initialState[index];

        return {
          ...state,
          coms: newComs,
          histories: newHistories,
        }
      } else {
        const newHistories = Array.from(state.histories).map((history, index) => {
          if (state.coms[index].entry){
            history[index].push({
              entry: state.coms[index].entry,
              time: state.coms[index].time,
            });
          }
          return history;
        });

        return {
          ...state,
          coms: initialState.coms,
          histories: newHistories,
        }
      }
    }
    default:
      return state;
  }
};