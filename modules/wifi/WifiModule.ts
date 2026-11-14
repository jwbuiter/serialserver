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

export interface IIpConfig {
  method: "auto" | "manual";
  address: string;
  prefix: number;
  gateway: string;
  dns: string[];
}

export interface ISavedNetwork {
  name: string;
  ssid: string;
  ipConfig: IIpConfig;
  priority: number;
}

export interface IEthernetStatus {
  available: boolean;
  device: string;
  state: string;
  connected: boolean;
  connection: string;
  ip: string;
  ipConfig: IIpConfig | null;
  lease: IIpConfig | null;
}

export interface IWifiStatus {
  available: boolean;
  device: string;
  state: string;
  connected: boolean;
  connection: string;
  ip: string;
  ipConfig: IIpConfig | null;
  // Current address, subnet, gateway and DNS of the interface (null when it has none).
  lease: IIpConfig | null;
  hotspot: boolean;
  hotspotSSID: string;
  hostname: string;
  ethernet?: IEthernetStatus;
}

const DHCP: IIpConfig = { method: "auto", address: "", prefix: 24, gateway: "", dns: [] };
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

let device: string | null = null;
let ethernetDevice: string | null | undefined = undefined;
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
  return constants.name;
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

async function findEthernetDevice(): Promise<string | null> {
  if (ethernetDevice !== undefined) return ethernetDevice;
  const output = await nmcli(["-t", "-f", "DEVICE,TYPE", "dev"]);
  const eth = lines(output)
    .map(splitTerse)
    .find(([, type]) => type === "ethernet");
  ethernetDevice = eth ? eth[0] : null;
  return ethernetDevice;
}

export function isHotspotActive() {
  return hotspotActive;
}

// --- IP settings -------------------------------------------------------------

// Reads settings of a saved connection profile as a {field: value} map.
async function readConnection(name: string, fields: string[]): Promise<{ [field: string]: string }> {
  const output = await nmcli(["-t", "-f", fields.join(","), "con", "show", "id", name]);
  const result: { [field: string]: string } = {};
  for (const line of lines(output)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const value = line.slice(i + 1).trim();
    result[line.slice(0, i)] = value === "--" ? "" : value;
  }
  return result;
}

const IP_FIELDS = ["ipv4.method", "ipv4.addresses", "ipv4.gateway", "ipv4.dns"];

