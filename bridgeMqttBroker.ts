import logging from 'yalm'
import mqtt from 'mqtt';
import {EventEmitter} from 'events';
import type {MqttBrokerConfig} from './config';

class bridgeToMqttBroker extends EventEmitter {
    private readonly Url: string;
    private readonly Topic: string;
    private readonly Subscriptions: string[];
    private readonly Client: mqtt.MqttClient;
    public Connected: boolean = false;

    on(event: 'receiveFromMqttBroker', listener: (topic: string, payload: string) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter.on dispatch requires (...args: any[])
    on(event: string, listener: (...args: any[]) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter.on dispatch requires (...args: any[])
    on(event: string, listener: (...args: any[]) => void): this
    {
        return super.on(event, listener);
    }

    public constructor(options: MqttBrokerConfig)
    {
        super();
        this.Url = options.url;
        this.Topic = options.topic;
        this.Subscriptions = options.subscriptions;
        this.Client = mqtt.connect(this.Url, {
            username: options.username || undefined,
            password: options.password || undefined,
            will: { topic: this.Topic + '/connected', payload: '0', qos: 0, retain: true },
            rejectUnauthorized: options.tlsVerify !== false
        });
        this.Client.on('connect', () => {
            this.Connected = true;
            logging.info('MQTT broker: connected with ' + this.Url);
            this.subscribeToMqttBroker();
        });
        this.Client.on('close', () => { this.Connected = false; logging.warning('MQTT broker: connection closed'); });
        this.Client.on('error', (error: Error) => { this.errorHandler(error); });
        this.Client.on('message', (topic: string, payload: Buffer) => { this.receiveFromMqttBroker(topic, payload); });
    }

    private subscribeToMqttBroker(): void
    {
        this.Client.publish(this.Topic + '/connected', '2', { qos: 0, retain: false });
        this.Client.subscribe(this.Topic + '/set/#');
        for (const subscription of this.Subscriptions)
        {
            this.Client.subscribe(subscription);
        }
    }

    /** Fire-and-forget: publish errors are reported asynchronously via the error handler. */
    public sendToMqttBroker(topic: string, payload: string): void
    {
        logging.debug('MQTT broker: send message to ' + this.Url + ' => "' + topic + ':' + payload + '"');
        this.Client.publish(topic, payload, { qos: 0, retain: false }, (error: Error | undefined) => {
            if (error)
            {
                this.errorHandler(error);
            }
        });
    }

    private receiveFromMqttBroker(topic: string, payload: Buffer): void
    {
        const payloadString: string = payload.toString();
        logging.debug('MQTT broker: receive message from ' + topic + ' => "' + payloadString + '"');
        this.emit('receiveFromMqttBroker', topic, payloadString);
    }

    private errorHandler(error: Error): void
    {
        logging.error('MQTT broker: ' + error);
    }

}

export {bridgeToMqttBroker}
