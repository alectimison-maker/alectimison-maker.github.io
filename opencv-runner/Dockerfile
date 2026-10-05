FROM public.ecr.aws/docker/library/ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN sed -i \
    -e 's|http://archive.ubuntu.com/ubuntu|http://mirrors.cloud.aliyuncs.com/ubuntu|g' \
    -e 's|http://security.ubuntu.com/ubuntu|http://mirrors.cloud.aliyuncs.com/ubuntu|g' \
    /etc/apt/sources.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    bash coreutils g++ pkg-config libopencv-dev python3 python3-opencv \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --uid 65532 --no-create-home --shell /usr/sbin/nologin runner

COPY include/opencv-runner.hpp /opt/opencv-runner/include/opencv-runner.hpp
RUN g++ -std=c++17 -O0 -pipe \
    $(pkg-config --cflags opencv4) \
    -x c++-header /opt/opencv-runner/include/opencv-runner.hpp \
    -o /opt/opencv-runner/include/opencv-runner.hpp.gch \
  && chmod 0444 \
    /opt/opencv-runner/include/opencv-runner.hpp \
    /opt/opencv-runner/include/opencv-runner.hpp.gch

USER 65532:65532
WORKDIR /workspace
