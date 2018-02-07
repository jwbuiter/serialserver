#!/bin/bash
git reset --hard
git pull
npm install
[ -e /etc/systemd/system/serialserver.service ] && rm /etc/systemd/system/serialserver.service
cp serialserver.service /etc/systemd/system/
systemctl daemon-reload

