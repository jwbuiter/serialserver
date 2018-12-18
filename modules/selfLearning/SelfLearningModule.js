const {
  SL_ENTRY,
  SL_SUCCESS,
  EXECUTE_START,
  LOG_RESET,
  LOG_SAVE,
  CONFIG_UPDATE,
} = require('../../actions/types');

const Global = require('./Global');
const Individual = require('./Individual');

function SelfLearningModule(config, store) {
  const {enabled} = config;
  const comIndex = Number(enabled[3]);

  if (enabled === 'off')
    return {};

  if (enabled.endsWith('ind')){
    Individual(config,store);
  } else {
    Global(config,store);
  }

  store.listen(lastAction =>{
    const state = store.getState();

    switch (lastAction.type){
      case EXECUTE_START:{
        const newEntry = Number(state.serial.coms[comIndex].entry);
        if (isNaN(newEntry) || !isFinite(newEntry)){
          console.log('Received self learning entry which is not a number, ignoring');
          break;
        }

        store.dispatch({
          type: SL_ENTRY, 
          payload: {entry: newEntry, key: state.serial.coms[1-comIndex].entry},
        });
      }
    }
  });

  return {};
}

module.exports = SelfLearningModule;