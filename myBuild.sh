#!/bin/sh
PROJNAME=test-local-project
NETNAME=$PROJNAME-network

rm -rf ~/.ssh

chmod 600 cluster/ssh/id_rsa
chmod 600 cluster/ssh/id_rsa.pub

docker swarm leave -f
docker swarm init
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker network rm $NETNAME

sudo service docker restart

docker system prune --volumes -f
docker build -t pietersynthesis/alpine-mpich base/
docker build -t pietersynthesis/alpine-mpich:onbuild onbuild/

cd cluster
./swarm.sh config set \
    IMAGE_TAG=pietersynthesis/alpine-mpich      \
    PROJECT_NAME=$PROJNAME  \
    NETWORK_NAME=$NETNAME    \
    NETWORK_SUBNET=10.0.0.0/28   \
    SSH_ADDR=192.168.10.249      \
    SSH_PORT=2222

./swarm.sh up size=4

docker network inspect $NETNAME | grep "IPv4Address"

./swarm.sh login
