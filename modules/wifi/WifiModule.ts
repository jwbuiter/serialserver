import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import constants from "../../constants";
import { IStore } from "../../store";

// Wi-Fi management through NetworkManager (nmcli).
// Requires Raspberry Pi OS Bookworm or newer (NetworkManager is the default there).
// Every command is run with execFile and an argument array, so SSIDs and
// passwords are never interpreted by a shell.

const HOTSPOT_CON = "serialserver-hotspot";
// Address of the Pi on the hotspot network. Clients get an address in the same
// /24 from NetworkManager's DHCP server, with this address as their gateway.
export const HOTSPOT_IP = "10.100.1.61";
const HOTSPOT_PREFIX = 24;
// Makes every DNS name resolve to the Pi while the hotspot is up, so phones
// show their "sign in to network" page (captive portal).
const CAPTIVE_DNS_FILE = "/etc/NetworkManager/dnsmasq-shared.d/serialserver-captive.conf";
const DEFAULT_HOTSPOT_PASSWORD = "serialserver";
const RETRY_INTERVAL = 5 * 60 * 1000;

export interface IWifiNetwork {
  ssid: string;
  signal: number;
  security: string;
  inUse: boolean;
  saved: boolean;
}

export interface ISavedNetwork {
  name: string;
  ssid: string;
}

export interface IWifiStatus {
  available: boolean;
  device: string;
  state: string;
  connected: boolean;
  connection: string;
  ip: string;
  hotspot: boolean;
  hotspotSSID: string;
  hostname: string;
}

let device: string | null = null;
let hotspotActive = false;
let cachedNetworks: IWifiNetwork[] = [];
let busy = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function exec(cmd: string, args: string[], timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).trim()));
      else resolve(String(stdout));
    });
  });
}

const nmcli = (args: string[], timeout?: number) => exec("nmcli", args, timeout);

// Splits a line of `nmcli -t` output on unescaped colons.
function splitTerse(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && i + 1 < line.length) current += line[++i];
    else if (c === ":") {
      fields.push(current);
      current = "";
    } else current += c;
  }
  fields.push(current);
  return fields;
}

const lines = (output: string) => output.split("\n").filter((l) => l.trim() !== "");

function hotspotSSID(): string {
  return constants.wifi.hotspotSSID || constants.name + "-setup";
}

function hotspotPassword(): string {
  const password = constants.wifi.hotspotPassword;
  if (password && password.length >= 8 && password.length <= 63) return password;
  console.error("wifi: hotspotPassword must be 8-63 characters, using default");
  return DEFAULT_HOTSPOT_PASSWORD;
}

// Runs fn unless another wifi operation is in progress.
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (busy) throw new Error("Another Wi-Fi operation is in progress, try again shortly.");
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}

async function findDevice(): Promise<string | null> {
  if (device) return device;
  const output = await nmcli(["-t", "-f", "DEVICE,TYPE", "dev"]);
  const wifi = lines(output)
    .map(splitTerse)
    .find(([, type]) => type === "wifi");
  device = wifi ? wifi[0] : null;
  return device;
}

export function isHotspotActive() {
  return hotspotActive;
}

export async function getStatus(): Promise<IWifiStatus> {
  const status: IWifiStatus = {
    available: false,
    device: "",
    state: "",
    connected: false,
    connection: "",
    ip: "",
    hotspot: false,
    hotspotSSID: hotspotSSID(),
    hostname: os.hostname(),
  };

  const dev = await findDevice();
  if (!dev) return status;

  const output = await nmcli(["-t", "-f", "DEVICE,STATE,CONNECTION", "dev"]);
  const row = lines(output)
    .map(splitTerse)
    .find(([name]) => name === dev);
  if (!row) return status;

  status.available = true;
  status.device = dev;
  status.state = row[1];
  status.connection = row[2] || "";
  status.connected = row[1] === "connected";
  status.hotspot = status.connected && status.connection === HOTSPOT_CON;
  hotspotActive = status.hotspot;

  if (status.connected) {
    try {
      const ip = await nmcli(["-g", "IP4.ADDRESS", "dev", "show", dev]);
      status.ip = ip.split(/[|\n]/)[0].trim().split("/")[0];
    } catch (err) {}
  }

  return status;
}

export async function getSavedNetworks(): Promise<ISavedNetwork[]> {
  const output = await nmcli(["-t", "-f", "NAME,TYPE", "con", "show"]);
  const names = lines(output)
    .map(splitTerse)
    .filter(([name, type]) => type === "802-11-wireless" && name !== HOTSPOT_CON)
    .map(([name]) => name);

  const saved: ISavedNetwork[] = [];
  for (const name of names) {
    let ssid = name;
    try {
      ssid = (await nmcli(["-g", "802-11-wireless.ssid", "con", "show", "id", name])).trim() || name;
    } catch (err) {}
    saved.push({ name, ssid });
  }
  return saved;
}

