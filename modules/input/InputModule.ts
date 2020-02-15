import Input from "./Input";
import { StoreType } from "../../store";

function InputModule(config, store: StoreType) {
  const { ports } = config;

  return {
    ports: ports.map((input, index) => Input(index, input, store))
  };
}

export default InputModule;
