const {
  SL_ENTRY,
  SL_SUCCESS,
  EXECUTE_START,
  LOG_SAVE,
  CONFIG_UPDATE,
} = require('../../actions/types');


function selfLearningGlobal(config, store){
  const {enabled, number} = config;
  const tolerance = config.tolerance/100;


  const comIndex = Number(enabled[3]);
  console.log('Global SL enabled on com'+comIndex);

  store.listen(lastAction =>{
    switch (lastAction.type){
      case SL_ENTRY:{
        const entries = store.getState().selfLearning.entries;
        if (entries.length<number) break;

        const matches = entries.map( entry => ({
          value: entry,
          matches: entries.reduce((total, compEntry) => {
            if ((compEntry > entry * (1 - tolerance)) && (compEntry < entry * (1 + tolerance)))
              return total + 1;
            return total;
          }, 0),
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
          const maxMatched = matchedEntries.reduce((acc, cur) => Math.max(acc, cur))
          const minMatched = matchedEntries.reduce((acc, cur) => Math.min(acc, cur))

          const calibration = (minMatched + maxMatched)/2;
          const matchedTolerance = (maxMatched - calibration)/calibration;

          const success = successfullMatches.length>number?2:1;
          store.dispatch({
            type: SL_SUCCESS,
            payload: {
              success,
              calibration,
              matchedTolerance,
              comIndex,
              tolerance,
            }
          });
          store.dispatch({type: LOG_SAVE });
          config.success = success;
          config.startCalibration = calibration;
          store.dispatch({
            type: CONFIG_UPDATE,
            payload: {
              selfLearning: config,
            }
          })
        }
        break;
      }
      case EXECUTE_START:{
        if (store.getState().selfLearning.success) break;

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

}

module.exports = selfLearningGlobal;