async function scanNow(rescan: boolean): Promise<IWifiNetwork[]> {
  const dev = await findDevice();
  if (!dev) return [];

  const saved = await getSavedNetworks();
  const savedSSIDs = new Set(saved.map((s) => s.ssid));

  const output = await nmcli(
    ["-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY", "dev", "wifi", "list", "ifname", dev, "--rescan", rescan ? "yes" : "auto"],
    45000
  );

  const bySSID = new Map<string, IWifiNetwork>();
  for (const [inUse, ssid, signal, security] of lines(output).map(splitTerse)) {
    if (!ssid) continue; // hidden networks
    const network: IWifiNetwork = {
      ssid,
      signal: Number(signal) || 0,
      security: security && security !== "--" ? security : "",
      inUse: inUse.trim() === "*",
      saved: savedSSIDs.has(ssid),
    };
    const existing = bySSID.get(ssid);
    if (!existing || network.signal > existing.signal || network.inUse) {
      bySSID.set(ssid, { ...network, inUse: network.inUse || (existing && existing.inUse) });
    }
  }

  cachedNetworks = Array.from(bySSID.values()).sort((a, b) => b.signal - a.signal);
  return cachedNetworks;
}

// While the hotspot is up the radio can't scan, so the list cached before the
// hotspot started is returned instead.
export async function scan(rescan = true): Promise<{ networks: IWifiNetwork[]; cached: boolean }> {
  const status = await getStatus();
  if (status.hotspot || busy) {
    const saved = new Set((await getSavedNetworks()).map((s) => s.ssid));
    return {
      networks: cachedNetworks.map((n) => ({ ...n, inUse: false, saved: saved.has(n.ssid) })),
      cached: true,
    };
  }
  return { networks: await scanNow(rescan), cached: false };
}

async function startHotspotUnlocked() {
  const dev = await findDevice();
  if (!dev) throw new Error("No Wi-Fi device found.");

  // Scan before the radio is taken over by the access point.
  try {
    await scanNow(true);
  } catch (err) {
    console.error("wifi: scan before hotspot failed: " + err.message);
  }

  console.log(`wifi: starting hotspot "${hotspotSSID()}" on ${HOTSPOT_IP}`);

  // The profile is (re)written every time so changes to the SSID, password or
  // address in the code/static config are always applied.
  const settings = [
    // Never bring the hotspot up by itself at boot; the fallback logic decides that.
    "connection.autoconnect", "no",
    "connection.interface-name", dev,
    "802-11-wireless.mode", "ap",
    "802-11-wireless.band", "bg",
    "802-11-wireless.ssid", hotspotSSID(),
    "802-11-wireless-security.key-mgmt", "wpa-psk",
    "802-11-wireless-security.proto", "rsn",
    "802-11-wireless-security.pairwise", "ccmp",
    "802-11-wireless-security.group", "ccmp",
    "802-11-wireless-security.psk", hotspotPassword(),
    // "shared" makes NetworkManager run DHCP and DNS (dnsmasq) for the clients.
    "ipv4.method", "shared",
    "ipv4.addresses", `${HOTSPOT_IP}/${HOTSPOT_PREFIX}`,
    "ipv6.method", "disabled",
  ];

  const profiles = lines(await nmcli(["-t", "-f", "NAME", "con", "show"])).map((l) => splitTerse(l)[0]);
  if (profiles.indexOf(HOTSPOT_CON) !== -1) {
    await nmcli(["con", "modify", HOTSPOT_CON, ...settings]);
  } else {
    await nmcli(["con", "add", "type", "wifi", "ifname", dev, "con-name", HOTSPOT_CON, "ssid", hotspotSSID(), ...settings]);
  }

  await nmcli(["--wait", "30", "con", "up", "id", HOTSPOT_CON, "ifname", dev], 45000);
  hotspotActive = true;
}

async function stopHotspotUnlocked() {
  console.log("wifi: stopping hotspot");
  try {
    await nmcli(["con", "down", "id", HOTSPOT_CON]);
  } catch (err) {}
  hotspotActive = false;
}

export const startHotspot = () => exclusive(startHotspotUnlocked);
export const stopHotspot = () => exclusive(stopHotspotUnlocked);

