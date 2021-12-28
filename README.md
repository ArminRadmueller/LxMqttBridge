# LxMqttBridge
standalone MQTT Bridge optimized for Tasmota sockets with full integration in Loxone smart home

## Installation

This node.js application can be installed by downloading the code from this repository and installing it using npm.

```
mkdir /opt/LxMqttBridge
cd /opt/LxMqttBridge
wget https://github.com/ArminRadmueller/LxMqttBridge/archive/refs/heads/master.zip
unzip master.zip && rm master.zip
npm install
npm build
```
Execute the application with the following command
```
npm run start
```

## Configuration

The configuration file **config.json** contains the informations for the operation of the MQTT-Loxone Bridge.
In the following example, a Loxone Mini Server with port UDP/8002 is connected to an Eclipse Mosquitto MQTT broker and subscribes to the topics of two smart wifi sockets **NOUS A1** (flashed with Tasmota firmware).

```
{
    "logLevel": "info",
    
    "mqttBroker": {
        "url": "mqtt://192.168.100.2",
        "topic": "Loxone",
        "subscriptions": [
            "TasmotaSocket/Waschmaschine/SENSOR/#",
            "TasmotaSocket/Trockner/SENSOR/#"
        ]
    },

    "loxone": {
        "host": "192.168.100.42",
        "port": 8002
    }
}
```