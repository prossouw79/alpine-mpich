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

# To enable push/pull from this registry:
#   -  Create or modify /etc/docker/daemon.json:
#      { "insecure-registries":["mesh-network-registry:5000"] }
#   -  sudo service docker restart


registry=mesh-network-registry:5000
image=$registry/alpine-mpich-x86_64

docker pull $image:base
docker pull $image:onbuild
docker pull $image:cluster

read -p "Do you need to rebuild images?" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
echo "Building base image"
    docker build  -t $image:base base/
    echo "Building onbuild image"
    docker build  -t $image:onbuild onbuild/
    echo "Building cluster image"
    docker build   -t $image:cluster cluster/

    #important: disabled push everywhere else so keep it here
    docker push $image:base
    docker push $image:onbuild
    docker push $image:cluster
fi

