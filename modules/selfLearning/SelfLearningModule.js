const {
  SL_ENTRY,
  SL_SUCCESS,
  EXECUTE_START,
  LOG_RESET,
  LOG_SAVE,
  CONFIG_UPDATE,
  ERROR_OCCURRED
} = require('../../actions/types');

const Global = require('./Global');
const Individual = require('./Individual');

function SelfLearningModule(config, store) {
  const {
    enabled,
    extraColumns
  } = config;
  if (enabled === 'off')
    return {};

  const comIndex = Number(enabled[3]);
  const individual = enabled.endsWith('ind');

  if (individual) {
    Individual(config, store);
  } else {
    Global(config, store);
  }

  store.listen(lastAction => {
    const state = store.getState();

    switch (lastAction.type) {
      case EXECUTE_START:
        {
          const newEntry = Number(state.serial.coms[comIndex].entry);
          if (isNaN(newEntry) || !isFinite(newEntry)) {
            console.log('Received self learning entry which is not a number, ignoring');
            break;
          }

          if (individual) {
            const key = state.serial.coms[1 - comIndex].entry;

            const columns = [newEntry, key];

            function parseExcel(x) {
              x = x.charCodeAt(1) - 65;
              return 'store.getState().table.foundRow[' + x + ']';
            }

            function parseColumn(x) {
              x = parseInt(x.slice(1)) - 1;
              return 'columns[' + x + ']';
            }

            extraColumns.forEach(column => {
              try {
                const formula = column.formula
                  .replace(/#[0-9]+/g, parseColumn)
                  .replace(/\$[A-Z]/g, parseExcel)
                  .replace(/date/g, Math.floor((new Date().getTime() / 1000 / 86400 + 25569)).toString());

                columns.push(eval(formula));
              } catch (err) {
                store.dispatch({
                  type: ERROR_OCCURRED,
                  payload: err
                });
              }
            });

            store.dispatch({
              type: SL_ENTRY,
              payload: {
                entry: newEntry,
                key,
                extra: columns.slice(2)
              }
            });
          } else {
            store.dispatch({
              type: SL_ENTRY,
              payload: {
                entry: newEntry
              },
            });
          }
        }
    }
  });

  return {};
}

module.exports = SelfLearningModule;