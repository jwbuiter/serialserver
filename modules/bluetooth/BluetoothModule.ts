import { IBluetoothConfig } from "../../config";
import { IStore } from "../../store";
import { SerialPort } from "serialport";
import { createLogLine } from "../../utils/logUtils";
import fs from "fs";

const bluetoothSerialFile = "/dev/rfcomm0";

function BluetoothModule(config: IBluetoothConfig, store: IStore) {
  const { trigger, source, frequency } = config;
  console.log("bluetooth", config);
  if (trigger === "off") return {};

  const sourceIndex = +source[3];
  const triggerIndex = +trigger[3];

  function sendData() {
    console.log("send");
    let data: string;
    if (source == "log") {
      data = createLogLine(store.getState().logger);
    } else {
      const com = store.getState().serial.coms[sourceIndex];
      if (com.average === "") data = com.entry;
      else data = com.average;
    }

    if (fs.existsSync(bluetoothSerialFile)) {
      const bluetoothSerialPort = new SerialPort({
        path: bluetoothSerialFile,
        baudRate: 115200,
      });
      bluetoothSerialPort.write(data + "\n");
      setTimeout(() => {
        if (bluetoothSerialPort.isOpen) bluetoothSerialPort.close();
      }, 50);
    }
  }

  if (trigger === "continuous") {
    const interval = Math.max(100, 1000 / frequency);
    setInterval(sendData, interval);
  } else if (trigger == "execute") {
    store.listen((lastAction) => {
      if (lastAction.type === "EXECUTE_START") sendData();
    });
  } else {
    store.listen((lastAction) => {
      if (
        lastAction.type === "SERIAL_ENTRY" &&
        lastAction.payload.index == triggerIndex
      )
        sendData();
    });
  }

  return {};
}

export default BluetoothModule;
