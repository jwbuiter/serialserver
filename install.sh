#!/bin/bash
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
apt-get install -y minicom
cd ..
rm -rf tmp
npm install
adduser --disabled-password --gecos "" serialserver
chown -R serialserver:serialserver /srv/serialserver
chmod 777 /srv/serialserver
[ -e /etc/systemd/system/serialserver.service ] && rm /etc/systemd/system/serialserver.service
cp serialserver.service /etc/systemd/system/
systemctl enable serialserver
systemctl enable ssh
systemctl start ssh
raspi-config --expand-rootfs
