const logging = require('yalm')
import dgram = require('dgram');
import {EventEmitter} from 'events';
    
declare interface bridgeToLoxone {
    on(event: 'receiveFromLoxone', listener: (message:string) => void): this;
    on(event: string, listener: Function): this;
}

class bridgeToLoxone extends EventEmitter { 
    private Host : string;
    private Port : number;
    private Socket : dgram.Socket;
    public Connected : boolean = false;
  
    public constructor(Host:string,Port:number)
    { 
        super();
        this.Host = Host;
        this.Port = Port;
        this.Socket = dgram.createSocket('udp4');
        this.Socket.on('listening', () => { this.Connected = true; logging.info('bridge to Loxone: listen on ' + this.Socket.address().address + ':UDP/' + this.Socket.address().port) });
        this.Socket.on('close', () => { this.Connected = false; logging.info('bridge to Loxone: connection closed') });
        this.Socket.on('error', (error:Error) => { this.errorHandler(error) });
        this.Socket.on('message', (message:Buffer, remote:dgram.RemoteInfo) => { this.receiveFromLoxone(message,remote) });
        this.Socket.bind(this.Port);
    }
 
    public sendToLoxone(message:string):boolean
    { 
        var status:boolean = false
        logging.info('bridge to Loxone: send message to udp://' + this.Host + ':' + this.Port + ' => "' + message + '"')   
        this.Socket.send(message, 0, message.length, this.Port, this.Host, (error:Error|null, bytes:number) => {
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

    private receiveFromLoxone(message:Buffer, remote:dgram.RemoteInfo)
    {
        let messageText:string = message.toString().trim()
        logging.info('bridge to Loxone: receive message from udp://' + remote.address + ':' + remote.port + ' => "' + message + '"')
        this.emit('receiveFromLoxone',messageText);
    }

    private errorHandler(error:Error)
    {
        logging.error('bridge to Loxone: ' + error)
    }

}

export {bridgeToLoxone}
