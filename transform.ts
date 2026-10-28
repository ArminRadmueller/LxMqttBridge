import type {MappingRuleConfig} from './config';

export interface Message
{
    topic: string;
    payload: string;
}

/** ENERGY fields forwarded to Loxone (behavior-preserving subset of Tasmota's ENERGY block). */
export const PUBLISHED_ENERGY_FIELDS: readonly string[] = ['Power', 'Voltage', 'Current'];

/** True if `topic` ends with the given suffix (e.g. "SENSOR" matches ".../SENSOR"). */
export function topicMatchesSuffix(topic: string, suffix: string): boolean
{
    return topic === suffix || topic.endsWith('/' + suffix) || topic.endsWith(suffix);
}

/**
 * Bridges a Loxone UDP message ("topic;payload") to an MQTT publish.
 * Returns null for messages that cannot be mapped.
 */
export function loxoneToMqtt(message: string): Message | null
{
    const parts = message.split(';');
    const topic = parts[0];
    const payload = parts[1];
    if (parts.length > 1 && topic && payload)
    {
        return {topic: topic, payload: payload};
    }
    return null;
}

/**
 * Maps a Tasmota SENSOR payload (with an ENERGY block) to Loxone virtual input
 * messages in the form "topic/Field:value".
 * Returns an empty list for payloads that are not JSON (e.g. LWT "Online" messages)
 * or that do not contain an ENERGY block.
 */
export function tasmotaEnergyToLoxone(topic: string, payload: string): string[]
{
    let data: {ENERGY?: unknown};
    try
    {
        data = JSON.parse(payload) as {ENERGY?: unknown};
    }
    catch
    {
        // Not JSON (e. g. LWT "Online" messages on subscribed topics) - nothing to forward.
        return [];
    }
    const energy = data?.ENERGY;
    if (!energy || typeof energy !== 'object')
    {
        return [];
    }
    const values = energy as Record<string, unknown>;
    const messages: string[] = [];
    for (const field of PUBLISHED_ENERGY_FIELDS)
    {
        const value = values[field];
        if (value === undefined || value === null)
        {
            continue;
        }
        if (typeof value === 'number' && !Number.isFinite(value))
        {
            continue;
        }
        messages.push(topic + '/' + field + ':' + value);
    }
    return messages;
}

/** Maps a message as-is in the form "topic:payload". */
export function passThroughToLoxone(topic: string, payload: string): string[]
{
    return [topic + ':' + payload];
}

/**
 * Applies the first matching mapping rule to an MQTT message and returns
 * the resulting Loxone messages (empty array = nothing to forward).
 * Throws if a payload cannot be processed by the matching rule.
 */
export function mapMqttToLoxone(
    rules: MappingRuleConfig[],
    topic: string,
    payload: string,
): string[]
{
    for (const rule of rules)
    {
        if (topicMatchesSuffix(topic, rule.topicSuffix))
        {
            switch (rule.type)
            {
            case 'tasmota-energy':
                return tasmotaEnergyToLoxone(topic, payload);
            case 'pass-through':
                return passThroughToLoxone(topic, payload);
            }
        }
    }
    return [];
}
