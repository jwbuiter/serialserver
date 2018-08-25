const Gpio = require('onoff').Gpio;

const {
  INPUT_STATE_CHANGED,
  INPUT_BLOCKING_CHANGED,
  INPUT_FOLLOWING_CHANGED,
  HANDLE_ALL,
  HANDLE_INPUT,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  EXECUTE_START,
  EXECUTE_STOP,
} = require('../../actions/types.js');
const parser = require('../parser/parser');

class Input {
  constructor(index, config, store){
    this.index = index;
    this.store = store;
    this = {...this, config};
    this.GPIO = new Gpio(config.GPIO, 'in', 'both');
    this.debounce = setTimeout(()=> 0 ,1);

    this.GPIO.watch((err, val)=>{
      const free = !this.store.input.forced[this.index];
      free = free && !this.store.input.following[this.index];

      if (free){
        setTimeout(()=>{
          setStateDebounce(this.GPIO.readSync());
        },10);
      }
    });

    this.store.subscribe(()=>{
      const lastAction = this.store.getState().lastAction;
      switch (lastAction.type){
      case OUTPUT_STATE_CHANGED:
        const {index, state} = lastAction.payload;
        const forced = this.store.input.forced[this.index];
        if (index === this.follow && !forced){

        }
        
        break;
      }
    });
  }
  
  setStateDebounce(state){
    clearTimeout(this.debounce);

    this.debounce = setTimeout(()=>{
      dispatchState(state);

      switch(this.formula){
      case 'exe':
        const blocked = this.store.input.blocking.reduce((acc, cur) => acc || cur);
        const stillExecuting = this.store.output.executing.reduce((acc, cur) => acc || cur);

        if (state && !(blocked) && !(stillExecuting)){
          this.store.dispatch({type: EXECUTE_START});
        } else if (! && executing){
          this.store.dispatch({type: EXECUTE_STOP});
          this.store.dispatch({type: SERIAL_RESET});
          this.store.dispatch({type: TABLE_RESET});
        }
        break;
      case 'exebl':
        this.store.dispatch({
          type: INPUT_BLOCKING_CHANGED,
          payload: {
            index: this.index,
            blocking: state,
          }
        });
        break;
      }
      this.store.dispatch({type : HANDLE_TABLE});
      this.store.dispatch({type : HANDLE_OUTPUT});
    }, this.timeout);
  }

  dispatchState(state){
    this.store.dispatch({
      type : INPUT_STATE_CHANGED,
      payload : {
        entry : state,
        index : this.index,
      }
    });
  }
}

module.exports = Input;