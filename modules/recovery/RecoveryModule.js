const  {ERROR_OCCURRED} = require('../../actions/types');

class RecoveryModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};

    this.store.subscribe(()=>{
      const lastAction = this.store.getState().lastAction;
      switch (lastAction.type){
        case ERROR_OCCURRED:
          setTimeout(()=>{
            process.exit();
          }, 5000);
          break;
      }
    });
  }
}

module.exports = RecoveryModule;