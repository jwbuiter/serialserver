const {
  SL_ENTRY,
  SL_RESET,
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

  if (enabled.endsWith('indiv')){
    Individual(config,store);
  } else {
    Global(config,store);
  }

  store.listen(lastAction =>{
    switch (lastAction.type){
      case LOG_RESET:{
        store.dispatch({type: SL_RESET});
      }
    }
  });

  store.dispatch({ type: SL_RESET});
  return {};
}

module.exports = SelfLearningModule;