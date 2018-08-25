const serialPort = require('serialport');

const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
} = require('../../actions/types.js');

class Com {
  constructor(index, config, store){
    this.index = index;
    this.store = store;
    this = {...this, config};

    this.remainingEntries = Buffer('0');
    this.averageList = [];

    if (this.testMode){
      // if the test mode is enabled, dispatch an entry containing the test message every timeout
      const dispatchTest = () => {
        dispatch(this.testEntry);
      };
      dispatchTest();
      setInterval(dispatchTest, this.timeout * 1000);
    } else {
      
      const port = new serialPort(this.port, {
        baudRate: this.baudRate,
        dataBits: this.bits,
        stopBits: this.stopBits,
        parity: this.parity,
        rtscts: this.RTSCTS,
        xon: this.XONXOFF,
        xoff: this.XONXOFF
      });

      port.on('readable', () => {
        // blink the associated led.
        comGPIO[index].writeSync(1);
        setTimeout(() => comGPIO[index].writeSync(0), 250);

        // read new entries into buffer
        this.remainingEntries = Buffer.concat([this.remainingEntries, port.read()]);

        const nextEntry, nextEntryEnd;
        
        if (this.remainingEntries.length===0)
          return;

        if ((this.prefix==='')&&(this.postfix==='')){
          const newEntry = this.remainingEntries.toString().slice(-this.digits);
          dispatch(newEntry);
          return
        }

        while((nextEntry = thisremainingEntries.indexOf(this.prefix))>=0){

          nextEntryEnd = thisremainingEntries.slice(nextEntry).indexOf(this.postfix);

          if (nextEntryEnd===-1){
            break;
          }

          let newEntry = (this.remainingEntries.slice(nextEntry + Buffer(this.prefix).length, (nextEntryEnd===0)?this.remainingEntries.length:(nextEntryEnd+nextEntry))).toString();
          
          newEntry = decode(newEntry);
          
          // dont remember why this is here
          if (index == thisig.triggerCom && latestLogEntry[index] != newEntry){
            this.store.dispatch({
              type : SERIAL_RESET,
            });
          }

          dispatch(newEntry);
          
          this.remainingEntries = this.remainingEntries.slice(nextEntry + nextEntryEnd);
        }  
      });
    }
  }

  dispatch(entry){
    this.store.dispatch({
      type : SERIAL_ENTRY,
      payload : {
        entry : entry,
        index : this.index,
      }
    });
    this.store.dispatch({type : HANDLE_TABLE});
    this.store.dispatch({type : HANDLE_OUTPUT});
  }

  decode(entry){
    let decodedEntry;

    if (this.factor===0){
      // Entry is not numeric
      decodedEntry = entry.slice(-this.digits);
    } else {
      // Entry should be numeric if this is true
      entry = entry.replace(/ /g,''); // remove spaces inside number
      const numericValue = parseFloat(entry)*this.factor);
      numericValue = this.alwaysPositive?Math.abs(numericValue):numericValue;

      decodedEntry = numericValue.toFixed(this.digits);

      if (this.average){
        for (let i = config.entries-1; i > 0; i--)
        {
          if (this.averageList[i - 1]){
            this.averageList[i] = this.averageList[i - 1];
          }
        }
        this.averageList[0] = numericValue;
        const average = averageList.reduce((acc, cur)=>acc + cur)/this.averageList.length;
        this.store.dispatch({
          type : SERIAL_ENTRY,
          payload : {
            entry : average,
            index : this.index,
          }
        });
      }
    }
  
    return decodedEntry;
  }
}

module.exports = Com;