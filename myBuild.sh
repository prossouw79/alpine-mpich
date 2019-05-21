#!/bin/bash
PROJNAME=test-local-project
NETNAME=$PROJNAME-network

rm -rf ~/.ssh

chmod 600 cluster/ssh/id_rsa
chmod 600 cluster/ssh/id_rsa.pub

# sudo service docker restart

docker swarm leave -f
docker swarm init --advertise-addr 192.168.20.208

docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker network rm $NETNAME


docker system prune --volumes -f
docker build --compress -t pietersynthesis/alpine-mpich base/
docker build --compress -t pietersynthesis/alpine-mpich:onbuild onbuild/

cd cluster
./swarm.sh config set \
    IMAGE_TAG=pietersynthesis/alpine-mpich      \
    PROJECT_NAME=$PROJNAME  \
    NETWORK_NAME=$NETNAME    \
    NETWORK_SUBNET=10.0.0.0/28   \
    SSH_ADDR=localhost      \
    SSH_PORT=2222

./swarm.sh up size=2

watch docker network inspect $NETNAME | grep "IPv4Address"| grep -E -o "([0-9]{1,3}[\.]){3}[0-9]{1,3}" > hosts/hosts.txt

# ./swarm.sh login
