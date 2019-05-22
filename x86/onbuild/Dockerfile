FROM pietersynthesis/alpine-mpich-x86_64:latest

USER root

RUN apk add --no-cache openssh 

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

# # ------------------------------------------------------------
# # Utility shell scripts
# # ------------------------------------------------------------

COPY mpi_bootstrap /usr/local/bin/mpi_bootstrap
RUN chmod +x /usr/local/bin/mpi_bootstrap

COPY get_hosts /usr/local/bin/get_hosts
RUN chmod +x /usr/local/bin/get_hosts

COPY auto_update_hosts /usr/local/bin/auto_update_hosts
RUN chmod +x /usr/local/bin/auto_update_hosts

# # ------------------------------------------------------------
# # Miscellaneous setup for better user experience
# # ------------------------------------------------------------

# Set welcome message to display when user ssh login 
COPY welcome.txt /etc/motd

# Default hostfile location for mpirun. This file will be updated automatically.
ENV HYDRA_HOST_FILE /etc/opt/hosts
RUN echo "export HYDRA_HOST_FILE=${HYDRA_HOST_FILE}" >> /etc/profile

RUN touch ${HYDRA_HOST_FILE}
RUN chown ${USER}:${USER} ${HYDRA_HOST_FILE}

# Auto go to default working directory when user ssh login 
RUN echo "cd $WORKDIR" >> ${USER_HOME}/.profile


# # ------------------------------------------------------------
# # Set up SSH Server 
# # ------------------------------------------------------------

# Add host keys
RUN cd /etc/ssh/ && ssh-keygen -A -N ''

# Config SSH Daemon
RUN  sed -i "s/#PasswordAuthentication.*/PasswordAuthentication no/g" /etc/ssh/sshd_config \
  && sed -i "s/#PermitRootLogin.*/PermitRootLogin no/g" /etc/ssh/sshd_config \
  && sed -i "s/#AuthorizedKeysFile/AuthorizedKeysFile/g" /etc/ssh/sshd_config
 
# Unlock non-password USER to enable SSH login
RUN passwd -u ${USER}

# Set up user's public and private keys
ENV SSHDIR ${USER_HOME}/.ssh
RUN mkdir -p ${SSHDIR}

# Default ssh config file that skips (yes/no) question when first login to the host
RUN echo "StrictHostKeyChecking no" > ${SSHDIR}/config
# This file can be overwritten by the following onbuild step if ssh/ directory has config file

# Switch back to default user
USER ${USER}


# # ------------------------------------------------------------
# # ONBUILD (require ssh/ directory in the build context)
# # ------------------------------------------------------------
ONBUILD USER root

ONBUILD COPY ssh/ ${SSHDIR}/

ONBUILD RUN cat ${SSHDIR}/*.pub >> ${SSHDIR}/authorized_keys
ONBUILD RUN chmod -R 600 ${SSHDIR}/* \
         && chown -R ${USER}:${USER} ${SSHDIR}

# Switch back to default user when continue the build process
ONBUILD USER ${USER}
