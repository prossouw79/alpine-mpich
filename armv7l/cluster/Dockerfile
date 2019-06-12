FROM mesh-network-registry:5000/alpine-mpich-armv7l:onbuild

# # ------------------------------------------------------------
# # Build MPI project
# # ------------------------------------------------------------

# Put all build steps and additional package installation here

# Note: the current directory is ${WORKDIR:=/project}, which is
# also the default directory where ${USER:=mpi} will SSH login to

# Copy the content of `project` directory in the host machine to 
# the current working directory in this Docker image

COPY project/ .
WORKDIR /project/osu_parser
USER root 
RUN chown ${USER}:${USER} -R ../osu_parser
USER ${USER}
RUN npm install
RUN node index.js default

WORKDIR /project/
RUN wget https://www.nas.nasa.gov/assets/npb/NPB3.4.tar.gz
RUN tar -xvf NPB3.4.tar.gz && rm NPB3.4.tar.gz
RUN mv /project/compile_nas.sh /project/NPB3.4/NPB3.4-MPI/
WORKDIR /project/NPB3.4/NPB3.4-MPI 
#https://www.nas.nasa.gov/publications/npb_problem_sizes.html
RUN bash compile_nas.sh


# ####################
# For Docker beginner:

# After Docker syntax `RUN`, you can execute any command available in 
# the current shell of the image.

# To switch to root:    USER root
# To switch back to default user: USER ${USER}
