const Gpio = require('onoff').Gpio;

class Output {
  constructor(index, config, store){
    this.index = index;
    this.store = store;
    this = {...this, config};
  }
}

module.exports = Output;