import {readFileSync} from 'fs';

export interface MqttBrokerConfig {
    url: string;
    topic: string;
    subscriptions: string[];
    /** Optional MQTT broker credentials. */
    username?: string;
    password?: string;
    /** Verify the broker's TLS certificate (default: true). Set to false only for self-signed certificates. */
    tlsVerify?: boolean;
}

export interface LoxoneConfig {
    host: string;
    /** Port the bridge listens on for UDP messages from Loxone. */
    port: number;
    /** Optional: destination port for UDP messages sent to Loxone (default: port). */
    sendPort?: number;
}

/**
 * Configurable transformation rules for messages coming from the MQTT broker.
 * If omitted, a single "tasmota-energy" rule for SENSOR topics is assumed
 * (backwards compatible behaviour).
 */
export interface MappingRuleConfig {
    type: 'tasmota-energy' | 'pass-through';
    /** Topic suffix to match, e.g. "SENSOR" matches "TasmotaSocket/Washer/SENSOR". */
    topicSuffix: string;
}

export interface Config {
    logLevel: string;
    mqttBroker: MqttBrokerConfig;
    loxone: LoxoneConfig;
    mappings?: MappingRuleConfig[];
}

/**
 * Loads and validates the configuration from the given file, applies
 * environment variable overrides (useful for Docker) and applies defaults.
 */
export function loadConfig(path: string): Config
{
    let raw: unknown;
    try
    {
        raw = JSON.parse(readFileSync(path, 'utf8'));
    }
    catch (error)
    {
        throw new Error('could not read config file "' + path + '": ' + (error as Error).message +
            ' (mount or pass the correct config file as first argument)');
    }
    const config = raw as Config;
    validateConfig(config);
    applyEnvOverrides(config);
    applyDefaults(config);
    return config;
}

function requireKey(condition: boolean, path: string): void
{
    if (!condition)
    {
        throw new Error('invalid configuration: missing or empty "' + path + '"');
    }
}

export function validateConfig(config: Config): void
{
    requireKey(typeof config.logLevel === 'string' && config.logLevel.length > 0, 'logLevel');
    requireKey(Boolean(config.mqttBroker), 'mqttBroker');
    requireKey(typeof config.mqttBroker?.url === 'string' && config.mqttBroker.url.length > 0, 'mqttBroker.url');
    requireKey(typeof config.mqttBroker?.topic === 'string' && config.mqttBroker.topic.length > 0, 'mqttBroker.topic');
    requireKey(Array.isArray(config.mqttBroker?.subscriptions), 'mqttBroker.subscriptions');
    requireKey(Boolean(config.loxone), 'loxone');
    requireKey(typeof config.loxone?.host === 'string' && config.loxone.host.length > 0, 'loxone.host');
    requireKey(typeof config.loxone?.port === 'number' && config.loxone.port > 0, 'loxone.port');
    if (config.loxone?.sendPort !== undefined)
    {
        requireKey(typeof config.loxone.sendPort === 'number' && config.loxone.sendPort > 0, 'loxone.sendPort');
    }
    if (config.mappings !== undefined)
    {
        requireKey(Array.isArray(config.mappings), 'mappings');
        for (const mapping of config.mappings ?? [])
        {
            requireKey(mapping.type === 'tasmota-energy' || mapping.type === 'pass-through', 'mappings.type');
            requireKey(typeof mapping.topicSuffix === 'string' && mapping.topicSuffix.length > 0, 'mappings.topicSuffix');
        }
    }
}

function applyEnvOverrides(config: Config): void
{
    const env = process.env;
    if (env.LOG_LEVEL) config.logLevel = env.LOG_LEVEL;
    if (env.MQTT_URL) config.mqttBroker.url = env.MQTT_URL;
    if (env.MQTT_USERNAME) config.mqttBroker.username = env.MQTT_USERNAME;
    if (env.MQTT_PASSWORD) config.mqttBroker.password = env.MQTT_PASSWORD;
    if (env.MQTT_TLS_VERIFY) config.mqttBroker.tlsVerify = env.MQTT_TLS_VERIFY !== 'false';
    if (env.LOXONE_HOST) config.loxone.host = env.LOXONE_HOST;
    if (env.LOXONE_PORT) config.loxone.port = Number(env.LOXONE_PORT);
}

function applyDefaults(config: Config): void
{
    if (config.mqttBroker.tlsVerify === undefined)
    {
        config.mqttBroker.tlsVerify = true;
    }
    if (config.mappings === undefined)
    {
        config.mappings = [{type: 'tasmota-energy', topicSuffix: 'SENSOR'}];
    }
}
