var config ={
  serial: [
    {
      port : '/dev/ttyUSB0',
      baudRate : 9600,                 // Most common options are 110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 56000, 57600, 115200
      stopBits : 1,                    // Options are 1 and 2.
      bits : 8,                        // Options are 8, 7, 6 and 5.
      parity : 'none',                 // Options are 'none', 'even', 'odd', 'mark' and 'space'. Must not be capitalized.
      RTSCTS : true,                   // Options are true or false
      XONXOFF : false,                 // Options are true or false

      name : 'Weight',
      average : false,                  // Whether the input should be averaged, either true or false
      timeout: 10,                  // When not averaging: the number of milliseconds to way to show the same response in a row.
      digits : 3,                      // When input is numeric, the number of decimals to show, otherwise the cuttof for the last shown characters
      entries : 5,                     // The number of entries shown in debug. In case where averaging is on also the number of averages to take. Also the number of entries shown in debug
      factor : 1,                      // Multiplication factor in the case of numerical input, 0 if input is not numerical
      alwaysPositive: true,            // If this is set to true, numerical input will automatically be made positive if it is negative

      prefix : 'ST,GS,',                  // String preceding serial data
      postfix : 'KG',                   // String following serial data

      testMessage : '10'              // In test mode: the entry that will be emitted
    },
    {
      port : '/dev/ttyUSB1',
      baudRate : 9600,
      stopBits : 1,
      bits : 8,
      parity : 'none',
      RTSCTS : true,
      XONXOFF : false,

      name : 'RFID',
      average : false,
      timeout: 10,
      digits : 15,
      entries : 5,
      factor : 0,
      alwaysPositive: false, 

      prefix : '#',
      postfix : '05',

      testMessage : '999000000157495'
    }
  ],
  name : 'MBDCcom01',
  QS : '000 000 000',
  port : 80,
  onlineGPIO : 10,
  com0GPIO : 11,
  com1GPIO : 12,
  
  exposeUpload: false,
  testMode: true
};

module.exports = config;