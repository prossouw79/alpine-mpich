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

echo "Building base image"
docker build --compress -t pietersynthesis/alpine-mpich-armv7l:base base/
echo "Building onbuild image"
docker build --compress -t pietersynthesis/alpine-mpich-armv7l:onbuild onbuild/
echo "Building cluster image"
docker build --compress  -t pietersynthesis/alpine-mpich-armv7l:cluster cluster/

docker push pietersynthesis/alpine-mpich-armv7l:base
docker push pietersynthesis/alpine-mpich-armv7l:onbuild
docker push pietersynthesis/alpine-mpich-armv7l:cluster