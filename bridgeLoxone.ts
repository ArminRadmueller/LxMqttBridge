import logging from 'yalm'
import * as dgram from 'dgram';
import {EventEmitter} from 'events';

class bridgeToLoxone extends EventEmitter {
    private readonly Host: string;
    private readonly Port: number;
    private readonly SendPort: number;
    private readonly Socket: dgram.Socket;
    public Connected: boolean = false;

    on(event: 'receiveFromLoxone', listener: (message: string) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter.on dispatch requires (...args: any[])
    on(event: string, listener: (...args: any[]) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter.on dispatch requires (...args: any[])
    on(event: string, listener: (...args: any[]) => void): this
    {
        return super.on(event, listener);
    }

    public constructor(host: string, port: number, sendPort?: number)
    {
        super();
        this.Host = host;
        this.Port = port;
        this.SendPort = sendPort ?? port;
        this.Socket = dgram.createSocket('udp4');
        this.Socket.on('listening', () => {
            this.Connected = true;
            const address = this.Socket.address();
            logging.info('Loxone: listen on ' + address.address + ':UDP/' + address.port);
        });
        this.Socket.on('close', () => {
            this.Connected = false;
            logging.warning('Loxone: connection closed');
        });
        this.Socket.on('error', (error: Error) => { this.errorHandler(error); });
        this.Socket.on('message', (message: Buffer, remote: dgram.RemoteInfo) => { this.receiveFromLoxone(message, remote); });
        this.Socket.bind(this.Port);
    }

    /** Fire-and-forget: for UDP errors are reported asynchronously via the error handler. */
    public sendToLoxone(message: string): void
    {
        logging.debug('Loxone: send message to udp://' + this.Host + ':' + this.SendPort + ' => "' + message + '"');
        this.Socket.send(message, this.SendPort, this.Host, (error: Error | null) => {
            if (error)
            {
                this.errorHandler(error);
            }
        });
    }

    private receiveFromLoxone(message: Buffer, remote: dgram.RemoteInfo): void
    {
        const messageText: string = message.toString().trim();
        logging.debug('Loxone: receive message from udp://' + remote.address + ':' + remote.port + ' => "' + messageText + '"');
        this.emit('receiveFromLoxone', messageText);
    }

    private errorHandler(error: Error): void
    {
        logging.error('Loxone: ' + error);
    }

}

export {bridgeToLoxone}
