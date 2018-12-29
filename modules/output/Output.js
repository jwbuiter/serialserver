const Gpio = require('onoff').Gpio;

const {
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
  OUTPUT_EMIT,
  STATE_CHANGED,
  HANDLE_INPUT,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  EXECUTE_START,
  EXECUTE_STOP,
} = require('../../actions/types');
const Parser = require('../parser/Parser');
const constants = require('../../config.static');

function Output(index, config, store) {
  const {execute, seconds, formula} = config;

  const myGPIO = new Gpio(constants.outputPin[index], 'out');
  const myParser = new Parser(store);

  let stateJSON = '';

  store.listen((lastAction)=>{  
    switch (lastAction.type){
      case OUTPUT_EXECUTING_CHANGED:
      case OUTPUT_RESULT_CHANGED:
      case OUTPUT_FORCED_CHANGED:{
        if (index === lastAction.payload.index){
          const newState = store.getState().output.ports[index].state;
          const newStateJSON = JSON.stringify()
          if (newStateJSON !== stateJSON){
            myGPIO.writeSync(newState.state?1:0);
            stateJSON = newStateJSON;
            store.dispatch({type: STATE_CHANGED});
            store.dispatch({type: OUTPUT_EMIT, payload: index})
          }
        }
        break;
      }
      case STATE_CHANGED:
      case HANDLE_OUTPUT:{
        const result = myParser.parse(formula)?true:false;
        store.dispatch({
          type: OUTPUT_RESULT_CHANGED,
          payload: {
            index, 
            result,
          },
        });
        break;
      }
      case EXECUTE_START:{
        if (execute && store.getState().output.ports[index].result){
          store.dispatch({
            type: OUTPUT_EXECUTING_CHANGED,
            payload: {
              index,
              executing: true
            }
          });
          if (seconds){
            setTimeout(() => {
              store.dispatch({
                type: OUTPUT_EXECUTING_CHANGED,
                payload: {
                  index,
                  executing: false
                }
              });
            }, seconds*1000);
          }
        }
        break;  
      }
      case EXECUTE_STOP:{
        if (execute && !seconds){
          store.dispatch({
            type: OUTPUT_EXECUTING_CHANGED,
            payload: {
              index,
              executing: false
            }
          });
        }
        break;
      }
    }
  });

  store.dispatch({
    type: OUTPUT_RESULT_CHANGED,
    payload: {
      index, 
      result: myParser.parse(formula)
    },
  });
}

module.exports = Output;