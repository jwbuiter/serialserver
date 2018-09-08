var config ={
  serial : {
    testMode : false,
    resetTrigger : 'off',
    coms : [
      {
        port : '/dev/ttyUSB0',
        baudRate : 9600,
        stopBits : 1,
        bits : 8,
        parity : 'none',
        RTSCTS : true,
        XONXOFF : false,
        name : 'Weight',
        average : false,
        timeout : 60,
        timeoutReset : false,
        digits : 3,
        entries : 5,
        factor : 1,
        alwaysPositive : true,
        prefix : 'ST,GS',
        postfix : 'kg',
        testMessage : '123.123'
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
        timeout : 60,
        timeoutReset : false,
        digits : 15,
        entries : 5,
        factor : 0,
        alwaysPositive : false,
        prefix : '#',
        postfix : '05',
        testMessage : '6543210987654321'
      }
    ],
  },

  table : {
    trigger : 0,
    useFile : false,
    waitForOther : false,
    searchColumn : 0,
    cells : [
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : '',
        formula : '',
        numeric : true,
        digits : 0,
        resetOnExe : true
      }
    ],
  },

  output : {
    ports : [
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
      {
        name : '',
        formula : '',
        execute : false,
        seconds : 0,
      },
    ],
  },

  input : {
    ports : [
      {
        name : '',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : '',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : '',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : '',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : '',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
    ],
  },

  logger : {
    writeToFile : false,
    resetMode : 'off',
    resetValue : '00:00',
  },

  FTP : {
    automatic : false,
    targets : [
      {  
        addressFolder : 'ftp.mbdc.nl',
        userPassword : 'com:Com1234',
      },
      {
        addressFolder : '',
        userPassword : ''
      }
    ],
  },

  selfLearning : {
    enabled : 'off',
    number : 10,
    tolerance : 25,
    startCalibration : 25,
    startTolerance : 50,
  },

  version : '2.0'
};

module.exports = config;