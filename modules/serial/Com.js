const serialPort = require('serialport');
const Gpio = require('onoff').Gpio;

const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
  HANDLE_OUTPUT,
  HANDLE_TABLE,
  TABLE_RESET,
} = require('../../actions/types.js');
const constants = require('../../config.static');

function Com(index, config, store) {
  const {
    testMode, 
    testMessage, 
    timeout, 
    port, 
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
  } = config;

  const myGPIO = new Gpio(constants.comPin[index], 'out');

  let remainingEntries = Buffer('0');
  let averageList = [];

  let myTimeout = setTimeout(()=> 0 ,1);

  function dispatch(entry){
    if (zeroReset && Number(entry) == 0){
      store.dispatch({type: TABLE_RESET});
      store.dispatch({type: SERIAL_RESET});
    } else {
      store.dispatch({
        type : SERIAL_ENTRY,
        payload : {
          entry : entry,
          index : index,
        }
      });
      store.dispatch({type : HANDLE_TABLE});
      store.dispatch({type : HANDLE_OUTPUT});
    }
  }
  
  function decode(entry){
    let decodedEntry;
  
    if (factor===0){
      // Entry is not numeric
      decodedEntry = entry.slice(-digits);
    } else {
      // Entry should be numeric if this is true
      entry = entry.replace(/ /g,''); // remove spaces inside number
      let numericValue = parseFloat(entry)*factor;
      numericValue = alwaysPositive?Math.abs(numericValue):numericValue;
  
      decodedEntry = numericValue.toFixed(digits);
  
      if (average){
        for (let i = entries-1; i > 0; i--)
        {
          if (averageList[i - 1]){
            averageList[i] = averageList[i - 1];
          }
        }
        averageList[0] = numericValue;
        const average = averageList.reduce((acc, cur)=>acc + cur)/averageList.length;
        store.dispatch({
          type : SERIAL_ENTRY,
          payload : {
            entry : average,
            index,
          }
        });
      }
    }
  
    return decodedEntry;
  }

  if (testMode){
    // if the test mode is enabled, dispatch an entry containing the test message every timeout
    if (timeoutReset){
      const dispatchNothing = () => {
        dispatch(decode('0'));
      }
      const dispatchTest = () => {
        dispatch(decode(testMessage));
        setTimeout(dispatchNothing, timeout * 1000);
      }

      dispatchTest();
      setInterval(dispatchTest, 2 * timeout * 1000);

    } else {
      const dispatchTest = () => {
        dispatch(decode(testMessage));
      }

      dispatchTest();
      setInterval(()=> dispatchTest, timeout * 1000);
    }
  } else {
    
    const myPort = new serialPort(port, {
      baudRate: baudRate,
      dataBits: bits,
      stopBits: stopBits,
      parity: parity,
      rtscts: RTSCTS,
      xon: XONXOFF,
      xoff: XONXOFF
    });

    myPort.on('readable', () => {
      // blink the associated led.
      myGPIO.writeSync(1);
      setTimeout(() => myGPIO.writeSync(0), 250);

      // read new entries into buffer
      remainingEntries = Buffer.concat([remainingEntries, myPort.read()]);

      let nextEntry, nextEntryEnd;
      
      if (remainingEntries.length===0)
        return;

      if ((prefix==='')&&(postfix==='')){
        const newEntry = remainingEntries.toString().slice(-digits);
        dispatch(newEntry);
        return
      }

      while((nextEntry = remainingEntries.indexOf(prefix))>=0){

        nextEntryEnd = remainingEntries.slice(nextEntry).indexOf(postfix);

        if (nextEntryEnd===-1){
          break;
        }

        let newEntry = (remainingEntries.slice(nextEntry + Buffer(prefix).length, (nextEntryEnd===0)?remainingEntries.length:(nextEntryEnd+nextEntry))).toString();
        
        newEntry = decode(newEntry);
        
        // dont remember why this is here
        if (index == triggerCom && latestLogEntry[index] != newEntry){
          store.dispatch({
            type : SERIAL_RESET,
          });
          console.log('clear')
        }

        if(newEntry !== store.getState().serial.coms[index].entry){
          dispatch(newEntry);
          if (timeoutReset){
            clearTimeout(myTimeout);
            myTimeout = setTimeout(() => {
              store.dispatch({
                type : SERIAL_RESET,
                payload: index,
              });
            }, timeout*1000);
          }
        }

        remainingEntries = remainingEntries.slice(nextEntry + nextEntryEnd);
      }  
    });
  }
}

module.exports = Com;