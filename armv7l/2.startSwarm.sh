#!/bin/bash
PROJNAME=test-local-project
NETNAME=$PROJNAME-network
#export NETNAME=test-local-project-network
ARCH=armv7l
MESH_HOST=10.0.0.11
OVERLAY_NET=20.0.0.
MASTER_IP=1
CIDR=30 #only 4 IPs
ARCH=armv7l

LOCALARCH=$(uname -m)

if [ "$ARCH" == "$LOCALARCH" ]; then
    echo "Correct architecture"
else
    echo "This system reports a $LOCALARCH CPU arch. This script is intended for $ARCH. Exiting"
    exit 1
fi

docker swarm init --advertise-addr $MESH_HOST 

# docker network inspect $NETNAME | grep "IPv4Address"| grep -E -o "([0-9]{1,3}[\.]){3}[0-9]{1,3}"

# ./swarm.sh help
