var config = {};

config.serialPort = '/dev/ttyUSB0';
config.serialBaudrate = 115200;
config.serialStopBits = 1;
config.serialBits = 8;
config.serialParityBit = false;
config.serialFlowControll = 'none';

config.port = 8080;

module.exports = config;