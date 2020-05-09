import Com from "./Com";

import { IStore } from "../../store";

function SerialModule(config, store: IStore) {
  const { coms } = config;
  return {
    coms: coms.map((com, index) => {
      const zeroReset =
        config.resetTrigger === "on" || config.resetTrigger === "com" + index;

      return Com(
        index,
        {
          ...com,
          zeroReset,
        },
        store
      );
    }),
  };
}

export default SerialModule;
