const {
  STATE_CHANGED,
  HANDLE_TABLE,
  TABLE_ENTRY,
  TABLE_RESET,
  TABLE_RESET_CELL,
} = require('../../actions/types');
const Parser = require('../parser/Parser');

function Cell(index, config, store) {
  const {formula, digits, numeric, resetOnExe, waitForOther} = config;
  const myParser = Parser(store);

  let content = '';

  store.listen((lastAction)=>{
    const state = store.getState();
    switch (lastAction.type){
      case STATE_CHANGED:
      case HANDLE_TABLE:{
        const allEntries = state.serial.coms.reduce((acc, cur) => (acc && !(cur.entry === '0' || cur.entry==='')), true);
        if (waitForOther && !allEntries){
          break;
        }
        if (formula == '#' || formula.startsWith('#M')) {
          break;
        }

        let entry = myParser.parse(formula);
        if (numeric){
          entry = Number(entry).toFixed(digits); 
        } else if (typeof(entry) === 'boolean'){
          entry = entry?1:0;
        }else {
          entry = String(entry).slice(-digits);
        }

        store.dispatch({
          type: TABLE_ENTRY,
          payload:{
            index,
            entry,
          }
        });
        break;
      }
      case TABLE_RESET:{
        if (resetOnExe){
          store.dispatch({
            type: TABLE_RESET_CELL,
            payload: index,
          });
        }
        break;
      }
    }
  });

  return {};
}

module.exports = Cell;