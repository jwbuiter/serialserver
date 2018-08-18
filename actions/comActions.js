const {COM_ENTRY, COM_RESET} = require('./types.js');

module.exports = {
  addComEntry : (entry, index) =>({
    type: COM_ENTRY,
    payload: {entry, index},
  }),
  resetCom : () => ({
    type: COM_RESET,
  })
}