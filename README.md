# Projet Bot Discord - Infrastructure

Projet d'infrastructure composé d'un bot Discord et d'une API HTTP déployables sur deux machines virtuelles distinctes. Le bot reçoit des commandes en message privé ou dans les serveurs Discord et délègue la récupération de la météo à l'API interne.

## Sommaire

- [Projet Bot Discord - Infrastructure](#projet-bot-discord---infrastructure)
  - [Sommaire](#sommaire)
  - [Architecture](#architecture)
  - [Fonctionnalités](#fonctionnalités)
  - [Prérequis](#prérequis)
  - [Installation du bot dans un serveur](#installation-du-bot-dans-un-serveur)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Bot Discord - VM1](#bot-discord---vm1)
    - [API météo - VM2](#api-météo---vm2)
  - [Démarrage](#démarrage)
    - [Démarrage en développement](#démarrage-en-développement)
  - [Déploiement avec PM2](#déploiement-avec-pm2)
  - [API HTTP](#api-http)
    - [`GET /api/weather`](#get-apiweather)
  - [Communication entre les machines virtuelles](#communication-entre-les-machines-virtuelles)
  - [Structure du projet](#structure-du-projet)
  - [Dépannage](#dépannage)
    - [Le bot ne se connecte pas](#le-bot-ne-se-connecte-pas)
    - [La commande `/weather` ou `!weather` échoue](#la-commande-weather-ou-weather-échoue)
    - [Les commandes slash n'apparaissent pas](#les-commandes-slash-napparaissent-pas)
    - [Vérifier le typage de l'API](#vérifier-le-typage-de-lapi)

## Architecture

```text
Utilisateur Discord
        │
        │ DM ou serveur : /ping, /weather
        ▼
┌─────────────────────┐       HTTP       ┌─────────────────────┐
│ VM1 - Bot Discord   │ ───────────────▶ │ VM2 - API météo     │
│ vm1-bot              │  /api/weather   │ vm2-api             │
└─────────────────────┘                  └──────────┬──────────┘
                                                    │ HTTP
                                                    ▼
                                            Open-Meteo API
```

- **VM1 (`vm1-bot`)** : connexion à Discord, réception des commandes en DM ou dans les serveurs et envoi des réponses dans le canal d'origine.
- **VM2 (`vm2-api`)** : serveur Express exposé sur le port `3000`, récupération des données auprès d'Open-Meteo et formatage de la réponse.
- **Open-Meteo** : service externe utilisé comme source des données météorologiques.

## Fonctionnalités

- Connexion sécurisée du bot à Discord grâce à un token stocké dans une variable d'environnement.
- Notification envoyée à l'utilisateur configuré lorsque le bot est connecté.
- Commandes slash `/ping` et `/weather`.
- Compatibilité temporaire avec `!ping` et `!weather`.
- API REST séparée entre les deux machines virtuelles.
- Journalisation des erreurs côté bot et côté API.

## Prérequis

- Node.js 24.x recommandé (version utilisée par `vm2-api`).
- npm.
- Un bot créé dans le [Discord Developer Portal](https://discord.com/developers/applications).
- Deux machines virtuelles capables de communiquer sur le réseau.
- Un identifiant utilisateur Discord pour la personne qui doit recevoir les notifications.

Les intents **Guilds**, **Guild Messages**, **Direct Messages** et **Message Content** sont utilisés par le bot. Activez **Message Content Intent** dans le Discord Developer Portal si vous souhaitez conserver les anciennes commandes `!ping` et `!weather`. Le token ne doit jamais être ajouté au dépôt.

## Installation du bot dans un serveur

Dans le Discord Developer Portal, ouvrez **OAuth2 > URL Generator** et sélectionnez les scopes :

- `bot`
- `applications.commands`

Accordez au bot uniquement les permissions nécessaires :

- **View Channels**
- **Send Messages**
- **Read Message History** (utile pour les commandes préfixées)

Après l'installation, les commandes `/ping` et `/weather` apparaissent dans le serveur et restent également utilisables en DM. L'enregistrement global peut prendre quelques minutes après la première connexion du bot.

## Installation

Cloner le dépôt puis installer les dépendances de chaque composant :

```bash
git clone <URL_DU_DEPOT>
cd projet-bot-discord-infra

cd vm1-bot
npm install

cd ../vm2-api
npm install
```

## Configuration

### Bot Discord - VM1

Créer un fichier `vm1-bot/.env` :

```dotenv
TOKEN=votre_token_discord
USER_ID=votre_identifiant_utilisateur_discord
API_URL=http://ADRESSE_IP_VM2:3000
```

| Variable | Description |
| --- | --- |
| `TOKEN` | Token privé du bot Discord. |
| `USER_ID` | Identifiant Discord du destinataire des notifications. |
| `API_URL` | URL de base de l'API exécutée sur VM2. |

### API météo - VM2

Aucune variable d'environnement n'est actuellement requise par l'API. Les coordonnées de la HE Vinci et le fuseau horaire `Europe/Brussels` sont définis dans la route météo.

## Démarrage

### Démarrage en développement

Sur **VM2**, démarrer l'API :

```bash
cd vm2-api
npm run dev
```

Sur **VM1**, démarrer le bot :

```bash
cd vm1-bot
npm run dev
```

L'API doit être démarrée avant d'utiliser `/weather` ou `!weather` depuis Discord.

## Déploiement avec PM2

Sur chaque VM, installer PM2 globalement si ce n'est pas déjà fait :

```bash
npm install --global pm2
```

Après avoir installé les dépendances (`npm install`) dans chaque dossier et configuré `vm1-bot/.env`, démarrer les applications depuis le dossier correspondant.

Sur **VM1**, depuis `vm1-bot`, compiler d'abord le bot puis le démarrer :

```bash
npm run build
pm2 start npm --name vm1-bot -- run start
```

Sur **VM2**, depuis `vm2-api` :

```bash
pm2 start npm --name vm2-api -- run start
```

Vérifier l'état et consulter les journaux avec :

```bash
pm2 status
pm2 logs vm1-bot
pm2 logs vm2-api
```

Après avoir ajouté ou modifié la liste des applications PM2, enregistrer l'état pour le restaurer au redémarrage de la VM :

```bash
pm2 save
```

Pour activer le démarrage automatique de PM2 au démarrage de la VM, exécuter `pm2 startup`, puis suivre la commande que PM2 affiche. Exécuter ensuite `pm2 save`.

Après avoir modifié le code, redémarrer l'application concernée pour appliquer les changements :

```bash
pm2 restart vm1-bot
# Sur VM2, utiliser plutôt :
pm2 restart vm2-api
```

## API HTTP

### `GET /api/weather`

Retourne la météo actuelle à la HE Vinci au format JSON.

**Exemple de requête :**

```bash
curl http://ADRESSE_IP_VM2:3000/api/weather
```

**Exemple de réponse :**

```json
"Météo actuelle à la HE Vinci: 14.2\nConditions: pluie\n"
```

Codes de réponse principaux :

| Code | Signification |
| --- | --- |
| `200` | Météo récupérée avec succès. |
| `502` | Le service Open-Meteo est indisponible ou sa réponse est invalide. |

## Communication entre les machines virtuelles

L'API écoute sur `0.0.0.0:3000` afin d'être accessible depuis VM1. Pour limiter l'exposition réseau, autoriser uniquement l'adresse IP de VM1 sur VM2 :

```bash
sudo ufw allow from ADRESSE_IP_VM1 to any port 3000 proto tcp
sudo ufw status
```

Remplacer `ADRESSE_IP_VM1` par l'adresse réelle de VM1 et `ADRESSE_IP_VM2` dans `API_URL` par l'adresse réelle de VM2. Éviter d'ouvrir le port `3000` à Internet (`0.0.0.0/0`) lorsque ce n'est pas nécessaire.

## Structure du projet

```text
.
├── vm1-bot/
│   ├── src/
│   │   └── index.ts          # Client Discord et commandes
│   ├── package.json
│   └── tsconfig.json
├── vm2-api/
│   ├── routes/
│   │   └── router.ts         # Route GET /api/weather
│   ├── app.ts                # Serveur Express
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Dépannage

### Le bot ne se connecte pas

1. Vérifier que `TOKEN`, `USER_ID` et `API_URL` sont présents dans `vm1-bot/.env`.
2. Vérifier que le token est toujours valide dans le Discord Developer Portal.
3. Vérifier que les intents nécessaires sont activés.
4. Relancer le bot après toute modification du fichier `.env`.

### La commande `/weather` ou `!weather` échoue

1. Vérifier que l'API est démarrée sur VM2.
2. Tester directement `http://ADRESSE_IP_VM2:3000/api/weather` depuis VM1.
3. Vérifier la règle UFW et l'adresse utilisée dans `API_URL`.
4. Vérifier l'accès sortant de VM2 vers `api.open-meteo.com`.

### Les commandes slash n'apparaissent pas

1. Vérifier que le bot a été invité avec les scopes `bot` et `applications.commands`.
2. Vérifier que le bot possède **View Channels** et **Send Messages** dans le salon.
3. Vérifier les logs de VM1 lors de l'enregistrement des commandes.
4. Attendre quelques minutes, car les commandes sont enregistrées globalement.

### Vérifier le typage de l'API

```bash
cd vm2-api
npm run typecheck
```
