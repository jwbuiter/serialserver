import { execSync } from "child_process";

const cpuSerialCommand =
  "awk '/Serial/ {print $3}' /proc/cpuinfo | sed 's/^0*//'";
const cpuSerialRequired = "10000d0003a9faaa0";

function AuthenticationModule() {
  const cpuSerial = String(execSync(cpuSerialCommand)).trim();
  const authenticated = cpuSerial == cpuSerialRequired;

  if (!authenticated) console.log("No license found, contact mbdc.nl");

  return authenticated;
}

export default AuthenticationModule;
