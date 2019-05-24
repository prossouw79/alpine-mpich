#!/bin/bash
PROJNAME=test-local-project
NETNAME=$PROJNAME-network
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

# docker push pietersynthesis/alpine-mpich-armv7l:base
# docker push pietersynthesis/alpine-mpich-armv7l:onbuild
# docker push pietersynthesis/alpine-mpich-armv7l:cluster

cd cluster

docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker network rm $NETNAME

sudo service docker restart
docker swarm leave -f
docker swarm init


./swarm.sh config set \
    IMAGE_TAG=pietersynthesis/alpine-mpich-armv7l:cluster      \
    PROJECT_NAME=$PROJNAME  \
    NETWORK_NAME=$NETNAME    \
    NETWORK_SUBNET=10.0.0.0/28   \
    SSH_ADDR=localhost      \
    SSH_PORT=2222

./swarm.sh up size=6

# docker network inspect $NETNAME | grep "IPv4Address"| grep -E -o "([0-9]{1,3}[\.]){3}[0-9]{1,3}"

# ./swarm.sh help