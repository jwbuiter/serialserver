const serialPort = require('serialport');
const http = require('http');
const Gpio = require('onoff').Gpio;

const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
  SERIAL_COMMAND,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  TABLE_RESET,
  ERROR_OCCURRED
} = require('../../actions/types.js');
const constants = require('../../config.static');

function Com(index, config, store) {
  const {
    mode,
    testMessage,
    timeout,
    port,
    readerPort,
    baudRate,
    bits,
    stopBits,
    parity,
    RTSCTS,
    XONXOFF,
    prefix,
    postfix,
    digits,
    factor,
    average,
    alwaysPositive,
    entries,
    triggerCom,
    timeoutReset,
    zeroReset,
    numeric
  } = config;

  const myGPIO = new Gpio(constants.comPin[index], 'out');

  let remainingEntries = Buffer('0');
  let averageList = [];

  let myTimeout = setTimeout(() => 0, 1);
  let zeroResetTimeout = null;


  function addResetTimeout() {
    if (timeoutReset) {
      clearTimeout(myTimeout);
      myTimeout = setTimeout(() => {
        store.dispatch({
          type: SERIAL_RESET,
          payload: index,
        });
      }, timeout * 1000);
    }
  }

  function dispatch(entry) {
    if (zeroReset && Number(entry) == 0 && !zeroResetTimeout) {
      store.dispatch({
        type: TABLE_RESET
      });
      store.dispatch({
        type: SERIAL_RESET
      });
      store.dispatch({
        type: HANDLE_OUTPUT
      });
      store.dispatch({
        type: HANDLE_TABLE
      });

      zeroResetTimeout = setTimeout(() => {
        zeroResetTimeout = null
      }, timeout * 1000);
    } else {
      store.dispatch({
        type: SERIAL_ENTRY,
        payload: {
          entry: entry,
          index: index,
        }
      });
      zeroResetTimeout = null;
      store.dispatch({
        type: HANDLE_TABLE
      });
      store.dispatch({
        type: HANDLE_OUTPUT
      });
    }
  }

  function decode(entry) {
    if (!numeric) {
      return entry.slice(-digits);
    } 

    entry = entry.replace(/ /g, ''); // remove spaces inside number
    let numericValue = parseFloat(entry) * factor;
    numericValue = alwaysPositive ? Math.abs(numericValue) : numericValue;

    if (average) {
      averageList.push(numericValue);
      averageList = averageList.slice(-entries);

      const average = (averageList.reduce((acc, cur) => acc + cur) / averageList.length).toFixed(digits);
      store.dispatch({
        type: SERIAL_AVERAGE,
        payload: {
          average,
          index,
        }
      });
    }

    return numericValue.toFixed(digits);
  }

  switch (mode) {
    case 'test':
      {
        // if the test mode is enabled, dispatch an entry containing the test message every timeout
        let dispatchTest;
        let nextTime = (new Date).getTime();

        const dispatchValue = () =>{
          switch (testMessage){
            case 'randomWeight':
              dispatch(decode(75 + Math.random() * 50 + ''));
              break;
            case 'randomRFID':
              dispatch(decode(Math.floor(Math.random() * 5) + 1234567890 + ''));
              break;
            default:
              dispatch(decode(testMessage));
              break;
          }
        }

        if (timeoutReset) {
          const dispatchNothing = () => {
            dispatch(decode('0'));
          }
          
          dispatchTest = () => {
            dispatchValue();
          
            setTimeout(dispatchNothing, timeout * 1000);

            nextTime += 2 * timeout * 1000;
            const currentTime = (new Date).getTime();
            setTimeout(dispatchTest, nextTime - currentTime);
          }
        } else {
          dispatchTest = () => {
            dispatchValue();

            nextTime += timeout * 1000;
            const currentTime = (new Date).getTime();
            setTimeout(dispatchTest, nextTime - currentTime);
          }
        }
        dispatchTest();
        break;
      }
    case 'reader':
      {
        const server = http.createServer(function (req, res) {
          myGPIO.writeSync(1);
          setTimeout(() => myGPIO.writeSync(0), 500);

          if (req.url === '/favicon.ico') {
            res.end();
            return;
          }
          const entry = decode(decodeURI(req.url.slice(1)));

          dispatch(entry);
          addResetTimeout();

          res.end();
        });
        server.on('error', (err, socket) => {
          store.dispatch({
            type: ERROR_OCCURRED,
            payload: err
          });
        });

        server.listen(readerPort);
        break;
      }
    default:
      {

        const myPort = new serialPort(port, {
          baudRate: baudRate,
          dataBits: bits,
          stopBits: stopBits,
          parity: parity,
          rtscts: RTSCTS,
          xon: XONXOFF,
          xoff: XONXOFF
        });

        store.listen(action => {
          switch (action.type) {
            case SERIAL_COMMAND:
              {
                const {
                  command
                } = action.payload;
                const commandIndex = action.payload.index

                if (index === commandIndex) {
                  console.log('Command:', {
                    index,
                    command
                  })
                  command.split(';').forEach((subCommand, index) => {
                    setTimeout(() => {
                      myPort.write(subCommand);
                    }, index * 1000);
                  });
                }
              }
          }
        });

        myPort.on('readable', () => {
          // blink the associated led.
          myGPIO.writeSync(1);
          setTimeout(() => myGPIO.writeSync(0), 250);

          // read new entries into buffer
          remainingEntries = Buffer.concat([remainingEntries, myPort.read()]);

          let nextEntry, nextEntryEnd;

          if (remainingEntries.length === 0)
            return;

          if ((prefix === '') && (postfix === '')) {
            const newEntry = remainingEntries.toString().slice(-digits);
            dispatch(newEntry);
            return
          }

          while ((nextEntry = remainingEntries.indexOf(prefix)) >= 0) {

            nextEntryEnd = remainingEntries.slice(nextEntry).indexOf(postfix);

            if (nextEntryEnd === -1) {
              break;
            }

            let newEntry = (remainingEntries.slice(nextEntry + Buffer(prefix).length, (nextEntryEnd === 0) ? remainingEntries.length : (nextEntryEnd + nextEntry))).toString();

            newEntry = decode(newEntry);

            // dont remember why this is here
            if (index == triggerCom && latestLogEntry[index] != newEntry) {
              store.dispatch({
                type: SERIAL_RESET,
              });
              console.log('clear')
            }

            if (newEntry !== store.getState().serial.coms[index].entry) {
              dispatch(newEntry);
              addResetTimeout();
            }

            remainingEntries = remainingEntries.slice(nextEntry + nextEntryEnd);
          }
        });
        break;
      }
  }
}

module.exports = Com;