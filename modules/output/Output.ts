import { Gpio } from "onoff";

import Parser from "../parser/Parser";
import { StoreType } from "../../store";

const constants = require("../../../config.static");

function Output(index: number, config, store: StoreType) {
  const { execute, seconds, formula, hardwareOutput } = config;

  const myGPIO = ~hardwareOutput
    ? new Gpio(constants.outputPin[hardwareOutput], "out")
    : null;
  const myParser = Parser(store);

  let stateJSON = "";
  let state = false;

  if (myGPIO) {
    myGPIO.watch((err, val) => {
      state = myGPIO.readSync() ? true : false;
    });
  }

  store.listen(lastAction => {
    switch (lastAction.type) {
      case "OUTPUT_EXECUTING_CHANGED":
      case "OUTPUT_RESULT_CHANGED":
      case "OUTPUT_FORCED_CHANGED": {
        if (index === lastAction.payload.index) {
          const newState = store.getState().output.ports[index];
          const newStateJSON = JSON.stringify(newState);
          if (state !== newState.state) {
            if (myGPIO) myGPIO.writeSync(newState.state ? 1 : 0);

            state = newState.state;
            store.dispatch({
              type: "STATE_CHANGED"
            });
          }
          if (newStateJSON !== stateJSON) {
            stateJSON = newStateJSON;
            store.dispatch({
              type: "OUTPUT_EMIT",
              payload: index
            });
          }
        }
        break;
      }
      case "STATE_CHANGED":
      case "HANDLE_OUTPUT": {
        const result = myParser.parse(formula) ? true : false;

        store.dispatch({
          type: "OUTPUT_RESULT_CHANGED",
          payload: {
            index,
            result
          }
        });
        break;
      }
      case "EXECUTE_START": {
        if (execute && store.getState().output.ports[index].result) {
          store.dispatch({
            type: "OUTPUT_EXECUTING_CHANGED",
            payload: {
              index,
              executing: true
            }
          });
          if (seconds) {
            setTimeout(() => {
              store.dispatch({
                type: "OUTPUT_EXECUTING_CHANGED",
                payload: {
                  index,
                  executing: false
                }
              });
            }, seconds * 1000);
          }
        }
        break;
      }
      case "EXECUTE_STOP": {
        if (execute && !seconds) {
          store.dispatch({
            type: "OUTPUT_EXECUTING_CHANGED",
            payload: {
              index,
              executing: false
            }
          });
        }
        break;
      }
    }
  });

  store.dispatch({
    type: "OUTPUT_RESULT_CHANGED",
    payload: {
      index,
      result: myParser.parse(formula)
    }
  });
}

export default Output;
