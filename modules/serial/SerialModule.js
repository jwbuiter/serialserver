const Com = require('./Com.js');

class SerialModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};

    this.coms = config.coms.map(com => new Com(com, store))
  }
}

module.exports = SerialModule;