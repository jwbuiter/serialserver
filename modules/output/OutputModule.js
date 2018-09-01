const Output = require('./Output');


class OutputModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);
    this.ports = config.ports.map((output, index) => new Output(index, output, store));
  }
}


module.exports = OutputModule;