#!/bin/bash
# Prepares the Pi for the Wi-Fi dialog and setup hotspot (modules/wifi).
#
# - Installs NetworkManager, dnsmasq-base (DHCP/DNS for the hotspot) and iw.
# - Sets the Wi-Fi country if it isn't set yet.
#   (The captive portal DNS rule is written by modules/wifi on startup, so it
#   always matches the hotspot address in the code.)
# - On systems that still use dhcpcd (Raspberry Pi OS Bullseye and older):
#   migrates the saved Wi-Fi networks from wpa_supplicant.conf and static IP
#   settings from dhcpcd.conf to NetworkManager, then switches to
#   NetworkManager (same as raspi-config > Advanced > Network Config).
#   The switch takes effect after a reboot.
#
# Safe to run more than once. To switch back to dhcpcd:
#   sudo systemctl disable NetworkManager && sudo systemctl enable dhcpcd && sudo reboot

set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "setup_wifi.sh must be run as root"
  exit 1
fi

CONNECTIONS_DIR=/etc/NetworkManager/system-connections

if systemctl is-enabled --quiet dhcpcd 2> /dev/null; then
  SWITCH=1
else
  SWITCH=0
fi

if [ "$SWITCH" -eq 1 ]; then
  if ! command -v python3 > /dev/null; then
    echo "python3 not found, can't migrate network settings. Not switching to NetworkManager."
    exit 1
  fi

  # Installing network-manager would start it right away and make it fight
  # dhcpcd over the interfaces (dropping SSH). Block service starts during
  # the install; NetworkManager takes over on the next boot instead.
  printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d
  chmod +x /usr/sbin/policy-rc.d
  trap 'rm -f /usr/sbin/policy-rc.d' EXIT
  apt-get install -y network-manager dnsmasq-base iw
  rm -f /usr/sbin/policy-rc.d
  trap - EXIT
else
  apt-get install -y network-manager dnsmasq-base iw
fi

# The radio stays blocked until a Wi-Fi country is set. Only set it when it
# isn't set yet; override with: WIFI_COUNTRY=DE ./setup_wifi.sh
WIFI_COUNTRY="${WIFI_COUNTRY:-NL}"
if command -v raspi-config > /dev/null && ! raspi-config nonint get_wifi_country > /dev/null 2>&1; then
  echo "Setting Wi-Fi country to $WIFI_COUNTRY"
  raspi-config nonint do_wifi_country "$WIFI_COUNTRY"
fi

if [ "$SWITCH" -eq 0 ]; then
  echo "NetworkManager is already in use, Wi-Fi setup ready."
  exit 0
fi

echo "Migrating network settings to NetworkManager..."
mkdir -p "$CONNECTIONS_DIR"

python3 - "$CONNECTIONS_DIR" << 'EOF'
import os
import re
import sys
import uuid

connections_dir = sys.argv[1]
WPA_CONF = "/etc/wpa_supplicant/wpa_supplicant.conf"
DHCPCD_CONF = "/etc/dhcpcd.conf"


def esc(value):
    """Escape a value for a GKeyFile (NetworkManager keyfile)."""
    value = value.replace("\\", "\\\\")
    if value.startswith(" "):
        value = "\\s" + value[1:]
    return value


def unquote(value):
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    return None


def write_connection(name, sections):
    filename = re.sub(r"[^A-Za-z0-9._-]", "_", name) + ".nmconnection"
    path = os.path.join(connections_dir, filename)
    if os.path.exists(path):
        print("  %s: already exists, skipped" % name)
        return
    lines = []
    for section, entries in sections:
        lines.append("[%s]" % section)
        for key, value in entries:
            lines.append("%s=%s" % (key, value))
        lines.append("")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write("\n".join(lines))
    print("  %s: migrated" % name)


