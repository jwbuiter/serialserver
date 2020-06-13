import Global from "./Global";
import Individual from "./Individual";
import { IStore } from "../../store";
import { ISelfLearningConfig } from "../../config";

function SelfLearningModule(config: ISelfLearningConfig, store: IStore) {
  const { enabled, extraColumns } = config;
  if (enabled === "off") return {};

  const comIndex = Number(enabled[3]);
  const individual = enabled.endsWith("ind");

  if (individual) {
    Individual(config, store);
  } else {
    Global(config, store);
  }

  store.listen((lastAction) => {
    const state = store.getState();

    switch (lastAction.type) {
      case "EXECUTE_START": {
        const newEntry = Number(state.serial.coms[comIndex].entry);
        if (isNaN(newEntry) || !isFinite(newEntry)) {
          console.log(
            "Received self learning entry which is not a number, ignoring"
          );
          break;
        }

        if (individual) {
          const key = state.serial.coms[1 - comIndex].entry;

          store.dispatch({
            type: "SL_ENTRY",
            payload: {
              entry: newEntry,
              key,
            },
          });
        } else {
          store.dispatch({
            type: "SL_ENTRY",
            payload: {
              entry: newEntry,
            },
          });
        }
      }
    }
  });

  return {};
}

export default SelfLearningModule;
