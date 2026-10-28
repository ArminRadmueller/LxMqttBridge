import test from 'node:test';
import assert from 'node:assert/strict';
import {loxoneToMqtt, mapMqttToLoxone, passThroughToLoxone, topicMatchesSuffix, tasmotaSmartSocketToLoxone} from '../transform';

const energyPayload = (energy: Record<string, unknown>): string => JSON.stringify({Time: '2026-10-28T12:00:00', ENERGY: energy});

test('topicMatchesSuffix matches exact and suffixed topics', () => {
    assert.equal(topicMatchesSuffix('SENSOR', 'SENSOR'), true);
    assert.equal(topicMatchesSuffix('TasmotaSocket/Waschmaschine/SENSOR', 'SENSOR'), true);
    assert.equal(topicMatchesSuffix('TasmotaSocket/Waschmaschine/STAT', 'SENSOR'), false);
});

test('tasmotaSmartSocketToLoxone maps available ENERGY fields to Loxone messages', () => {
    const messages = tasmotaSmartSocketToLoxone('TasmotaSocket/Waschmaschine/SENSOR', energyPayload({
        Power: 123.4, Current: 0.56, Voltage: 230.1,
    }));
    assert.deepEqual(messages, [
        'TasmotaSocket/Waschmaschine/SENSOR/Power:123.4',
        'TasmotaSocket/Waschmaschine/SENSOR/Voltage:230.1',
        'TasmotaSocket/Waschmaschine/SENSOR/Current:0.56',
    ]);
});

test('tasmotaSmartSocketToLoxone only publishes available fields', () => {
    const messages = tasmotaSmartSocketToLoxone('TasmotaSocket/Trockner/SENSOR', energyPayload({Power: 5}));
    assert.deepEqual(messages, ['TasmotaSocket/Trockner/SENSOR/Power:5']);
});

test('tasmotaSmartSocketToLoxone ignores non-JSON payloads like LWT "Online"', () => {
    assert.deepEqual(tasmotaSmartSocketToLoxone('TasmotaSocket/X/SENSOR', 'Online'), []);
});

test('tasmotaSmartSocketToLoxone ignores payloads without ENERGY block', () => {
    const messages = tasmotaSmartSocketToLoxone('TasmotaSocket/X/SENSOR', JSON.stringify({Temp: 21.5}));
    assert.deepEqual(messages, []);
});

test('tasmotaSmartSocketToLoxone ignores non-finite values', () => {
    const messages = tasmotaSmartSocketToLoxone('TasmotaSocket/X/SENSOR', energyPayload({Power: Number.NaN, Voltage: 230}));
    assert.deepEqual(messages, ['TasmotaSocket/X/SENSOR/Voltage:230']);
});

test('tasmotaSmartSocketToLoxone ignores invalid JSON', () => {
    assert.deepEqual(tasmotaSmartSocketToLoxone('TasmotaSocket/X/SENSOR', 'not-json'), []);
});

test('loxoneToMqtt splits Loxone messages "topic;payload"', () => {
    assert.deepEqual(loxoneToMqtt('TasmotaSocket/Waschmaschine/Relay1;ON'), {
        topic: 'TasmotaSocket/Waschmaschine/Relay1',
        payload: 'ON',
    });
});

test('loxoneToMqtt returns null for messages without separator or empty payload', () => {
    assert.equal(loxoneToMqtt('no-separator'), null);
    assert.equal(loxoneToMqtt('topic;'), null);
    assert.equal(loxoneToMqtt(';payload'), null);
});

test('passThroughToLoxone forwards topic and payload', () => {
    assert.deepEqual(passThroughToLoxone('TasmotaSocket/X/SENSOR', 'Online'), ['TasmotaSocket/X/SENSOR:Online']);
});

test('mapMqttToLoxone applies the tasmota-smartsocket rule', () => {
    const messages = mapMqttToLoxone(
        [{type: 'tasmota-smartsocket', topicSuffix: 'SENSOR'}],
        'TasmotaSocket/Waschmaschine/SENSOR',
        energyPayload({Power: 10}),
    );
    assert.deepEqual(messages, ['TasmotaSocket/Waschmaschine/SENSOR/Power:10']);
});

test('mapMqttToLoxone applies the pass-through rule', () => {
    const messages = mapMqttToLoxone(
        [{type: 'pass-through', topicSuffix: 'STAT'}],
        'TasmotaSocket/X/STAT',
        'Online',
    );
    assert.deepEqual(messages, ['TasmotaSocket/X/STAT:Online']);
});

test('mapMqttToLoxone returns an empty list for unmatched topics', () => {
    assert.deepEqual(mapMqttToLoxone([{type: 'pass-through', topicSuffix: 'STAT'}], 'Other/Topic', 'x'), []);
});
