#!/bin/bash
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
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

if [ -f "config.static.js" ]
then
	echo "static config already exists."
else
  cp config.static.template.js config.static.js
	echo "copying static config"
fi