const logging = require('yalm')
import mqtt = require('mqtt');
import {EventEmitter} from 'events';

declare interface bridgeToMqttBroker {
    on(event: 'receiveFromMqttBroker', listener: (topic:string,payload:string) => void): this;
    on(event: string, listener: Function): this;
}

class bridgeToMqttBroker extends EventEmitter { 
    private Url : string;
    private Topic : string;
    private Subscriptions : any;
    private Client : mqtt.MqttClient;
    public Connected : boolean = false;

    constructor(Url:string,Topic:string,Subscriptions:any)
    { 
        super();
        this.Url = Url;
        this.Topic = Topic;
        this.Subscriptions = Subscriptions;
        this.Client = mqtt.connect(this.Url, { will: { topic: this.Topic + '/connected', payload: '0', qos: 0, retain: true }, rejectUnauthorized: false });
        this.Client.on('connect', () => { this.Connected = true; logging.info('MQTT broker: connected with ' + this.Url); this.subscribeToMqttBroker(); });
        this.Client.on('close', () => { this.Connected = false; logging.warning('MQTT broker: connection closed'); });
        this.Client.on('error', (error:Error) => { this.errorHandler(error); });
        this.Client.on('message', (topic:string, payload:string, msg:string) => { this.receiveFromMqttBroker(topic,payload,msg); });
    }

    private subscribeToMqttBroker()
    {
        this.Client.publish(this.Topic + '/connected', '2',{ qos: 0, retain: false })
        this.Client.subscribe(this.Topic + '/set/#')
        for (const Subscription in this.Subscriptions )
        {
            this.Client.subscribe(this.Subscriptions[Subscription])
        }
    }

    public sendToMqttBroker(topic:string,payload:string):boolean
    { 
        var status:boolean = false
        logging.debug('MQTT broker: send message to ' + this.Url + ' => "' + topic + ':' + payload + '"')   
        this.Client.publish(topic, payload, { qos: 0, retain: false }, (error:Error | undefined) => {
            if (error)
            {
                this.errorHandler(error)
                status = false
            }
            else
            {
                status = true
            }
        })
        return status
    }

    private receiveFromMqttBroker(topic:string, payload:string, message:string)
    {
        let payloadString:string = payload.toString()
        logging.debug('MQTT broker: receive message from ' + topic + ' => "' + payload.toString() + '"')
        this.emit('receiveFromMqttBroker',topic,payloadString);
    }

    private errorHandler(error:Error)
    {
        logging.error('Loxone: ' + error)
    }

}

export {bridgeToMqttBroker}
