#!/bin/bash
PROJNAME=test-local-project
NETNAME=$PROJNAME-network
#export NETNAME=test-local-project-network
ARCH=x86_64

LOCALARCH=$(uname -m)

if [ "$ARCH" == "$LOCALARCH" ]; then
    echo "Correct architecture"
else
    echo "This system reports a $LOCALARCH CPU arch. This script is intended for $ARCH. Exiting"
    exit 1
fi

cd cluster

./swarm.sh config set \
    IMAGE_TAG=mesh-network-registry:5000/alpine-mpich-x86_64:cluster      \
    PROJECT_NAME=$PROJNAME  \
    NETWORK_NAME=$NETNAME    \
    NETWORK_SUBNET=20.0.0.0/28   \
    SSH_ADDR=10.0.0.1      \
    SSH_PORT=2222

./swarm.sh up size=3
# ./swarm.sh login
