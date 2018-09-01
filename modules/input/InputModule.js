const Input = require('./Input');


class InputModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);
    this.ports = config.ports.map((input, index) => new Input(index, input, store));
  }
}


module.exports = InputModule;