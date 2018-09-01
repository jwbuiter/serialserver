class TableModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);
  }
}

module.exports = TableModule;