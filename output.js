const Gpio = require('onoff').Gpio;

class output {

  constructor(config, followers){
    this.name = config.name;
    this.GPIO = new Gpio(element.GPIO, 'out')
    this.execute = config.execute;
    this.seconds = config.seconds;
    this.followers = followers;

    this.forced = 0;
    this.forcedLast = false;
    this.executing = 0;

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
    return (this.GPIO.readSync());
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

module.exports = output;