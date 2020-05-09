import Output from "./Output";

import { IStore } from "../../store";
import { IOutputsConfig } from "../../config";

function OutputModule(config: IOutputsConfig, store: IStore) {
  const { ports } = config;
  return {
    ports: ports.map((output, index) => Output(index, output, store)),
  };
}

export default OutputModule;
