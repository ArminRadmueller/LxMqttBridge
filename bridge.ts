#!/usr/bin/env node

import logging from 'yalm'

import {bridgeToLoxone} from "./bridgeLoxone"
import {bridgeToMqttBroker} from "./bridgeMqttBroker"
import {loadConfig} from "./config"
import {loxoneToMqtt, mapMqttToLoxone} from "./transform"

// Note: `import` declarations are hoisted, but none of the imported modules log at import
// time, so reading the config here is safe before any logging output.
const config = loadConfig(process.env.BRIDGE_CONFIG || process.argv[2] || './config.json')

logging.setLevel(config.logLevel)

logging.info('Loxone-MQTT Bridge (LxMqttBridge) starting...')

const bdgLx = new bridgeToLoxone(config.loxone.host, config.loxone.port, config.loxone.sendPort)
bdgLx.on('receiveFromLoxone', (message: string) => processIncomingLoxoneMessage(message))

const bdgMqtt = new bridgeToMqttBroker(config.mqttBroker)
bdgMqtt.on('receiveFromMqttBroker', (topic: string, payload: string) => processIncomingMqttBrokerMessage(topic, payload))

function processIncomingMqttBrokerMessage(topic: string, payload: string): void
{
    let messages: string[]
    try
    {
        messages = mapMqttToLoxone(config.mappings ?? [], topic, payload)
    }
    catch (error)
    {
        logging.error('message processing from MQTT broker: ' + (error as Error).message)
        return
    }
    for (const message of messages)
    {
        bdgLx.sendToLoxone(message)
    }
    if (messages.length === 0)
    {
        logging.debug('MQTT broker: nothing to forward for topic "' + topic + '" (no mapping or empty payload mapping), message ignored')
    }
}

function processIncomingLoxoneMessage(message: string): void
{
    const mapped = loxoneToMqtt(message)
    if (!mapped)
    {
        logging.debug('Loxone: message "' + message + '" cannot be mapped, ignored')
        return
    }
    if (!bdgMqtt.Connected)
    {
        logging.warning('MQTT broker: not connected, message "' + message + '" dropped')
        return
    }
    bdgMqtt.sendToMqttBroker(mapped.topic, mapped.payload)
}

// Fail fast and loudly instead of silently continuing in an undefined state.
// Container orchestrators (e.g. Docker restart policies) can then restart the bridge.
process.on('uncaughtException', (error: Error) => {
    logging.error('uncaught exception, exiting: ' + (error.stack ?? error.message))
    process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
    logging.error('unhandled promise rejection, exiting: ' + (reason instanceof Error ? reason.stack : String(reason)))
    process.exit(1)
})
