FROM node:17.3-bullseye-slim
LABEL maintainer="Armin Radmüller"

ENV NODE_ENV=production

WORKDIR /opt/bridge

RUN apt-get update && apt-get install -y curl unzip && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/bridge \
    && curl -SL https://github.com/ArminRadmueller/LxMqttBridge/archive/refs/heads/master.zip -o /tmp/bridge.zip \
    && unzip /tmp/bridge.zip -d /tmp && cp -n /tmp/LxMqttBridge-master/* /opt/bridge && rm /tmp/bridge.zip && rm -r /tmp/LxMqttBridge-master \
    && cd /opt/bridge && npm install --production && npm run build

CMD [ "node", "build/bridge.js ../config.json" ]
