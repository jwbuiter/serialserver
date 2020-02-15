import Com from "./Com";

import { StoreType } from "../../store";

function SerialModule(config, store: StoreType) {
  const { coms } = config;
  return {
    coms: coms.map((com, index) => {
      const zeroReset =
        config.resetTrigger === "on" || config.resetTrigger === "com" + index;

      return Com(
        index,
        {
          ...com,
          zeroReset
        },
        store
      );
    })
  };
}

export default SerialModule;
