# LxMqttBridge

Standalone MQTT-Bridge optimiert für Tasmota-Steckdosen mit vollständiger Integration in ein Loxone Smart Home.

Die Bridge verbindet beide Welten in zwei Richtungen:

- **MQTT → Loxone:** Nachrichten aus den abonnierten MQTT-Topics werden transformiert und per UDP an den Miniserver geschickt.
- **Loxone → MQTT:** UDP-Nachrichten von Loxone (Format `topic;payload`) werden 1:1 an den MQTT-Broker veröffentlicht.

![Übersicht](documentation/images/LxBrdige-001.png)

## Funktionsweise

### MQTT → Loxone

Die Bridge abonniert die unter `mqttBroker.subscriptions` konfigurierten Topics und wendet auf jede
empfangene Nachricht die konfigurierten Regeln (`mappings`) an. Die Ergebnisse werden als UDP-Pakete
an den Miniserver gesendet.

Eingebauter Mapping-Typ `tasmota-energy`:

```
topic:   TasmotaSocket/Waschmaschine/SENSOR
payload: {"Time":"...","ENERGY":{"Total":12.34,"Power":123.4,"Voltage":230.1,"Current":0.56,...}}
```

wird zu drei Loxone-Nachrichten transformiert (es werden nur tatsächlich vorhandene Felder gesendet):

```
TasmotaSocket/Waschmaschine/SENSOR/Power:123.4
TasmotaSocket/Waschmaschine/SENSOR/Voltage:230.1
TasmotaSocket/Waschmaschine/SENSOR/Current:0.56
```

### Loxone → MQTT

Nachrichten von Loxone müssen die Form `topic;payload` haben und werden unverändert an den
MQTT-Broker veröffentlicht (z. B. `TasmotaSocket/Waschmaschine/Relay1;ON`).

### Verwendete MQTT-Topics

- `<topic>/connected` – Status (`2` während des Betriebs, `0` über die retainte Last-Will-Nachricht nach einer unerwarteten Trennung)
- `<topic>/set/#` – eingehende Befehle an die Bridge

## Installation

```sh
npm install
```

`config.example.json` nach `config.json` kopieren und anpassen:

```json
{
    "logLevel": "debug",
    "mqttBroker": {
        "url": "mqtt://dein-mqtt-broker.local:1883",
        "topic": "Loxone-W2",
        "username": "",
        "password": "",
        "tlsVerify": true,
        "subscriptions": [
            "TasmotaSocket/Waschmaschine/SENSOR/#",
            "TasmotaSocket/Trockner/SENSOR/#"
        ]
    },
    "loxone": {
        "host": "dein-loxone-miniserver.local",
        "port": 8002
    },
    "mappings": [
        { "type": "tasmota-energy", "topicSuffix": "SENSOR" }
    ]
}
```

Hinweis: `config.json` wird nicht im Git-Repository gespeichert (`config.example.json` als
Vorlage verwenden). Wer die Bridge selbst auf dem Loxone-/LoxBerry-Host betreibt und eine
_getrennte_ Sende-/Empfangsadresse braucht, kann optional `loxone.sendPort` setzen (Standard:
derselbe Port wie `loxone.port`).

## Start

```sh
npm start
```

oder mit einer beliebigen Konfigurationsdatei:

```sh
node build/bridge.js /pfad/zu/config.json
```

### Umgebungsvariablen als Konfigurations-Override

Für Docker-Deployments kann die Konfigurationsdatei durch Umgebungsvariablen überschrieben werden:

| Variable          | Bedeutung                                           |
|-------------------|-----------------------------------------------------|
| `BRIDGE_CONFIG`   | Pfad zur Konfigurationsdatei                        |
| `LOG_LEVEL`       | `logLevel`                                          |
| `MQTT_URL`        | `mqttBroker.url`                                    |
| `MQTT_USERNAME`   | `mqttBroker.username`                               |
| `MQTT_PASSWORD`   | `mqttBroker.password`                               |
| `MQTT_TLS_VERIFY` | `mqttBroker.tlsVerify` (`false` deaktiviert)        |
| `LOXONE_HOST`     | `loxone.host`                                       |
| `LOXONE_PORT`     | `loxone.port`                                       |

## Loxone-Konfiguration (Virtual UDP Input)

Auf dem Miniserver wurde ein *Virtual UDP Input* angelegt (Screenshots unter `documentation/images`):

![Virtual Input](documentation/images/vInput.png)

Der Port muss `loxone.port` entsprechen (Standard `8002`). Danach je Feld einen *Command Input* anlegen:

![Command Inputs](documentation/images/vInputDetails-Power.png)

## Docker

Das Image wird automatisch via GitHub Actions gebaut
(`docker-image.yml` → `arminradmueller/lxmqttbridge:latest`):

```sh
docker run -v $(pwd)/config.json:/opt/bridge/config.json arminradmueller/lxmqttbridge:latest
```

Alternativ können Umgebungsvariablen statt der gemounteten Config-Datei verwendet werden.
Der Container läuft als unprivilegierter Benutzer (`node`).

## Entwicklung

```sh
npm run dev       # Start mit nodemon + ts-node
npm run lint      # ESLint
npm test          # Build + Unit-Tests
```

Die Unit-Tests liegen unter `test/`. Die Transformationslogik steckt in `transform.ts` als
reine, testbare Funktionen ohne Socket-/Broker-Abhängigkeiten.

## Lizenz

MIT – siehe [LICENSE](LICENSE)
