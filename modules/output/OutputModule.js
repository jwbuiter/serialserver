const Output = require('../Output');

/*
class OutputModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};
  }
}
*/

module.exports = (config, store) => config.ports.map((output, index) => new Output(index, output, store));