def ipv4_section(static):
    if not static or "ip_address" not in static:
        return ("ipv4", [("method", "auto")])
    address = static["ip_address"].split()[0]
    if "/" not in address:
        address += "/24"
    routers = static.get("routers", "").split()
    entries = [("method", "manual"), ("address1", address + ("," + routers[0] if routers else ""))]
    dns = static.get("domain_name_servers", "").split()
    if dns:
        entries.append(("dns", ";".join(dns) + ";"))
    return ("ipv4", entries)


# --- static IP settings from dhcpcd.conf -----------------------------------
static = {}
try:
    current = None
    with open(DHCPCD_CONF) as f:
        for raw in f:
            line = raw.split("#", 1)[0].strip()
            if line.startswith("interface "):
                current = line.split()[1]
                static.setdefault(current, {})
            elif line.startswith("profile "):
                current = None  # fallback profiles are not migrated
            elif line.startswith("static ") and current and "=" in line:
                key, value = line[len("static "):].split("=", 1)
                static[current][key.strip()] = value.strip()
except FileNotFoundError:
    pass

for iface, settings in static.items():
    if iface == "wlan0" or "ip_address" not in settings:
        continue
    write_connection(
        "serialserver-" + iface,
        [
            ("connection", [("id", "serialserver-" + iface), ("uuid", str(uuid.uuid4())),
                            ("type", "ethernet"), ("interface-name", iface)]),
            ("ethernet", []),
            ipv4_section(settings),
            ("ipv6", [("method", "auto")]),
        ],
    )

# --- saved Wi-Fi networks from wpa_supplicant.conf --------------------------
try:
    with open(WPA_CONF) as f:
        wpa_text = f.read()
except FileNotFoundError:
    wpa_text = ""

for block in re.findall(r"network\s*=\s*\{(.*?)\n\s*\}", wpa_text, re.S):
    fields = {}
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        fields[key.strip()] = value.strip()

    raw_ssid = fields.get("ssid", "")
    ssid = unquote(raw_ssid)
    if ssid is None:
        try:
            ssid = bytes.fromhex(raw_ssid).decode("utf-8")
        except ValueError:
            print("  network with ssid %s: can't decode, skipped" % raw_ssid)
            continue
    if not ssid or ";" in ssid:
        print("  network '%s': unsupported SSID, skipped (add it again with the Wi-Fi dialog)" % ssid)
        continue
    if fields.get("disabled") == "1":
        continue

    key_mgmt = fields.get("key_mgmt", "WPA-PSK")
    sections = [
        ("connection", [("id", esc(ssid)), ("uuid", str(uuid.uuid4())), ("type", "wifi")]
                       + ([("autoconnect-priority", fields["priority"])] if "priority" in fields else [])),
        ("wifi", [("mode", "infrastructure"), ("ssid", esc(ssid))]
                 + ([("hidden", "true")] if fields.get("scan_ssid") == "1" else [])),
    ]
    if key_mgmt == "NONE":
        if any(k.startswith("wep_key") for k in fields):
            print("  network '%s': WEP is not supported, skipped" % ssid)
            continue
    elif "WPA-PSK" in key_mgmt or "SAE" in key_mgmt:
        raw_psk = fields.get("psk", "")
        psk = unquote(raw_psk)
        if psk is None:
            psk = raw_psk  # 64 hex digits, NetworkManager accepts it as-is
        if not psk:
            print("  network '%s': no password found, skipped" % ssid)
            continue
        sections.append(("wifi-security", [("key-mgmt", "sae" if key_mgmt.strip() == "SAE" else "wpa-psk"),
                                           ("psk", esc(psk))]))
    else:
        print("  network '%s': %s is not supported, skipped" % (ssid, key_mgmt))
        continue

    sections.append(ipv4_section(static.get("wlan0")))
    sections.append(("ipv6", [("method", "auto")]))
    write_connection(ssid, sections)
EOF

systemctl disable dhcpcd
systemctl enable NetworkManager

echo ""
echo "Switched to NetworkManager. Reboot to apply: sudo reboot"
