#!/bin/sh
set -e

echo "Container's IP address: `awk 'END{print $1}' /etc/hosts`"

cd /backend

make

cd /plugin

mkdir -p defaults 

cd src/py

find -name "*.py" -print0 | xargs -0 cp --parents -t /plugin/defaults 

cd /plugin

mv defaults/main.py .