const {COM_ENTRY, COM_RESET} = require('./types.js');

module.exports = {
  addComEntry : (entry, index) =>{
    store.dispatch({
      type: COM_ENTRY,
      payload: {entry, index},
    })
  },
  resetCom : () => {
    store.dispatch({
      type: COM_RESET,
    })
  }
}