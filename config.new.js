var config ={
  serial : {
    testMode : true,
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
        name : 'Gewicht',
        average : false,
        timeout : 10,
        timeoutReset : false,
        digits : 1,
        entries : 1,
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
        name : 'E-Nummer',
        average : false,
        timeout : 10,
        timeoutReset : false,
        digits : 10,
        entries : 1,
        factor : 0,
        alwaysPositive : false,
        prefix : '#',
        postfix : '05',
        testMessage : '6543210987654321'
      }
    ],
  },

  table : {
    trigger : 1,
    useFile : true,
    waitForOther : true,
    searchColumn : 0,
    cells : [
      {
        name : 'Nummer',
        formula : '$B',
        numeric : false,
        digits : 16,
        resetOnExe : true
      },
      {
        name : 'Leeftijd',
        formula : 'date-$C',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : 'Spenen',
        formula : '$D',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : 'Index',
        formula : '$E',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : 'Levensgroei',
        formula : '(com0-1.5)/#A2*1000',
        numeric : true,
        digits : 0,
        resetOnExe : true
      },
      {
        name : 'Aantal',
        formula : '&tn',
        numeric : true,
        digits : 0,
        resetOnExe : false
      },
      {
        name : 'Tot Gewicht',
        formula : '&to0',
        numeric : true,
        digits : 0,
        resetOnExe : false
      },
      {
        name : 'Gem Gewicht',
        formula : '&to0/&tn',
        numeric : true,
        digits : 1,
        resetOnExe : false
      },
      {
        name : 'Uniformiteit',
        formula : '(#B3-&sp0)/#B3*100',
        numeric : true,
        digits : 0,
        resetOnExe : false
      },
      {
        name : 'Notitie',
        formula : '#',
        numeric : false,
        digits : 10,
        resetOnExe : true
      }
    ],
  },

  output : {
    ports : [
      {
        name : 'Poort In',
        formula : 'com0<1 and #O3==0',
        execute : false,
        seconds : 0
      },
      {
        name : 'Poort Uit',
        formula : 'com0>1',
        execute : true,
        seconds : 0
      },
      {
        name : 'Seperator',
        formula : 'com0>2',
        execute : true,
        seconds : 0
      },
      {
        name : 'Mark Index',
        formula : '#A4>80',
        execute : true,
        seconds : 1
      },
      {
        name : 'Mark Groei',
        formula : '#A5>2',
        execute : true,
        seconds : 1
      },
      {
        name : 'Gereed',
        formula : 'com0==0 or com1==0',
        execute : false,
        seconds : 0
      },
      {
        name : 'Uitgang 7',
        formula : '#I2',
        execute : false,
        seconds : 0
      },
      {
        name : 'Uitgang 8',
        formula : '#I3',
        execute : false,
        seconds : 0
      },
      {
        name : 'Uitgang 9',
        formula : '#I4',
        execute : false,
        seconds : 0
      },
      {
        name : 'Uitgang 10',
        formula : '#I4',
        execute : true,
        seconds : 0
      }
    ],
  }

  input : {
    ports : [
      {
        name : 'Blokkering',
        formula : 'exebl',
        follow : 5,
        timeout : 20,
        invert : false
      },
      {
        name : 'Ingang 2',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : 'Ingang 3',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : 'Ingang 4',
        formula : '',
        follow : -1,
        timeout : 20,
        invert : false
      },
      {
        name : 'Uitvoeren',
        formula : 'exe',
        follow : -1,
        timeout : 20,
        invert : false
      }
    ],
  },

  logger : {
    enabled : true,
    reset : 'off',
    resetValue : '00:00',
  },

  FTP : {
    automatic : false,
    bla : [
      {
        addressFolder : '192.168.1.110',
        userPassword : 'com:Com1234'
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
    reset : 'fileReset',
    resetValue : '00:00',
    startCalibration : 25,
    startTolerance : 50,
  },

  version : '2.0'
};

module.exports = config;