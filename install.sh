#!/bin/bash
apt-get update
apt-get upgrade -y
mkdir tmp
cd tmp
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
cd ..
rm -rf tmp
npm install
