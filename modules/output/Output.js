const Gpio = require('onoff').Gpio;

const {
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
  HANDLE_INPUT,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  EXECUTE_START,
  EXECUTE_STOP,
} = require('../../actions/types');
const Parser = require('../parser/Parser');
const constants = require('../../config.static');

class Output {
  constructor(index, config, store){
    this.index = index;
    this.store = store;
    Object.assign(this, config);

    this.GPIO = new Gpio(constants.outputPin[index], 'out');
    this.parser = new Parser(store);

    this.store.subscribe(()=>{
      const lastAction = this.store.getState().lastAction;
      switch (lastAction.type){
        case OUTPUT_EXECUTING_CHANGED:
        case OUTPUT_RESULT_CHANGED:
        case OUTPUT_FORCED_CHANGED:{
          if (this.index === lastAction.payload.index)
            this.GPIO.writeSync(this.store.getState().output.ports[this.index].state);
          break;
        }
        case HANDLE_OUTPUT:{
          const result = this.parser.parse(this.formula);
          if (result){
            this.store.dispatch({
              type: OUTPUT_RESULT_CHANGED,
              payload: {index: this.index, result},
            })
          }
          break;
        }
        case EXECUTE_START:{
          if (this.execute){
            this.store.dispatch({
              type: OUTPUT_EXECUTING_CHANGED,
              payload: {
                execting: true
              }
            });
            if (this.seconds){
              setTimeout(() => {
                this.store.dispatch({
                  type: OUTPUT_EXECUTING_CHANGED,
                  payload: {
                    execting: false
                  }
                });
              }, this.seconds*1000);
            }
          }
          break;  
        }
        case EXECUTE_STOP:{
          if (this.execute && !this.seconds){
            this.store.dispatch({
              type: OUTPUT_EXECUTING_CHANGED,
              payload: {
                execting: false
              }
            });
          }
          break;
        }
      }
    });
  }
}

module.exports = Output;