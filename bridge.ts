#!/usr/bin/env node

const logging = require('yalm')
const program = require('./package.json')
const config = require(process.argv[2] || './config.json')

import {bridgeToLoxone} from "./bridgeLoxone"
import {bridgeToMqttBroker} from "./bridgeMqttBroker"

logging.setLevel(config.logLevel)

logging.info('Loxone-MQTT Bridge (LxMqttBridge) ' + program.version + ' starting...')

var bdgLx = new bridgeToLoxone(config.loxone.host, config.loxone.port);
bdgLx.on('receiveFromLoxone', (message:string) => { processIncomingLoxoneMessage(message) } );

var bdgMqtt = new bridgeToMqttBroker(config.mqttBroker.url, config.mqttBroker.topic, config.mqttBroker.subscriptions);
bdgMqtt.on('receiveFromMqttBroker', (topic:string,payload:string) => { processIncomingMqttBrokerMessage(topic,payload) } );

function processIncomingMqttBrokerMessage(topic:string,payload:string)
{
    try
    {
        if ( topic.endsWith("SENSOR") )
        {
            let data = JSON.parse(payload)
            bdgLx.sendToLoxone(topic + '/Current:' + data.ENERGY.Current);
            bdgLx.sendToLoxone(topic + '/Power:' + data.ENERGY.Power);
            bdgLx.sendToLoxone(topic + '/Voltage:' + data.ENERGY.Voltage);
        }
    }
    catch ( error )
    {
        logging.error("message processing from MQTT broker: " + (error as Error).message);
    }
}

function processIncomingLoxoneMessage(message:string)
{
    try
    {
        let data = message.split(';')
        const topic = data[0]
        if (data.length > 1)
        {
            bdgMqtt.sendToMqttBroker(topic,data[1])
        }
    }
    catch ( error )
    {
        logging.error("message processing from Loxone: " + (error as Error).message);
    }
}
