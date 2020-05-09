import Input from "./Input";
import { IStore } from "../../store";
import { IInputsConfig } from "../../config";

function InputModule(config: IInputsConfig, store: IStore) {
  const { ports } = config;

  return {
    ports: ports.map((input, index) => Input(index, input, store)),
  };
}

export default InputModule;
