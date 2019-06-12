FROM alpine

ARG REQUIRE="sudo build-base nodejs npm nano nmap git zip"
RUN apk update && apk upgrade \
      && apk add --no-cache ${REQUIRE}


#### INSTALL MPICH ####
# Source is available at http://www.mpich.org/static/downloads/

# Build Options:
# See installation guide of target MPICH version
# Ex: http://www.mpich.org/static/downloads/3.2/mpich-3.2-installguide.pdf
# These options are passed to the steps below
ARG MPICH_VERSION="3.2"
# FORTRAN required for NAS benchmarks 
# ARG MPICH_CONFIGURE_OPTIONS="--disable-fortran"
ARG MPICH_MAKE_OPTION="-j 4"

# Download, build, and install MPICH
RUN mkdir /tmp/mpich-src
WORKDIR /tmp/mpich-src
RUN wget http://www.mpich.org/static/downloads/${MPICH_VERSION}/mpich-${MPICH_VERSION}.tar.gz \
      && tar xfz mpich-${MPICH_VERSION}.tar.gz  \
      && cd mpich-${MPICH_VERSION}  \
      && ./configure ${MPICH_CONFIGURE_OPTIONS}
WORKDIR /tmp/mpich-src/mpich-${MPICH_VERSION}
RUN make ${MPICH_MAKE_OPTIONS} 
RUN make install && rm -rf /tmp/mpich-src

#### TEST MPICH INSTALLATION ####
RUN mkdir /tmp/mpich-test
WORKDIR /tmp/mpich-test
COPY mpich-test .
RUN sh test.sh
RUN rm -rf /tmp/mpich-test

#### CLEAN UP ####
WORKDIR /
RUN rm -rf /tmp/*

#### OSU INSTALLATION ####
USER root

RUN mkdir /root/osu
WORKDIR /root/osu

RUN wget http://mvapich.cse.ohio-state.edu:8080/download/mvapich/osu-micro-benchmarks-5.6.1.tar.gz 
RUN tar -xvf osu-micro-benchmarks-5.6.1.tar.gz
RUN rm osu-micro-benchmarks-5.6.1.tar.gz
WORKDIR /root/osu/osu-micro-benchmarks-5.6.1
RUN ./configure CC=$(which mpicc) CXX=$(which mpicxx)
RUN make -j 4
RUN make install
RUN rm -rf /root/osu

RUN ln -s /usr/local/libexec/osu-micro-benchmarks/mpi/collective/* /usr/local/bin/
RUN ln -s /usr/local/libexec/osu-micro-benchmarks/mpi/one-sided/* /usr/local/bin/
RUN ln -s /usr/local/libexec/osu-micro-benchmarks/mpi/pt2pt/* /usr/local/bin/

#### ADD DEFAULT USER ####
ARG USER=mpi
ENV USER ${USER}
RUN adduser -D ${USER} \
      && echo "${USER}   ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

ENV USER_HOME /home/${USER}
RUN chown -R ${USER}:${USER} ${USER_HOME}

#### CREATE WORKING DIRECTORY FOR USER ####
ARG WORKDIR=/project
ENV WORKDIR ${WORKDIR}
RUN mkdir ${WORKDIR}
RUN chown -R ${USER}:${USER} ${WORKDIR}

WORKDIR ${WORKDIR}
USER ${USER}

CMD ["/bin/ash"]
