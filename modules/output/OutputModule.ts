import Output from "./Output";

import { StoreType } from "../../store";

function OutputModule(config, store: StoreType) {
  const { ports } = config;
  return {
    ports: ports.map((output, index) => Output(index, output, store))
  };
}

export default OutputModule;
