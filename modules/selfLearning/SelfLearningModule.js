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
  if (enabled === 'off')
    return {};

  const comIndex = Number(enabled[3]);
  const individual = enabled.endsWith('ind');

  if (individual){
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

        if (individual){
          const key = state.serial.coms[1-comIndex].entry;

          let extra = '';

          if (config.tableExtraColumn !== -1){
            extra = state.table.foundRow[config.tableExtraColumn];
          }

          store.dispatch({
            type: SL_ENTRY, 
            payload: {entry: newEntry, key, extra},
          });
        } else {
          store.dispatch({
            type: SL_ENTRY, 
            payload: {entry: newEntry},
          });
        }
      }
    }
  });

  return {};
}

module.exports = SelfLearningModule;