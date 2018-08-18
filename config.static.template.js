var constants = {
  name : 'MBDCcom01',
  QS : '000 000 000',
  port : 80,
  saveFileLocation : '/home/pi/Documents',
  exposeUpload : false,
  selfLearning : false,
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
}

module.exports = constants;