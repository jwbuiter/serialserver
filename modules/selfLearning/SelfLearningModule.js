const {
  SL_START,
  SL_ENTRY,
  SL_RESET,
  SL_SUCCESS,
  EXECUTE_START,
  LOG_RESET,
} = require('../../actions/types');

function SelfLearningModule(config, store) {
  const {enabled, number, reset, resetValue} = config;
  const tolerance = config.tolerance/100;

  if (enabled === 'off')
    return {};

  const comIndex = Number(enabled[3]);

  store.listen(lastAction =>{
    switch (lastAction){
      case LOG_RESET:{
        store.dispatch({type: SL_RESET});
      }
      case SL_ENTRY:{
        const entries = store.getState().selfLearning.entries;
        if (entries.length<number) break;

        const matches = entries.map( entry => ({
          value: entry,
          matches: entries.reduce((total, compEntry) => {
            if ((compEntry > entry * (1 - tolerance)) && (compEntry < entry * (1 + tolerance)))
              return total + 1;
            return total;
          }),
        }));

        const successfullMatches = matches.filter(elem => (elem.matches >= number));

        if (successfullMatches.length){
          const matchedEntries = entries.filter( entry => 
            successfullMatches.reduce((acc, cur) => {
              if ((entry > cur.value * (1 - tolerance)) && (entry < cur.value * (1 + tolerance)))
                return true;
              return acc;
            }, false)
          );

          const calibration = matchedEntries.reduce((sum, entry) => sum + entry.value, 0)/matchedEntries.length;
          store.dispatch({
            type: SL_SUCCESS,
            success: successfullMatches.length,
            calibration,
            tolerance,
            comIndex,
          });
        }
        break;
      }
      case EXECUTE_START:{
        const newEntry = Number(store.getState().serial.coms[comIndex].entry);
        if (isNaN(newEntry) || !isFinite(newEntry)){
          console.log('Received self learning entry which is not a number, ignoring');
          break;
        }

        store.dispatch({
          type: SL_ENTRY,
          payload: newEntry,
        });
      }

    }
  });

  store.dispatch({ type: SL_START});
  return {};
}

module.exports = SelfLearningModule;