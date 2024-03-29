#!/bin/bash
git config --global --add safe.directory /srv/serialserver
git reset --hard
git pull
npm install --unsafe-perm
npm run build
/bin/cp services/* /etc/systemd/system/
systemctl daemon-reload
rm -r client2
git clone https://github.com/jwbuiter/serialserverclient2.git --depth 1
mv serialserverclient2 client2

if [ -f "config.static.json" ]
then
	echo "static config already exists."
else
  cp config.static.template.json config.static.json
	echo "copying static config"
fi