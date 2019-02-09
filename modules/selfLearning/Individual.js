const fs = require('fs');

const {
  SL_RESET_INDIVIDUAL,
  SL_SUCCESS,
  SL_ENTRY,
  SL_INDIVIDUAL_UPGRADE,
  SL_INDIVIDUAL_DOWNGRADE,
  SL_INDIVIDUAL_INCREMENT,
  SL_INDIVIDUAL_LOAD,
  SL_INDIVIDUAL_DELETE_GENERAL,
  SL_INDIVIDUAL_DELETE_INDIVIDUAL,
  EXECUTE_START,
  LOG_RESET,
  LOG_SAVE,
  CONFIG_UPDATE,
} = require('../../actions/types');


function selfLearningIndividual(config, store){
  const {enabled, number} = config;
  const tolerance = config.tolerance/100;
  const individualTolerance = config.individualTolerance/100;
  const individualToleranceIncrement = config.individualToleranceIncrement/100;
  const individualToleranceLimit = config.individualToleranceLimit/100;

  const comIndex = Number(enabled[3]);
  console.log('Individual SL enabled on com'+comIndex);

  store.listen(lastAction =>{
    let individualSL = store.getState().selfLearning.individual;

    switch (lastAction.type){
      case LOG_RESET:{
        store.dispatch({type: SL_INDIVIDUAL_INCREMENT});
        break;
      }
      case SL_ENTRY:{
        const {key} = lastAction.payload;
      
        if (key in individualSL.generalEntries){
          const entries = individualSL.generalEntries[key];
        
          if (entries.length >= 3){

            const matches = entries.map( entry => ({
              value: entry,
              matches: entries.reduce((total, compEntry) => {
                if ((compEntry > entry * (1 - individualTolerance)) && (compEntry < entry * (1 + individualTolerance)))
                  return total + 1;
                return total;
              }, 0),
            }));

            const successfullMatches = matches.filter(elem => (elem.matches >= 3));
            if (successfullMatches.length){
              const matchedEntries = entries.filter( entry => 
                successfullMatches.reduce((acc, cur) => {
                  if ((entry > cur.value * (1 - individualTolerance)) && (entry < cur.value * (1 + individualTolerance)))
                    return true;
                  return acc;
                }, false)
              );

              const calibration = matchedEntries.reduce((acc, cur) => acc + cur)/matchedEntries.length;
 
              store.dispatch({
                type: SL_INDIVIDUAL_UPGRADE,
                payload: { key, calibration}
              });
            }
          }
        }
         
        individualSL = store.getState().selfLearning.individual;

        if (Object.keys(individualSL.individualEntries).length >= number ){

          const values = Object.values(individualSL.individualEntries).map(entry=> entry.calibration);

          const min = Math.min(...values);
          const max = Math.max(...values);

          store.dispatch({
            type: SL_SUCCESS,
            payload: {
              success: 1,
              calibration: (max+min)/2,
              comIndex,
              tolerance,
            }
          });
        }
      }
      case SL_INDIVIDUAL_DELETE_GENERAL:
      case SL_INDIVIDUAL_DELETE_INDIVIDUAL:{
        const individualSL = store.getState().selfLearning.individual;

        const individualData = {
          generalEntries: individualSL.generalEntries,
          individualEntries: individualSL.individualEntries
        }

        fs.writeFile(__dirname+'/../../selfLearning/individualData.json', JSON.stringify(individualData), 'utf8', (err)=>{
          if (err){
            console.log(err);
          }
        });
        
        break;
      }
      case SL_INDIVIDUAL_INCREMENT:{
        Object.values(individualSL.individualEntries).forEach(entry => {
          if (entry.tolerance >= toleranceLimit){
            store.dispatch({type: SL_INDIVIDUAL_DOWNGRADE, payload: entry.key})
          }
        });

        break;
      }
    }
  });
  store.dispatch({type: SL_RESET_INDIVIDUAL});

  if (fs.existsSync(__dirname+'/../../selfLearning/individualData.json')){
    const individualData = require('../../selfLearning/individualData');
    store.dispatch({type: SL_INDIVIDUAL_LOAD, payload: individualData});
  }
}

module.exports = selfLearningIndividual;