const Gpio = require("onoff").Gpio;
const { exec } = require("child_process");

const {
  SERIAL_COMMAND,
  INPUT_PHYSICAL_CHANGED,
  INPUT_BLOCKING_CHANGED,
  INPUT_FORCED_CHANGED,
  INPUT_FOLLOWING_CHANGED,
  INPUT_CALCULATE_STATE,
  INPUT_EMIT,
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
  HANDLE_OUTPUT,
  STATE_CHANGED,
  LOG_MAKE_ENTRY,
  EXECUTE_START,
  EXECUTE_STOP,
  SERIAL_RESET,
  TABLE_RESET,
  SL_TEACH,
  RESTART
} = require("../../actions/types");
const constants = require("../../config.static");

function Input(index, config, store) {
  const {
    formula,
    timeout,
    follow,
    invert,
    manualTimeout,
    commandCom,
    commandValue,
    hardwareInput
  } = config;

  const myGPIO = ~hardwareInput
    ? new Gpio(constants.inputPin[hardwareInput], "in", "both")
    : null;
  let debounce = setTimeout(() => 0, 1);
  let force = setTimeout(() => 0, 1);
  let stateJSON = "";
  let state = false;

  if (myGPIO) {
    myGPIO.watch((err, val) => {
      setTimeout(() => {
        dispatchPhysical(myGPIO.readSync() ? true : false);
      }, 10);
    });
  }

  function handleInput(state) {
    switch (formula) {
      case "exe": {
        const reduxState = store.getState();
        const blocked = reduxState.input.ports.reduce(
          (acc, cur) => acc || cur.blocking,
          false
        );
        const stillExecuting = reduxState.output.ports.reduce(
          (acc, cur) => acc || cur.executing,
          false
        );
        if (state && !blocked && !stillExecuting) {
          store.dispatch({
            type: LOG_MAKE_ENTRY
          });
          store.dispatch({
            type: EXECUTE_START
          });
        } else if (!state && reduxState.input.executing) {
          store.dispatch({
            type: EXECUTE_STOP
          });
          store.dispatch({
            type: SERIAL_RESET
          });
          store.dispatch({
            type: TABLE_RESET
          });
          store.dispatch({
            type: HANDLE_OUTPUT
          });
        }
        break;
      }
      case "exebl": {
        store.dispatch({
          type: INPUT_BLOCKING_CHANGED,
          payload: {
            index,
            blocking: state
          }
        });
        break;
      }
      case "reset":{
        store.dispatch({
          type: SERIAL_RESET
        });
        store.dispatch({
          type: TABLE_RESET
        });
        store.dispatch({
          type: HANDLE_OUTPUT
        });
        break;
      }
      case "teach": {
        store.dispatch({
          type: SL_TEACH,
          payload: state
        });
        store.dispatch({
          type: STATE_CHANGED
        });
        break;
      }
      case "restart": {
        if (state) {
          store.dispatch({
            type: SERIAL_RESET
          });
          store.dispatch({
            type: RESTART
          });
        }
        break;
      }
      case "shutdown": {
        if (state) {
          store.dispatch({
            type: SERIAL_RESET
          });
          exec("shutdown now", (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
          });
        }
        break;
      }
      case "command": {
        if (state) {
          const index = Number(commandCom.slice(3));
          store.dispatch({
            type: SERIAL_COMMAND,
            payload: {
              index,
              command: commandValue
            }
          });
        }
        break;
      }
    }
  }

  function dispatchPhysical(state) {
    store.dispatch({
      type: INPUT_PHYSICAL_CHANGED,
      payload: {
        physical: state,
        index
      }
    });
  }

  store.listen(lastAction => {
    switch (lastAction.type) {
      case INPUT_FORCED_CHANGED: {
        if (index === lastAction.payload.index) {
          store.dispatch({
            type: INPUT_CALCULATE_STATE,
            payload: {
              index
            }
          });

          if (manualTimeout && lastAction.payload.isForced) {
            clearTimeout(force);
            force = setTimeout(() => {
              store.dispatch({
                type: INPUT_FORCED_CHANGED,
                payload: {
                  index,
                  isForced: false,
                  previousForced: true,
                  forcedState: false
                }
              });
            }, manualTimeout * 1000);
          }
        }
        break;
      }
      case INPUT_FOLLOWING_CHANGED:
      case INPUT_PHYSICAL_CHANGED: {
        if (index === lastAction.payload.index) {
          if (timeout && !state) {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
              store.dispatch({
                type: INPUT_CALCULATE_STATE,
                payload: {
                  index
                }
              });
            }, timeout);
          } else {
            store.dispatch({
              type: INPUT_CALCULATE_STATE,
              payload: {
                index
              }
            });
          }
        }
        break;
      }
      case INPUT_CALCULATE_STATE: {
        const newState = store.getState().input.ports[index];
        const newStateJSON = JSON.stringify(newState);

        if (state !== newState.state) {
          state = newState.state;
          store.dispatch({
            type: STATE_CHANGED
          });
          handleInput(newState.state);
        }
        if (stateJSON !== newStateJSON) {
          stateJSON = newStateJSON;
          store.dispatch({
            type: INPUT_EMIT,
            payload: index
          });
        }
        break;
      }
      case OUTPUT_RESULT_CHANGED:
      case OUTPUT_FORCED_CHANGED:
      case OUTPUT_EXECUTING_CHANGED: {
        if (follow === lastAction.payload.index) {
          const outputState = store.getState().output.ports[follow].state;
          const isFollowing = outputState ^ invert;
          store.dispatch({
            type: INPUT_FOLLOWING_CHANGED,
            payload: {
              index,
              isFollowing: isFollowing ? true : false
            }
          });
        }
        break;
      }
    }
  });

  return {};
}

module.exports = Input;
