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

rm -rf ~/.ssh

chmod 600 cluster/ssh/id_rsa
chmod 600 cluster/ssh/id_rsa.pub

echo "Building base image"
docker build --compress -t pietersynthesis/alpine-mpich-x86_64:base base/
echo "Building onbuild image"
docker build --compress -t pietersynthesis/alpine-mpich-x86_64:onbuild onbuild/
echo "Building cluster image"
docker build --compress  -t pietersynthesis/alpine-mpich-x86_64:cluster cluster/

#important: disabled push everywhere else so keep it here
docker push pietersynthesis/alpine-mpich-x86_64:base
docker push pietersynthesis/alpine-mpich-x86_64:onbuild
docker push pietersynthesis/alpine-mpich-x86_64:cluster