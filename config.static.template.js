var constants = {
  name : 'MBDCcom01',
  QS : '000 000 000',
  port : 80,
  saveLogLocation : '/home/pi/Documents',
  exposeUpload : false,
  tableColumns : 5,
  resetPin: 3,
  outputPin: [
    4,
    17,
    18,
    27,
    22,
    23,
    24,
    10,
    9,
    25,
  ],
  inputPin: [
    19,
    16,
    26,
    20,
    21,
  ],
  comPin : [
    6,
    13,
  ],
  onlinePin : 5,
  enabledModules: {
    authentication: true,
    FTP: true,
    input: true,
    logger: true,
    output: true,
    site: true,
    selfLearning: false,
    serial: true,
    table: true,
  },
  version: '2.1',
}

module.exports = constants;