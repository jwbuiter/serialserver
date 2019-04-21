const Output = require('./Output');

function OutputModule(config, store) {
  const {
    ports
  } = config;
  return {
    ports: ports.map((output, index) => new Output(index, output, store)),
  }
}

module.exports = OutputModule;