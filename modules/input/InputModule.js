const Input = require("./Input");

function InputModule(config, store) {
  const { ports } = config;

  return {
    ports: ports.map((input, index) => new Input(index, input, store))
  };
}

module.exports = InputModule;
