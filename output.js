const Gpio = require('onoff').Gpio;

class Output {

  constructor(config, store){
    this.store = store;

    this.name = config.name;
    this.formula = config.formula;
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

  handle(){
    if (this.forced)
      return;
    
    let result = parser.calculateFormula(this.formula);
    if (this.execute){
      result = this.GPIO.readSync()?'on':result?'execute':'off';
    } 
    else if (this.seconds) {
      if (!(this.GPIO.readSync()) && result){
        this.setState(1);
        setTimeout(() => {
          this.setState(0);
          //emitState('output', index);
        }, this.seconds*1000);
        result = 'on';
      }
      else {
        result = this.GPIO.readSync()?'on':'off';
      }
    }
    else{
      this.setState(result?1:0);
      result = result?'on':'off';
    }
    //io.emit('state', {name: 'output' + index, state: result});
  
  }

  setState(newState){
    this.GPIO.writeSync(newState);
    followers.forEach((follower)=>{
      if (follower.isForced())
        return;

      if (inputFollowing[inputIndex] == value^element.invert)
        return;

      inputFollowing[inputIndex] = value^element.invert;
      console.log('input'+inputIndex +':' + (element.invert ^ value))

      if (inputDebouncedState[inputIndex] != value ^ element.invert){
        handleInputDebounce(inputIndex, element.invert ^ value);
      }

    });
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

module.exports = Output;