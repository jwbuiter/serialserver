const Gpio = require('onoff').Gpio;

const {
  INPUT_PHYSICAL_CHANGED,
  INPUT_BLOCKING_CHANGED,
  INPUT_FORCED_CHANGED,
  INPUT_FOLLOWING_CHANGED,
  INPUT_CALCULATE_STATE,
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
  HANDLE_ALL,
  HANDLE_INPUT,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  STATE_CHANGED,
  LOG_MAKE_ENTRY,
  EXECUTE_START,
  EXECUTE_STOP,
  SERIAL_RESET,
  TABLE_RESET,
} = require('../../actions/types');
const parser = require('../parser/Parser');
const constants = require('../../config.static');

function Input(index, config, store) {
  const {formula, timeout, follow, invert} = config;
  const myGPIO = new Gpio(constants.inputPin[index], 'in', 'both');
  let debounce = setTimeout(()=> 0 ,1);
  let state = false;

  function handleInput(state){
    switch(formula){
      case 'exe':{
        const reduxState = store.getState();
        const blocked = reduxState.input.ports.reduce((acc, cur) => acc || cur.blocking, false);
        const stillExecuting = reduxState.output.ports.reduce((acc, cur) => acc || cur.executing, false);
        if (state && !(blocked) && !(stillExecuting)){
          store.dispatch({type: LOG_MAKE_ENTRY});
          store.dispatch({type: EXECUTE_START});
        } else if (!state && reduxState.input.executing){
          store.dispatch({type: EXECUTE_STOP});
          store.dispatch({type: SERIAL_RESET});
          store.dispatch({type: TABLE_RESET});
        }
        break;
      }
      case 'exebl':{
        store.dispatch({
          type: INPUT_BLOCKING_CHANGED,
          payload: {
            index,
            blocking: state,
          }
        });
        break;
      }
    }
  }

  function dispatchPhysical(state){
    store.dispatch({
      type : INPUT_PHYSICAL_CHANGED,
      payload : {
        physical : state,
        index,
      }
    });
  }


  myGPIO.watch((err, val)=>{
    setTimeout(()=>{
      dispatchPhysical(myGPIO.readSync()?true:false);
    },10);
  });

  store.listen((lastAction)=>{
    switch (lastAction.type){
      case INPUT_FORCED_CHANGED:{
        store.dispatch({type: INPUT_CALCULATE_STATE, payload: {index}});
        break;
      }
      case INPUT_FOLLOWING_CHANGED:
      case INPUT_PHYSICAL_CHANGED:{
        if (index === lastAction.payload.index){
          if (timeout){
            clearTimeout(debounce);
            debounce = setTimeout(()=>{
              store.dispatch({type: INPUT_CALCULATE_STATE, payload: {index}});
            }, timeout);
          } else {
            store.dispatch({type: INPUT_CALCULATE_STATE, payload: {index}});
          }
        }
        break;
      }
      case INPUT_CALCULATE_STATE:{
        const newState = store.getState().input.ports[index].state;
        if (state !== newState){
          state = newState;
          store.dispatch({type: STATE_CHANGED});
          handleInput(newState);
        }
        break;
      }
      case OUTPUT_RESULT_CHANGED:
      case OUTPUT_FORCED_CHANGED:
      case OUTPUT_EXECUTING_CHANGED:{
        if (follow === lastAction.payload.index){
          const outputState = store.getState().output.ports[follow].state;
          const isFollowing = outputState^invert;
          store.dispatch({
            type: INPUT_FOLLOWING_CHANGED,
            payload: {
              index,
              isFollowing: isFollowing?true:false,
            },
          });
        }
        break;
      }
    }
  });

  return {};
}

module.exports = Input;