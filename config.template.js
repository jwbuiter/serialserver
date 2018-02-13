var config = {};

config.serial= [
  {
    port : '/dev/ttyUSB0',       
    baudRate : 9600 ,           // Most common options are 110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 56000, 57600, 115200
    stopBits : 1,               // Options are 1 and 2.
    bits : 8,                   // Options are 8, 7, 6 and 5.
    parity : 'none',            // Options are 'none', 'even', 'odd', 'mark' and 'space'. Must not be capitalized.
    RTSCTS : true,              // Options are true or false
    XON : false,                // Options are true or false
    XOFF : false,               // Options are true or false

    name : 'Weight',
    average : true,             // Whether the input should be averaged, either true or false
    digits : 5,                 // When averaging, the number of decimals to show, otherwise the cuttof for the last shown characters
    entries : 5,                // The number of entries shown in debug. In case of a numerical input also the number of averages to take. Also the number of entries shown in debug
    factor: 1,                  // Multiplication factor in the case of numerical input.


    prefix : 'W=+',             // String preceding serial data
    postfix : 'kg'              // String following serial data
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
    average : true,
    digits : 5,
    entries : 5, 
    factor : 0, 

    prefix : 'ð#',
    postfix : '05'
  }
];
config.name = 'MBDCcom01';
config.QS = '222 333 444';
config.port = 80;

module.exports = config;
