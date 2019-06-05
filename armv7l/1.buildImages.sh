#!/bin/bash
PROJNAME=test-local-project
NETNAME=$PROJNAME-network
#export NETNAME=test-local-project-network
ARCH=armv7l

LOCALARCH=$(uname -m)

if [ "$ARCH" == "$LOCALARCH" ]; then
    echo "Correct architecture"
else
    echo "This system reports a $LOCALARCH CPU arch. This script is intended for $ARCH. Exiting"
    exit 1
fi

rm -rf ~/.ssh

chmod 600 cluster/ssh/id_rsa
chmod 600 cluster/ssh/id_rsa.pub

# To enable push/pull from this registry:
#   -  Create or modify /etc/docker/daemon.json:
#      { "insecure-registries":["mesh-network-registry:5000"] }
#   -  sudo service docker restart



echo "Building base image"
docker build --compress -t mesh-network-registry:5000/alpine-mpich-armv7l:base base/
echo "Building onbuild image"
docker build --compress -t mesh-network-registry:5000/alpine-mpich-armv7l:onbuild onbuild/
echo "Building cluster image"
docker build --compress  -t mesh-network-registry:5000/alpine-mpich-armv7l:cluster cluster/

#important: disabled push everywhere else so keep it here
docker push mesh-network-registry:5000/alpine-mpich-armv7l:base
docker push mesh-network-registry:5000/alpine-mpich-armv7l:onbuild
docker push mesh-network-registry:5000/alpine-mpich-armv7l:cluster