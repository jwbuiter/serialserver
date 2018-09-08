const {
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
} = require('../actions/types');

const {output} = require('../configs/current');

const initialState = {
  ports: Array.from({length: output.ports.length}, u => ({
    state: false,
    result: false,
    isForced: false,
    previousForced: false,
    forcedState: false,
    executing: false,
  })),
};

function calculateState(port, index){
  if (port.isForced)
    return port.forcedState;

  if (output.ports[index].execute)
    if (port.executing)
      return port.result;
    else
      return false;
  
  return port.result;
}

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case OUTPUT_RESULT_CHANGED:{
      const {index, result} = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].result = result?true:false;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts,
      }
    }
    case OUTPUT_FORCED_CHANGED:{
      const {index, isForced, previousForced, forcedState} = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].isForced = isForced;
      newPorts[index].previousForced = previousForced;
      newPorts[index].forcedState = forcedState;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts,
      }
    }
    case OUTPUT_EXECUTING_CHANGED:{
      const {index, executing} = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].executing = executing;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts,
      }
    }
    default:
      return state;
  }
}