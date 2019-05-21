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

# sudo service docker restart

docker swarm leave -f
docker swarm init

docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker network rm $NETNAME

docker system prune --volumes -f
docker build --compress -t pietersynthesis/alpine-mpich-arm7l base/
docker build --compress -t pietersynthesis/alpine-mpich-arm7l:onbuild onbuild/

docker push pietersynthesis/alpine-mpich-arm7l
docker push pietersynthesis/alpine-mpich-arm7l:onbuild

cd cluster
./swarm.sh config set \
    IMAGE_TAG=pietersynthesis/alpine-mpich-arm7l      \
    PROJECT_NAME=$PROJNAME  \
    NETWORK_NAME=$NETNAME    \
    NETWORK_SUBNET=10.0.0.0/28   \
    SSH_ADDR=localhost      \
    SSH_PORT=2222

./swarm.sh up size=2

docker network inspect $NETNAME | grep "IPv4Address"| grep -E -o "([0-9]{1,3}[\.]){3}[0-9]{1,3}"

./swarm.sh help
