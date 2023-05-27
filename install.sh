#!/bin/bash
git clone https://github.com/jwbuiter/serialserverclient2.git --depth 1
mv serialserverclient2 client2
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
apt-get install -y nodejs bluez-tools
cd ..
rm -rf tmp
npm install --unsafe-perm
npm run build
adduser --disabled-password --gecos "" serialserver
chown -R serialserver:serialserver /srv/serialserver
chmod 777 /srv/serialserver
/bin/cp services/* /etc/systemd/system/
systemctl daemon-reload
systemctl enable bt-agent
systemctl enable serialserver
systemctl enable rfcomm
systemctl enable ssh
systemctl start ssh
systemctl restart bluetooth
systemctl start bt-agent
systemctl start rfcomm

if [ -f "config.static.json" ]
then
	echo "static config already exists."
else
  cp config.static.template.json config.static.json
	echo "copying static config"
fi
