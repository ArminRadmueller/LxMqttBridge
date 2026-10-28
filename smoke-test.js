/* End-to-end smoke test (not part of the test suite, run manually):
 * spins up an in-memory MQTT broker, starts the compiled bridge against it,
 * and verifies both bridging directions. Delete after use. */
const net = require('net');
const dgram = require('dgram');
const AedesPkg = require('aedes');
const Aedes = AedesPkg.Aedes || AedesPkg.default || AedesPkg;
const {spawn} = require('child_process');
const assert = require('assert');

const PORT = 18871;
const LOXONE_BRIDGE_PORT = 8103;  // bridge UDP listen port (receives from Loxone)
const LOXONE_SIM_PORT = 8104;     // harness UDP port simulating Loxone (receives bridge output)

async function main()
{
    const aedes = await Aedes.createBroker();
    const broker = net.createServer(aedes.handle).listen(PORT);

    const udpSock = dgram.createSocket('udp4');
    udpSock.bind(LOXONE_SIM_PORT);
    console.log('smoke: UDP receiver listening on', LOXONE_SIM_PORT);

    const udpReceived = [];
    const mqttReceived = [];
    udpSock.on('message', (msg) => {
        udpReceived.push(msg.toString());
        console.log('smoke: UDP received =>', msg.toString());
    });
    aedes.on('publish', (packet) => {
        if (packet.topic.startsWith('$SYS') || packet.topic === 'Loxone-W2/connected')
        {
            return;
        }
        mqttReceived.push([packet.topic, packet.payload.toString()]);
        console.log('smoke: MQTT published =>', packet.topic, packet.payload.toString());
    });

    const child = spawn('node', ['build/bridge.js', 'smoke-config.json'], {stdio: 'inherit'});
    const after = (ms) => new Promise((r) => setTimeout(r, ms));
    await after(1500); // let bridge connect + subscribe

    // MQTT -> Loxone
    aedes.publish({
        topic: 'TasmotaSocket/Waschmaschine/SENSOR',
        payload: JSON.stringify({ENERGY: {Power: 12.3, Voltage: 230.4, Current: 0.65}}),
        qos: 0, retain: false, dup: false, cmd: 'publish',
    });
    // non-JSON payload (e.g. LWT) should be ignored
    aedes.publish({
        topic: 'TasmotaSocket/Trockner/SENSOR',
        payload: 'Online',
        qos: 0, retain: false, dup: false, cmd: 'publish',
    });
    await after(500);
    assert.deepStrictEqual(udpReceived, [
        'TasmotaSocket/Waschmaschine/SENSOR/Power:12.3',
        'TasmotaSocket/Waschmaschine/SENSOR/Voltage:230.4',
        'TasmotaSocket/Waschmaschine/SENSOR/Current:0.65',
    ]);

    // Loxone -> MQTT
    const sock = dgram.createSocket('udp4');
    sock.send('TasmotaSocket/Waschmaschine/Relay1;ON', LOXONE_BRIDGE_PORT, '127.0.0.1', () => { sock.close(); });
    await after(500);
    const relayMessages = mqttReceived.filter((m) => m[0].indexOf('Relay1') !== -1);
    assert.deepStrictEqual(relayMessages, [['TasmotaSocket/Waschmaschine/Relay1', 'ON']]);

    console.log('smoke: PASSED');
    broker.close();
    udpSock.close();
    child.kill();
    process.exit(0);
}

main().catch((e) => { console.error('smoke: FAILED', e); process.exit(1); });
