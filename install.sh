#!/bin/bash
git clone https://github.com/jwbuiter/serialserverclient2.git
mv serialserverclient2 client2
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
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

if [ -f "config.static.json" ]
then
	echo "static config already exists."
else
  cp config.static.template.json config.static.json
	echo "copying static config"
fi
