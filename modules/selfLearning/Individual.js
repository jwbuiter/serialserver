const {
  SL_ENTRY_INDIVIDUAL,
  SL_RESET,
  SL_SUCCESS_INDIVIDUAL,
  EXECUTE_START,
  LOG_RESET,
  LOG_SAVE,
  CONFIG_UPDATE,
} = require('../../actions/types');


function selfLearningIndividual(config, store){
  const {enabled, number} = config;
  const tolerance = config.tolerance/100;
  const toleranceIndiv = config.toleranceIndiv/100;
  const toleranceIndiv = config.toleranceIndiv/100;

  const comIndex = Number(enabled[3]);
  console.log('Individual SL enabled on com'+comIndex);

  store.listen(lastAction =>{
    const state = store.getState();

    switch (lastAction.type){
      case SL_ENTRY_INDIVIDUAL:{
        const {key} = lastAction.payload;

        if (key in state.selfLearningIndividual.generalEntries){
          const entries = state.selfLearningIndividual.generalEntries[key];

          if (entries.length > 3){
          }

        } else if (Object.keys(state.selfLearningIndividual.individualEntries).length >= number ){

          const values = Object.entries(state.selfLearningIndividual.individualEntries).map(entry=> entry.value);

          const min = Math.min(...values);
          const max = Math.max(...values);

          store.dispatch({type: SL_SUCCESS_INDIVIDUAL, payload: {value: (max+min)/2}})
        }

        const entries = state.selfLearning.entries;
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
        const newEntry = Number(state.serial.coms[comIndex].entry);
        if (isNaN(newEntry) || !isFinite(newEntry)){
          console.log('Received self learning entry which is not a number, ignoring');
          break;
        }

        store.dispatch({
          type: SL_ENTRY_INDIVIDUAL, 
          payload: {entry: newEntry, key: state.serial.coms[1-comIndex].entry},
        });
      }
    }
  });

}

module.exports = selfLearningIndividual;