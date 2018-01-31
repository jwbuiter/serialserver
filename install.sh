#!/bin/bash
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
apt-get install -y minicom
cd ..
rm -rf tmp
npm install

