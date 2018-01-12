var config = {};

config.serialPort = '/dev/ttyUSB0';       
config.serialBaudrate = 115200;           // most common options are 110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 56000, 57600, 115200
config.serialStopBits = 1;                // options are 1 and 2.
config.serialBits = 8;                    // options are 8, 7, 6 and 5.
config.serialParity = 'None';             // options are 'None', 'Even', 'Odd', 'Mark' and 'Space'. Must be capitalized.
config.serialRTSCTS = 'No';               // options are 'Yes' and 'No'. Must be capitalized.
config.serialXONXOFF = 'No';              // options are 'Yes' and 'No'. Must be capitalized.

config.port = 8080;

module.exports = config;