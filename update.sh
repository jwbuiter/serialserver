#!/bin/bash
git reset --hard
git pull
npm install
[ -e /etc/systemd/system/serialserver.service ] && rm /etc/systemd/system/serialserver.service
cp serialserver.service /etc/systemd/system/
systemctl daemon-reload
rm -r client2
git clone https://github.com/jwbuiter/serialserverclient2.git
mv serialserverclient2 client2

if [ -f "config.static.js" ]
then
	echo "static config already exists."
else
  cp config.static.template.js config.static.js
	echo "copying static config"
fi