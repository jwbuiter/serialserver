import fs from "fs";

import Parser from "../parser/Parser";
import { StoreType } from "../../store";

function selfLearningIndividual(config, store: StoreType) {
  const {
    enabled,
    numberPercentage,
    startCalibration,
    individualToleranceAbs,
    individualCorrectionLimit,
    activityCounter,
    firstTopFormula,
    secondTopFormula,
    extraColumns
  } = config;
  let { totalNumber } = config;
  let number = Math.round((totalNumber * numberPercentage) / 100);
  const tolerance = config.tolerance / 100;
  const individualTolerance = config.individualTolerance / 100;

  const headerFormulas = [
    firstTopFormula,
    secondTopFormula,
    ...extraColumns.map(column => column.topFormula)
  ];

  const myParser = Parser(store);

  const comIndex = Number(enabled[3]);
  console.log("Individual SL enabled on com" + comIndex);

  function saveIndividualSelfLearning() {
    store.dispatch({
      type: "STATE_CHANGED"
    });
    const individualSL = store.getState().selfLearning.individual;

    const individualData = {
      generalEntries: individualSL.generalEntries,
      individualEntries: individualSL.individualEntries
    };

    fs.writeFile(
      __dirname + "/../../selfLearning/individualData.json",
      JSON.stringify(individualData),
      "utf8",
      err => {
        if (err) {
          console.log(err);
        }
      }
    );
  }

  function checkSuccess() {
    let individualSL = store.getState().selfLearning.individual;

    if (Object.keys(individualSL.individualEntries).length >= number) {
      const values = Object.values(individualSL.individualEntries).map(
        entry => entry.calibration
      );

      const min = Math.min(...values);
      const max = Math.max(...values);

      const calibration = (max + min) / 2;

      store.dispatch({
        type: "SL_SUCCESS",
        payload: {
          success: 1,
          calibration,
          comIndex,
          tolerance,
          filterLog: false
        }
      });

      config.startCalibration = calibration;
      store.dispatch({
        type: "CONFIG_UPDATE",
        payload: {
          selfLearning: config
        }
      });
    }
  }

  store.listen(lastAction => {
    let individualSL = store.getState().selfLearning.individual;

    switch (lastAction.type) {
      case "LOG_RESET": {
        store.dispatch({
          type: "SL_INDIVIDUAL_INCREMENT"
        });
        saveIndividualSelfLearning();
        break;
      }
      case "SL_ENTRY": {
        const { key, entry } = lastAction.payload;

        if (store.getState().selfLearning.teaching) {
          store.dispatch({
            type: "SL_INDIVIDUAL_UPGRADE",
            payload: {
              key,
              calibration: entry
            }
          });
        } else if (key in individualSL.generalEntries) {
          const { entries } = individualSL.generalEntries[key];

          if (entries.length >= 3) {
            const matches = entries.map(entry => ({
              value: entry,
              matches: entries.reduce((total, compEntry) => {
                const entryTolerance =
                  entry * individualTolerance + individualToleranceAbs;

                if (
                  compEntry > entry - entryTolerance &&
                  compEntry < entry + entryTolerance
                )
                  return total + 1;
                return total;
              }, 0)
            }));

            const successfullMatches = matches.filter(
              elem => elem.matches >= 3
            );
            if (successfullMatches.length) {
              const matchedEntries = entries.filter(entry =>
                successfullMatches.reduce((acc, cur) => {
                  if (
                    entry > cur.value * (1 - individualTolerance) &&
                    entry < cur.value * (1 + individualTolerance)
                  )
                    return true;
                  return acc;
                }, false)
              );

              const calibration =
                matchedEntries.reduce((acc, cur) => acc + cur) /
                matchedEntries.length;

              store.dispatch({
                type: "SL_INDIVIDUAL_UPGRADE",
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
      case "SL_INDIVIDUAL_DELETE_INDIVIDUAL": {
        if (
          Object.entries(
            store.getState().selfLearning.individual.individualEntries
          ).length < number
        ) {
          store.dispatch({
            type: "SL_SUCCESS",
            payload: {
              success: 0,
              calibration: startCalibration,
              comIndex,
              tolerance,
              filterLog: false
            }
          });
        } else {
          checkSuccess();
        }
        saveIndividualSelfLearning();
        break;
      }
      case "SL_INDIVIDUAL_DECREMENT_TOTAL": {
        const callback = lastAction.payload;

        totalNumber--;
        number = Math.round((totalNumber * numberPercentage) / 100);
        config.totalNumber = totalNumber;

        callback(totalNumber);
        store.dispatch({
          type: "CONFIG_UPDATE",
          payload: {
            selfLearning: config
          }
        });
        break;
      }
      case "SL_INDIVIDUAL_DELETE_GENERAL":
      case "SL_INDIVIDUAL_INCREMENT":
      case "SL_RESET_INDIVIDUAL": {
        saveIndividualSelfLearning();
        break;
      }
      case "SERIAL_ENTRY": {
        if (!activityCounter) break;
        if (lastAction.payload.index === comIndex) break;
        if (!lastAction.payload.entry) break;

        store.dispatch({
          type: "LOG_MAKE_PARTIAL",
          payload: lastAction.payload
        });
        store.dispatch({
          type: "SL_INDIVIDUAL_ACTIVITY",
          payload: { key: lastAction.payload.entry }
        });
        saveIndividualSelfLearning();
        break;
      }
      case "STATE_CHANGED": {
        const newHeaders = headerFormulas.map(formula =>
          myParser.parse(formula)
        );

        store.dispatch({ type: "SL_INDIVIDUAL_HEADERS", payload: newHeaders });
        break;
      }
    }
  });

  if (fs.existsSync(__dirname + "/../../selfLearning/individualData.json")) {
    try {
      const individualData = require("../../selfLearning/individualData");
      store.dispatch({
        type: "SL_INDIVIDUAL_LOAD",
        payload: individualData
      });
      checkSuccess();
    } catch (err) {
      console.log(err);
    }
  }

  store.dispatch({
    type: "SL_START_INDIVIDUAL"
  });
}

export default selfLearningIndividual;