function parseIpConfig(fields: { [field: string]: string }): IIpConfig {
  if (fields["ipv4.method"] !== "manual") return { ...DHCP };
  const [address, prefix] = (fields["ipv4.addresses"] || "").split(",")[0].trim().split("/");
  return {
    method: "manual",
    address: address || "",
    prefix: Number(prefix) || 24,
    gateway: fields["ipv4.gateway"] || "",
    dns: (fields["ipv4.dns"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s),
  };
}

async function readIpConfig(name: string): Promise<IIpConfig | null> {
  try {
    return parseIpConfig(await readConnection(name, IP_FIELDS));
  } catch (err) {
    return null;
  }
}

// Validates IP settings coming from the client.
function validateIpConfig(config): IIpConfig {
  if (!config || config.method !== "manual") return { ...DHCP };

  const address = String(config.address || "").trim();
  if (!IPV4.test(address)) throw new Error(`Invalid IP address "${address}".`);

  const prefix = Number(config.prefix);
  if (!Number.isInteger(prefix) || prefix < 1 || prefix > 32) throw new Error("Invalid subnet mask.");

  const gateway = String(config.gateway || "").trim();
  if (gateway && !IPV4.test(gateway)) throw new Error(`Invalid gateway "${gateway}".`);

  const dns = (Array.isArray(config.dns) ? config.dns : String(config.dns || "").split(/[\s,]+/))
    .map((s) => String(s).trim())
    .filter((s) => s);
  for (const server of dns) {
    if (!IPV4.test(server)) throw new Error(`Invalid DNS server "${server}".`);
  }

  return { method: "manual", address, prefix, gateway, dns };
}

// nmcli settings for "con add" / "con modify".
function ipConfigArgs(config: IIpConfig): string[] {
  if (config.method === "auto") {
    return ["ipv4.method", "auto", "ipv4.addresses", "", "ipv4.gateway", "", "ipv4.dns", ""];
  }
  return [
    "ipv4.method", "manual",
    "ipv4.addresses", `${config.address}/${config.prefix}`,
    "ipv4.gateway", config.gateway,
    "ipv4.dns", config.dns.join(","),
  ];
}

// --- status ------------------------------------------------------------------

async function deviceRow(dev: string): Promise<{ state: string; connection: string } | null> {
  const output = await nmcli(["-t", "-f", "DEVICE,STATE,CONNECTION", "dev"]);
  const row = lines(output)
    .map(splitTerse)
    .find(([name]) => name === dev);
  return row ? { state: row[1], connection: row[2] || "" } : null;
}

// The addresses dev actually has right now (from DHCP or static settings), or
// null when it has none. Used to prefill the static IP form.
async function deviceLease(dev: string): Promise<IIpConfig | null> {
  try {
    const output = await nmcli(["-t", "-f", "IP4", "dev", "show", dev]);
    let address = "";
    let prefix = 24;
    let gateway = "";
    const dns: string[] = [];
    for (const line of lines(output)) {
      const i = line.indexOf(":");
      const key = line.slice(0, i).replace(/\[\d+\]$/, "");
      const value = line.slice(i + 1).trim();
      if (!value || value === "--") continue;
      if (key === "IP4.ADDRESS" && !address) {
        [address, prefix] = [value.split("/")[0], Number(value.split("/")[1]) || 24];
      } else if (key === "IP4.GATEWAY") gateway = value;
      else if (key === "IP4.DNS") dns.push(value);
    }
    return address ? { method: "auto", address, prefix, gateway, dns } : null;
  } catch (err) {
    return null;
  }
}

// The saved Ethernet profile for dev: the active one, otherwise the first one
// bound to dev (or to no interface at all).
async function findEthernetProfile(dev: string): Promise<string> {
  const row = await deviceRow(dev);
  if (row && row.state === "connected" && row.connection) return row.connection;

  const output = await nmcli(["-t", "-f", "NAME,TYPE", "con", "show"]);
  const names = lines(output)
    .map(splitTerse)
    .filter(([, type]) => type === "802-3-ethernet")
    .map(([name]) => name);
  for (const name of names) {
    try {
      const fields = await readConnection(name, ["connection.interface-name"]);
      const iface = fields["connection.interface-name"];
      if (!iface || iface === dev) return name;
    } catch (err) { }
  }
  return "";
}

async function getEthernetStatus(): Promise<IEthernetStatus> {
  const status: IEthernetStatus = {
    available: false,
    device: "",
    state: "",
    connected: false,
    connection: "",
    ip: "",
    ipConfig: null,
    lease: null,
  };

  const dev = await findEthernetDevice();
  if (!dev) return status;
  const row = await deviceRow(dev);
  if (!row) return status;

  status.available = true;
  status.device = dev;
  status.state = row.state;
  status.connected = row.state === "connected";
  if (status.connected) {
    status.lease = await deviceLease(dev);
    status.ip = status.lease ? status.lease.address : "";
  }

  status.connection = await findEthernetProfile(dev);
  status.ipConfig = status.connection ? await readIpConfig(status.connection) : { ...DHCP };
  return status;
}

// With detailed set, also reads the IP settings and the Ethernet status
// (used by the dialog; the internal checks only need the basics).
export async function getStatus(detailed = false): Promise<IWifiStatus> {
  const status: IWifiStatus = {
    available: false,
    device: "",
    state: "",
    connected: false,
    connection: "",
    ip: "",
    ipConfig: null,
    lease: null,
    hotspot: false,
    hotspotSSID: hotspotSSID(),
    hostname: os.hostname(),
  };

  if (detailed) status.ethernet = await getEthernetStatus();

  const dev = await findDevice();
  if (!dev) return status;

  const row = await deviceRow(dev);
  if (!row) return status;

  status.available = true;
  status.device = dev;
  status.state = row.state;
  status.connection = row.connection;
  status.connected = row.state === "connected";
  status.hotspot = status.connected && status.connection === HOTSPOT_CON;
  hotspotActive = status.hotspot;

  if (status.connected) {
    const lease = await deviceLease(dev);
    status.ip = lease ? lease.address : "";
    if (detailed && !status.hotspot) {
      status.lease = lease;
      status.ipConfig = await readIpConfig(status.connection);
    }
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
    let ipConfig: IIpConfig = { ...DHCP };
    let priority = 0;
    try {
      const fields = await readConnection(name, [
        "802-11-wireless.ssid",
        "connection.autoconnect-priority",
        ...IP_FIELDS,
      ]);
      ssid = fields["802-11-wireless.ssid"] || name;
      priority = Number(fields["connection.autoconnect-priority"]) || 0;
      ipConfig = parseIpConfig(fields);
    } catch (err) { }
    saved.push({ name, ssid, ipConfig, priority });
  }
  // Most preferred first, the order the dialog shows them in.
  return saved.sort((a, b) => b.priority - a.priority);
}

// --- preference order ------------------------------------------------------------
// When several saved networks are in range, NetworkManager joins the one with
// the highest autoconnect-priority.

async function setPriorities(names: string[]) {
  for (let i = 0; i < names.length; i++) {
    await nmcli(["con", "modify", "id", names[i], "connection.autoconnect-priority", String(names.length - i)]);
  }
}

// names: all saved networks, most preferred first.
export function setNetworkOrder(names: string[]) {
  return exclusive(async () => {
    const saved = (await getSavedNetworks()).map((s) => s.name);
    const order = names.filter((name) => saved.indexOf(name) !== -1);
    // Networks the client didn't know about (added meanwhile) go last.
    for (const name of saved) if (order.indexOf(name) === -1) order.push(name);
    await setPriorities(order);
    return {};
  });
}

// Makes the network the user just connected to the most preferred one.
async function makeMostPreferred(ssid: string) {
  const saved = await getSavedNetworks();
  const target = saved.find((s) => s.ssid === ssid);
  if (!target) return;
  await setPriorities([target.name, ...saved.filter((s) => s !== target).map((s) => s.name)]);
}

// Changes the IP settings of the current Wi-Fi network or of the Ethernet port.
// The new settings are applied a second after replying, since the client may
// be connected through that interface and lose the page.
export function setIpConfig(target: string, rawConfig): Promise<{ applied: boolean }> {
  return exclusive(async () => {
    const config = validateIpConfig(rawConfig);
    const isWifi = target === "wifi";
    const dev = isWifi ? await findDevice() : await findEthernetDevice();
    if (!dev) throw new Error(`No ${isWifi ? "Wi-Fi" : "Ethernet"} device found.`);

    const row = await deviceRow(dev);
    const active = !!row && row.state === "connected";
    let profile: string;

    if (isWifi) {
      if (!active || !row.connection || row.connection === HOTSPOT_CON) {
        throw new Error("Connect to a Wi-Fi network first.");
      }
      profile = row.connection;
    } else {
      profile = await findEthernetProfile(dev);
      if (!profile) {
        profile = "serialserver-" + dev;
        await nmcli(["con", "add", "type", "ethernet", "ifname", dev, "con-name", profile]);
      }
    }

    console.log(`wifi: setting IP settings of "${profile}" to ${JSON.stringify(config)}`);
    await nmcli(["con", "modify", "id", profile, ...ipConfigArgs(config)]);

    if (active) {
      setTimeout(() => {
        nmcli(["dev", "reapply", dev])
          .catch(() => nmcli(["--wait", "30", "con", "up", "id", profile, "ifname", dev], 45000))
          .catch((err) => console.error(`wifi: applying IP settings of "${profile}" failed: ${err.message}`));
      }, 1000);
    }

    return { applied: active };
  });
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
  } catch (err) { }
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

// WPA3-only networks need SAE, everything else with a password uses WPA-PSK.
function keyMgmt(security: string): string {
  const s = (security || "").toUpperCase();
  return s.indexOf("WPA3") !== -1 && s.indexOf("WPA2") === -1 && s.indexOf("WPA1") === -1 ? "sae" : "wpa-psk";
}

// rawIpConfig is only given when the user changed the IP settings in the
// connect form; otherwise a saved network keeps its own settings.
export function connect(
  ssid: string,
  password: string,
  hidden: boolean,
  security: string,
  rawIpConfig
): Promise<IWifiStatus> {
  return exclusive(async () => {
    if (!ssid) throw new Error("No network name given.");
    const ipConfig = rawIpConfig ? validateIpConfig(rawIpConfig) : null;
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
        if (ipConfig) await nmcli(["con", "modify", "id", existing.name, ...ipConfigArgs(ipConfig)]);
        await nmcli(["--wait", "45", "con", "up", "id", existing.name, "ifname", dev], 60000);
      } else {
        // A new password replaces the saved profile for this network.
        if (existing) await nmcli(["con", "delete", "id", existing.name]);

        try {
          await nmcli(["dev", "wifi", "rescan", "ifname", dev]);
          await sleep(4000);
        } catch (err) { } // rescan can be refused right after a mode switch

        if (ipConfig && ipConfig.method === "manual") {
          // "dev wifi connect" can't take IP settings, and on a network without
          // DHCP it would time out, so the profile is created up front.
          const args = ["con", "add", "type", "wifi", "ifname", dev, "con-name", ssid, "ssid", ssid];
          if (password) args.push("wifi-sec.key-mgmt", keyMgmt(security), "wifi-sec.psk", password);
          if (hidden) args.push("802-11-wireless.hidden", "yes");
          args.push(...ipConfigArgs(ipConfig));
          await nmcli(args);
          await nmcli(["--wait", "45", "con", "up", "id", ssid, "ifname", dev], 60000);
        } else {
          const args = ["--wait", "45", "dev", "wifi", "connect", ssid];
          if (password) args.push("password", password);
          args.push("ifname", dev);
          if (hidden) args.push("hidden", "yes");
          await nmcli(args, 60000);
        }
      }
    } catch (err) {
      console.error(`wifi: connecting to "${ssid}" failed: ${err.message}`);

      // Don't keep a profile with a wrong password around.
      if (!existing || password) {
        try {
          await nmcli(["con", "delete", "id", ssid]);
        } catch (e) { }
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

    try {
      await makeMostPreferred(ssid);
    } catch (err) {
      console.error(`wifi: updating network order failed: ${err.message}`);
    }

    return getStatus(true);
  });
}

export function forget(name: string) {
  return exclusive(async () => {
    await nmcli(["con", "delete", "id", name]);
  });
}

// --- network reset -------------------------------------------------------------

// Resets the network settings to the factory defaults: removes all Wi-Fi and
// Ethernet profiles (saved networks, static IPs), sets Ethernet to DHCP and
// adds the default Wi-Fi networks from the static config. Triggered by holding
// the reset button while the application runs.
async function resetNetwork() {
  // Let a running operation (e.g. a connect) finish first.
  for (let waited = 0; busy && waited < 120000; waited += 500) await sleep(500);

  await exclusive(async () => {
    console.log("wifi: resetting network settings");

    const output = await nmcli(["-t", "-f", "UUID,TYPE,NAME", "con", "show"]);
    for (const [uuid, type, name] of lines(output).map(splitTerse)) {
      if (type !== "802-11-wireless" && type !== "802-3-ethernet") continue;
      try {
        await nmcli(["con", "delete", "uuid", uuid]);
        console.log(`wifi: removed "${name}"`);
      } catch (err) {
        console.error(`wifi: removing "${name}" failed: ${err.message}`);
      }
    }
    hotspotActive = false;

    const eth = await findEthernetDevice();
    if (eth) {
      try {
        await nmcli(["con", "add", "type", "ethernet", "ifname", eth, "con-name", "serialserver-" + eth]);
      } catch (err) {
        console.error("wifi: adding Ethernet profile failed: " + err.message);
      }
    }

    const dev = await findDevice();
    if (!dev) return;

    // Earlier entries get a higher priority when several are in range.
    const networks = (constants.wifi.defaultNetworks || []).filter((n) => n && n.ssid);
    for (let i = 0; i < networks.length; i++) {
      const { ssid, password } = networks[i];
      const args = ["con", "add", "type", "wifi", "ifname", dev, "con-name", ssid, "ssid", ssid];
      args.push("connection.autoconnect-priority", String(networks.length - i));
      if (password) args.push("wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.psk", password);
      try {
        await nmcli(args);
        console.log(`wifi: added default network "${ssid}"`);
      } catch (err) {
        console.error(`wifi: adding default network "${ssid}" failed: ${err.message}`);
      }
    }

    try {
      await nmcli(["dev", "wifi", "rescan", "ifname", dev]);
      await sleep(4000);
    } catch (err) {}

    // Connect to the first default network that works, otherwise start the
    // hotspot so the unit can still be set up.
    for (const { ssid } of networks) {
      try {
        await nmcli(["--wait", "30", "con", "up", "id", ssid, "ifname", dev], 45000);
        console.log(`wifi: connected to "${ssid}"`);
        return;
      } catch (err) {
        console.log(`wifi: "${ssid}" not available: ${err.message}`);
      }
    }
    await startHotspotUnlocked();
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

  const delay = Math.max(10, constants.wifi.fallbackDelay || 60) * 1000;
  setTimeout(fallbackCheck, delay);
  setInterval(retrySavedNetworks, RETRY_INTERVAL);

  store.listen((lastAction) => {
    if (lastAction.type === "NETWORK_RESET") {
      resetNetwork().catch((err) => console.error("wifi: network reset failed: " + err.message));
    }
  });

  return {};
}

export default WifiModule;
