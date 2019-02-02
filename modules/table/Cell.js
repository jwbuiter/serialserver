const {
  STATE_CHANGED,
  HANDLE_TABLE,
  LOG_RESET,
  TABLE_ENTRY,
  TABLE_RESET,
  TABLE_RESET_CELL,
  TABLE_EMIT
} = require('../../actions/types');
const Parser = require('../parser/Parser');

function Cell(index, config, store) {
  const {formula, digits, numeric, resetOnExe, waitForOther, type} = config;
  const manual = (type === 'manual' || type==="menu");
  const myParser = Parser(store);

  let content = '';

  function resetCell(){
    if (type ===  'menu'){
      const menuOptions = (formula.match(/{[0-9.]*:[\w ]*}/g) || []).map(
        str => {
          const parts = str.split(":");
          const valueString = parts[0].slice(1);
          const descriptionString = parts[1].slice(0, -1);

          return {
            value: valueString ? Number(parts[0].slice(1)) : "",
            description: descriptionString
          };
        }
      );
      content = menuOptions[0].value;
      store.dispatch({
        type: TABLE_ENTRY, 
        payload: {index, entry: content}
      });
    } else {
      content='';
      store.dispatch({
        type: TABLE_RESET_CELL,
        payload: index,
      });
    }
    
    store.dispatch({type: TABLE_EMIT, payload: {index, entry: content, manual}});
  }

  store.listen((lastAction)=>{
    const state = store.getState();
    switch (lastAction.type){
      case STATE_CHANGED:
      case HANDLE_TABLE:{
        const allEntries = state.serial.coms.reduce((acc, cur) => (acc && !(cur.entry === '0' || cur.entry==='')), true);
        if (waitForOther && !allEntries){
          break;
        }
        if (manual) {
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
        if(entry!==content){
          content=entry;
          store.dispatch({type: STATE_CHANGED})
          store.dispatch({type: TABLE_EMIT, payload: {index, entry, manual}});
        }
        break;
      }
      case LOG_RESET:{
        resetCell();
        break;
      }
      case TABLE_RESET:{
        if (resetOnExe){
          resetCell();
        }
        break;
      }
    }
  });

  resetCell();

  return {};
}

module.exports = Cell;