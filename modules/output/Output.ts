import { Gpio } from "onoff";

import constants from "../../constants";
import Parser from "../parser/Parser";
import { IStore } from "../../store";
import { IOutputConfig } from "../../config";

function Output(index: number, config: IOutputConfig, store: IStore) {
  const { execute, seconds, formula, hardwareOutput, warning, warningPeriod } =
    config;

  const myGPIO = ~hardwareOutput
    ? new Gpio(constants.outputPin[hardwareOutput], "out")
    : null;
  const myParser = Parser(store);

  let stateJSON = "";
  let state = false;
  let result = false;
  let warningInterval: NodeJS.Timeout = null;
  let debounceTimeout: NodeJS.Timeout = null;

  function setState(newState: boolean) {
    state = newState;

    if (warning) {
      clearInterval(warningInterval);
      store.dispatch({
        type: "SET_WARNING",
        payload: false,
      });

      if (newState) {
        let on = true;
        warningInterval = setInterval(() => {
          on = !on;
          store.dispatch({
            type: "SET_WARNING",
            payload: on,
          });
        }, warningPeriod * 1000);
      }
    }
  }

  if (myGPIO) {
    myGPIO.watch((err, val) => {
      setState(myGPIO.readSync() ? true : false);
    });
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case "OUTPUT_RESULT_CHANGED": {
        const newState = store.getState().output.ports[index];

        if (execute) break;

        if (seconds > 0) {
          if (newState.result && !result) {
            store.dispatch({
              type: "OUTPUT_EXECUTING_CHANGED",
              payload: {
                index,
                executing: true,
              },
            });
            setTimeout(() => {
              store.dispatch({
                type: "OUTPUT_EXECUTING_CHANGED",
                payload: {
                  index,
                  executing: false,
                },
              });
            }, seconds * 1000);
          }
        } else if (seconds < 0) {
          if (!newState.result) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
            store.dispatch({
              type: "OUTPUT_EXECUTING_CHANGED",
              payload: {
                index,
                executing: false,
              },
            });
          } else if (!debounceTimeout) {
            debounceTimeout = setTimeout(() => {
              store.dispatch({
                type: "OUTPUT_EXECUTING_CHANGED",
                payload: {
                  index,
                  executing: true,
                },
              });
            }, -seconds * 1000);
          }
        }

        result = newState.result;
      }
      case "OUTPUT_EXECUTING_CHANGED":
      case "OUTPUT_FORCED_CHANGED": {
        if (index === lastAction.payload.index) {
          const newState = store.getState().output.ports[index];
          const newStateJSON = JSON.stringify(newState);
          if (state !== newState.state) {
            if (myGPIO) myGPIO.writeSync(newState.state ? 1 : 0);

            setState(newState.state);
            store.dispatch({
              type: "STATE_CHANGED",
            });
          }
          if (newStateJSON !== stateJSON) {
            stateJSON = newStateJSON;
            store.dispatch({
              type: "OUTPUT_EMIT",
              payload: index,
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
            result,
          },
        });
        break;
      }
      case "EXECUTE_START": {
        if (execute && store.getState().output.ports[index].result) {
          store.dispatch({
            type: "OUTPUT_EXECUTING_CHANGED",
            payload: {
              index,
              executing: true,
            },
          });
          if (seconds > 0) {
            setTimeout(() => {
              store.dispatch({
                type: "OUTPUT_EXECUTING_CHANGED",
                payload: {
                  index,
                  executing: false,
                },
              });
            }, seconds * 1000);
          }
        }
        break;
      }
      case "EXECUTE_STOP": {
        if (execute && seconds <= 0) {
          store.dispatch({
            type: "OUTPUT_EXECUTING_CHANGED",
            payload: {
              index,
              executing: false,
            },
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
      result: myParser.parse(formula),
    },
  });
}

export default Output;
