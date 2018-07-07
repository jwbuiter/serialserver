const Gpio = require('onoff').Gpio;

class Input {

  constructor(config, parser){
    this.parser = parser;

    this.name = config.name;
    this.formula = config.formula;
    this.GPIO = new Gpio(config.GPIO, 'in', 'both');
    this.follow = config.follow;
    this.timeoutLenght = config.timeout;
    this.invert = config.invert;

    this.forced = 0;
    this.forcedLast = false;
    this.following = 0;
    this.timeout = setTimeout(()=>{},1);
    this.debouncedState = 0;

    this.GPIO.watch((err, val)=>{
      if (!this.forced && !this.following){
        setTimeout(()=>{
          this.setState(this.GPIO.readSync());
        },10);
      }
    });
  }

  setStateDebounce(newState){
    clearTimeout(this.timeout);

    this.timeout = setTimeout(()=>{
      this.debouncedState = newState;
      setState(newState);
      //handleTable();
      //handleOutput();
    }, this.timeoutLenght);
  }

  setState(newState){

    let state;
    if (this.forced){
      state = (newState)?'forcedOn':'forcedOff';
    }
    else{
      state = (newState)?'on':'off';
    }

    //io.emit('state', {name: 'input' + index, state});

    switch(this.formula){
      case 'exe':
        if (value === 1 && !executeBlock){
          execute();
          executing = true;
        } else if (value === 0 && executing){
          executing = false;
          io.emit('clear');
          latestLogEntry = new Array(config.serial.length).fill('0');
          tableContent = new Array(config.output.length ).fill('');
          executeStop();
        }
        break;
      case 'exebl':
        executeBlock = (value === 1);
        console.log({executeBlock});
        break;
    }
  }

  getState(){
    return(this.debouncedState | this.following);
  }

  getStateString(){
    if (this.forced){
      return (this.forced-1)?'forcedOn':'forcedOff';
    }
    else{
      return (this.debouncedState | this.following)?'on':'off';
    }
  }

  cycleForced(){
    let previousForced = this.forced;

    if (this.forced){
      if (this.forcedLast){
        this.forcedLast = false;
        this.forced = 0;
      }
      else {
        this.forcedLast = true;
        this.forced = 3 - this.forced;
      }
    }
    else {
      this.force = 2 - (this.debouncedState | this.following);
    }

    if (this.forced){
      this.setStateDebounce(this.forced-1);
    }
    else if (previousForced-1 != (this.GPIO.readSync() | this.following)) {
      this.setStateDebounce((this.GPIO.readSync() | this.following));
    }

    //handleTable();
    //handleOutput();
    //emitState('input', index);
  }

}

module.exports = Input;