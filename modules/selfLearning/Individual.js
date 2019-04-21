const fs = require('fs');

const {
  STATE_CHANGED,
  SL_RESET_INDIVIDUAL,
  SL_START_INDIVIDUAL,
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


function selfLearningIndividual(config, store) {
  const {
    enabled,
    totalNumber,
    numberPercentage,
    startCalibration,
    individualToleranceAbs,
    individualCorrectionLimit,
    excelIndividualColumn,
    excelDateColumn
  } = config;
  const number = Math.round(totalNumber * numberPercentage / 100);
  const tolerance = config.tolerance / 100;
  const individualTolerance = config.individualTolerance / 100;
  const individualCorrectionIncrement = config.individualCorrectionIncrement / 100;

  const comIndex = Number(enabled[3]);
  console.log('Individual SL enabled on com' + comIndex);

  function saveIndividualSelfLearning() {
    store.dispatch({
      type: STATE_CHANGED
    })
    const individualSL = store.getState().selfLearning.individual;

    const individualData = {
      generalEntries: individualSL.generalEntries,
      individualEntries: individualSL.individualEntries
    }

    fs.writeFile(__dirname + '/../../selfLearning/individualData.json', JSON.stringify(individualData), 'utf8', (err) => {
      if (err) {
        console.log(err);
      }
    });
  }

  function checkSuccess() {
    individualSL = store.getState().selfLearning.individual;

    if (Object.keys(individualSL.individualEntries).length >= number) {

      const values = Object.values(individualSL.individualEntries).map(entry => entry.calibration);

      const min = Math.min(...values);
      const max = Math.max(...values);

      const calibration = (max + min) / 2;

      store.dispatch({
        type: SL_SUCCESS,
        payload: {
          success: 1,
          calibration,
          comIndex,
          tolerance,
        }
      });

      config.startCalibration = calibration;
      store.dispatch({
        type: CONFIG_UPDATE,
        payload: {
          selfLearning: config,
        }
      });
    }
  }

  store.listen(lastAction => {
    let individualSL = store.getState().selfLearning.individual;

    switch (lastAction.type) {
      case LOG_RESET:
        {
          store.dispatch({
            type: SL_INDIVIDUAL_INCREMENT
          });
          saveIndividualSelfLearning();
          break;
        }
      case SL_ENTRY:
        {
          const {
            key
          } = lastAction.payload;

          if (key in individualSL.generalEntries) {
            const {
              entries
            } = individualSL.generalEntries[key];

            if (store.getState().selfLearning.teaching) {
              store.dispatch({
                type: SL_INDIVIDUAL_UPGRADE,
                payload: {
                  key,
                  calibration: entries[0]
                }
              });
            } else if (entries.length >= 3) {

              const matches = entries.map(entry => ({
                value: entry,
                matches: entries.reduce((total, compEntry) => {
                  const entryTolerance = entry * individualTolerance + individualToleranceAbs;

                  if ((compEntry > entry - entryTolerance) && (compEntry < entry + entryTolerance))
                    return total + 1;
                  return total;
                }, 0),
              }));

              const successfullMatches = matches.filter(elem => (elem.matches >= 3));
              if (successfullMatches.length) {
                const matchedEntries = entries.filter(entry =>
                  successfullMatches.reduce((acc, cur) => {
                    if ((entry > cur.value * (1 - individualTolerance)) && (entry < cur.value * (1 + individualTolerance)))
                      return true;
                    return acc;
                  }, false)
                );

                const calibration = matchedEntries.reduce((acc, cur) => acc + cur) / matchedEntries.length;

                store.dispatch({
                  type: SL_INDIVIDUAL_UPGRADE,
                  payload: {
                    key,
                    calibration
                  }
                });
              }
            }
          }

          checkSuccess();
          saveIndividualSelfLearning();
          break;
        }
      case SL_INDIVIDUAL_DELETE_INDIVIDUAL:
        {
          if (Object.entries(store.getState().selfLearning.individual.individualEntries).length < number) {
            store.dispatch({
              type: SL_SUCCESS,
              payload: {
                success: 0,
                calibration: startCalibration,
                comIndex,
                tolerance,
              }
            });
          } else {
            checkSuccess();
          }
          saveIndividualSelfLearning();
          break;
        }
      case SL_INDIVIDUAL_DELETE_GENERAL:
        {
          saveIndividualSelfLearning();
          break;
        }
      case SL_INDIVIDUAL_INCREMENT:
        {
          Object.entries(individualSL.individualEntries).forEach(([key, entry]) => {

            if (entry.increments >= individualCorrectionLimit) {
              store.dispatch({
                type: SL_INDIVIDUAL_DOWNGRADE,
                payload: key
              })
            }
          });
          saveIndividualSelfLearning();
          break;
        }
      case SL_RESET_INDIVIDUAL:
        {
          saveIndividualSelfLearning();
          break;
        }
    }
  });

  if (fs.existsSync(__dirname + '/../../selfLearning/individualData.json')) {
    try {
      const individualData = require('../../selfLearning/individualData');
      store.dispatch({
        type: SL_INDIVIDUAL_LOAD,
        payload: individualData
      });
      checkSuccess();
    } catch (err) {
      console.log(err)
    }
  }

  store.dispatch({
    type: SL_START_INDIVIDUAL
  });
}

module.exports = selfLearningIndividual;