async function waitForConnection(seconds: number): Promise<boolean> {
  for (let i = 0; i < seconds; i += 2) {
    await sleep(2000);
    const status = await getStatus();
    if (status.connected && !status.hotspot) return true;
  }
  return false;
}

export function connect(ssid: string, password: string, hidden: boolean): Promise<IWifiStatus> {
  return exclusive(async () => {
    if (!ssid) throw new Error("No network name given.");
    const dev = await findDevice();
    if (!dev) throw new Error("No Wi-Fi device found.");

    console.log(`wifi: connecting to "${ssid}"`);
    const startStatus = await getStatus();
    if (startStatus.hotspot) {
      await stopHotspotUnlocked();
      await sleep(3000);
    }

    const existing = (await getSavedNetworks()).find((s) => s.ssid === ssid);

    try {
      if (existing && !password) {
        await nmcli(["--wait", "45", "con", "up", "id", existing.name, "ifname", dev], 60000);
      } else {
        // A new password replaces the saved profile for this network.
        if (existing) await nmcli(["con", "delete", "id", existing.name]);

        try {
          await nmcli(["dev", "wifi", "rescan", "ifname", dev]);
          await sleep(4000);
        } catch (err) {} // rescan can be refused right after a mode switch

        const args = ["--wait", "45", "dev", "wifi", "connect", ssid];
        if (password) args.push("password", password);
        args.push("ifname", dev);
        if (hidden) args.push("hidden", "yes");
        await nmcli(args, 60000);
      }
    } catch (err) {
      console.error(`wifi: connecting to "${ssid}" failed: ${err.message}`);

      // Don't keep a profile with a wrong password around.
      if (!existing || password) {
        try {
          await nmcli(["con", "delete", "id", ssid]);
        } catch (e) {}
      }

      // Give NetworkManager a chance to fall back to a previous network,
      // otherwise bring the hotspot back so the unit stays reachable.
      if (!(await waitForConnection(15))) {
        try {
          await startHotspotUnlocked();
        } catch (e) {
          console.error("wifi: restarting hotspot failed: " + e.message);
        }
      }
      throw err;
    }

    return getStatus();
  });
}

export function forget(name: string) {
  return exclusive(async () => {
    await nmcli(["con", "delete", "id", name]);
  });
}

async function connectedStations(dev: string): Promise<number> {
  try {
    const output = await exec("iw", ["dev", dev, "station", "dump"]);
    return lines(output).filter((l) => l.startsWith("Station")).length;
  } catch (err) {
    return 1; // unknown, assume someone is connected so we don't disrupt them
  }
}

async function fallbackCheck() {
  if (busy) return;
  try {
    const status = await getStatus();
    if (!status.available || status.connected) return;

    await exclusive(startHotspotUnlocked);
  } catch (err) {
    console.error("wifi: fallback check failed: " + err.message);
  }
}

// If the unit booted before its router was up it would otherwise stay in
// hotspot mode forever. Periodically drop the hotspot (only when nobody is
// using it) and let NetworkManager try the saved networks again.
async function retrySavedNetworks() {
  if (busy) return;
  try {
    const status = await getStatus();
    if (!status.hotspot) return;
    if ((await getSavedNetworks()).length === 0) return;
    if ((await connectedStations(status.device)) > 0) return;

    await exclusive(async () => {
      console.log("wifi: retrying saved networks");
      await stopHotspotUnlocked();
      if (!(await waitForConnection(30))) await startHotspotUnlocked();
    });
  } catch (err) {
    console.error("wifi: retry failed: " + err.message);
  }
}

// Started from server.ts like the other modules, when enabledModules.wifi is
// set. The socket commands in Realtime.ts use the named exports above.
function writeCaptiveDns() {
  const content = `address=/#/${HOTSPOT_IP}\n`;
  try {
    if (fs.existsSync(CAPTIVE_DNS_FILE) && fs.readFileSync(CAPTIVE_DNS_FILE, "utf8") === content) return;
    fs.mkdirSync(path.dirname(CAPTIVE_DNS_FILE), { recursive: true });
    fs.writeFileSync(CAPTIVE_DNS_FILE, content);
  } catch (err) {
    console.error("wifi: writing captive portal DNS rule failed: " + err.message);
  }
}

function WifiModule(config, store: IStore) {
  writeCaptiveDns();

  if (constants.wifi.hotspotFallback) {
    const delay = Math.max(10, constants.wifi.fallbackDelay || 60) * 1000;
    setTimeout(fallbackCheck, delay);
    setInterval(retrySavedNetworks, RETRY_INTERVAL);
  }

  return {};
}

export default WifiModule;
