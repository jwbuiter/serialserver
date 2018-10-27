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

        const historyLength = serial.coms[index].entries;
        newHistories[index] = newHistories[index].slice(-historyLength);
      }
      
      const newComs = Array.from(state.coms);
      newComs[index].entry = entry;
      newComs[index].time = new Date();
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
      if (typeof(action.payload) !== 'undefined'){
        const index = action.payload;

        const newHistories = Array.from(state.histories);
        if (state.coms[index].entry){
          newHistories[index].push({
            entry: state.coms[index].entry,
            time: state.coms[index].time,
          });

          const historyLength = serial.coms[index].entries;
          newHistories[index] = newHistories[index].slice(-historyLength);
        }

        const newComs = Array.from(state.coms);
        newComs[index] = {
          time: null,
          entry: '',
          average: '',
        };
        return {
          ...state,
          coms: newComs,
          histories: newHistories,
        }
      } else {
        const newHistories = Array.from(state.histories).map((history, index) => {
          if (state.coms[index].entry){
            history.push({
              entry: state.coms[index].entry,
              time: state.coms[index].time,
            });

            const historyLength = serial.coms[index].entries;
            history = history.slice(-historyLength);
          }
          return history;
        });
        return {
          ...state,
          coms: Array.from({length: serial.coms.length}, u => ({
            entry: '',
            average: '',
          })),
          histories: newHistories,
        }
      }
    }
    default:
      return state;
  }
};