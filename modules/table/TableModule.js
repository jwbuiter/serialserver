class TableModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};
  }
}

module.exports = TableModule;