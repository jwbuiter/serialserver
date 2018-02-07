var config = {};

config.serial= [
  {
    port : '/dev/ttyUSB0',       
    baudRate : 9600 ,          // most common options are 110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 56000, 57600, 115200
    stopBits : 1,               // options are 1 and 2.
    bits : 8,                   // options are 8, 7, 6 and 5.
    parity : 'none',            // options are 'none', 'even', 'odd', 'mark' and 'space'. Must not be capitalized.
    RTSCTS : true,               // options are true or false
    XON : false,             // options are true or false
    XOFF : false,             // options are true or false

    name : 'Weight',
    numerical : true,           // whether the input is numerical, either true or false
    averages : 5,               // in case of a numerical input, the number of averages to take. Also the number of entries shown in debug

    prefix : 'W=+',              // string preceding serial data
    postfix : 'kg'             // string following serial data
  },
  {
    port : '/dev/ttyUSB1',
    baudRate : 9600,
    stopBits : 1,
    bits : 8,
    parity : 'none',
    RTSCTS : true,
    XON : false,
    XOFF : false,

    name : 'RFID',
    numerical : false,
    averages : 5,

    prefix : 'ð#',
    postfix : '05'
  }
];
config.name = 'MBDCcom01';
config.QS = '222 333 444';
config.port = 80;

module.exports = config;
