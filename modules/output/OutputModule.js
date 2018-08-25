class OutputModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};
  }
}

module.exports = OutputModule;