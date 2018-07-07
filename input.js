const Gpio = require('onoff').Gpio;

class input {

  constructor(config){
    this.name = config.name;
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

  setState(newState){
    clearTimeout(this.timeout);

    this.timeout = setTimeout(()=>{
      this.debouncedState = newState;
      //handleInput(index, value);
      //handleTable();
      //handleOutput();
    }, this.timeoutLenght);
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
      this.setState(this.forced-1);
    }
    else if (previousForced-1 != (this.GPIO.readSync() | this.following)) {
      this.setState((this.GPIO.readSync() | this.following));
    }

    //handleTable();
    //handleOutput();
    //emitState('input', index);
  }

}

module.exports = input;