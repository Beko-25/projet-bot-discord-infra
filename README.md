# Projet Bot Discord - Infrastructure

Projet composé d'un bot Discord et d'une API HTTP répartis sur deux machines
virtuelles :

- **VM1 (`vm1-bot`)** : se connecte à Discord et répond aux utilisateurs.
- **VM2 (`vm2-api`)** : expose les routes HTTP et appelle les services externes.

Le bot utilise l'API interne de VM2 pour récupérer la météo, une blague ou une
réponse générée par Groq.

## Sommaire

- [Architecture](#architecture)
- [Fonctionnement](#fonctionnement)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Installation du bot dans Discord](#installation-du-bot-dans-discord)
- [Démarrage](#démarrage)
- [API HTTP de VM2](#api-http-de-vm2)
- [Réseau entre les VM](#réseau-entre-les-vm)
- [Structure du projet](#structure-du-projet)
- [Dépannage](#dépannage)
- [Sécurité](#sécurité)

## Architecture

```text
Utilisateur Discord
        │
        │ DM ou serveur Discord
        ▼
┌─────────────────────┐       HTTP privé       ┌────────────────────────┐
│ VM1 - Bot Discord   │ ─────────────────────▶ │ VM2 - API Express      │
│ vm1-bot             │  /api/weather          │ vm2-api                │
│                     │  /api/joke             │                        │
│                     │  /api/groq             │                        │
└─────────────────────┘                       └───────────┬────────────┘
                                                           │
                             ┌─────────────────────────────┼────────────────────┐
                             │                             │                    │
                             ▼                             ▼                    ▼
                       Open-Meteo                    Groq API          Official Joke API
```

VM1 ne contacte pas directement Groq, Open-Meteo ou Official Joke API.
VM1 appelle VM2, et VM2 appelle les services externes.

## Fonctionnement

### Messages libres

Tout message texte envoyé par un utilisateur dans un DM ou dans un salon
accessible au bot est envoyé à Groq :

```text
Explique simplement ce qu'est une API REST
```

Le bot répond dans le même canal. Les messages envoyés par d'autres bots sont
ignorés.

### Commandes slash

| Commande | Fonctionnement |
| --- | --- |
| `/ping` | Vérifie que le bot répond. |
| `/weather` | Affiche la météo actuelle à la HE Vinci. |
| `/joke` | Récupère une blague depuis Official Joke API. |

Les commandes sont enregistrées globalement par VM1 lorsque le bot se connecte.
Après un premier démarrage, leur apparition dans Discord peut prendre quelques
minutes.

## Prérequis

- Node.js 24.x recommandé.
- npm.
- Deux VM capables de communiquer sur le réseau privé.
- Un bot créé dans le [Discord Developer Portal](https://discord.com/developers/applications).
- Une clé API Groq.
- Un identifiant utilisateur Discord pour la notification de connexion.

## Installation

Cloner le dépôt puis installer les dépendances sur chaque VM :

```bash
git clone <URL_DU_DEPOT>
cd projet-bot-discord-infra
```

Sur **VM1** :

```bash
cd vm1-bot
npm install
```

Sur **VM2** :

```bash
cd vm2-api
npm install
```

## Configuration

### VM1 : bot Discord

Créer `vm1-bot/.env` :

```dotenv
TOKEN=votre_token_discord
USER_ID=votre_identifiant_utilisateur_discord
API_URL=http://ADRESSE_IP_VM2:3000
```

| Variable | Description |
| --- | --- |
| `TOKEN` | Token privé du bot Discord. |
| `USER_ID` | Utilisateur qui reçoit le message de connexion du bot. |
| `API_URL` | Adresse de base de l'API sur VM2. |

`API_URL` doit pointer vers VM2, jamais vers `localhost` si les VM sont
distinctes. Il est recommandé de ne pas mettre de slash final :

```dotenv
API_URL=http://192.168.56.102:3000
```

### VM2 : API et Groq

Créer `vm2-api/.env` :

```dotenv
GROQ_API_KEY=votre_cle_groq
```

La clé est lue par `dotenv/config` dans la route API. Elle ne doit jamais être
commise ou envoyée dans Discord.

## Installation du bot dans Discord

Dans le Discord Developer Portal :

1. Ouvrir l'application du bot.
2. Dans **Bot > Privileged Gateway Intents**, activer **Message Content Intent**.
3. Dans **OAuth2 > URL Generator**, sélectionner les scopes :
   - `bot`
   - `applications.commands`
4. Accorder au bot ces permissions minimales :
   - **View Channels**
   - **Send Messages**
   - **Read Message History**
5. Ouvrir le lien généré et choisir le serveur.

Les intents utilisés par VM1 sont :

- `Guilds` pour les serveurs et les commandes slash ;
- `GuildMessages` pour les messages des salons ;
- `DirectMessages` pour les DM ;
- `MessageContent` pour lire le texte envoyé à Groq.

## Démarrage

Toujours démarrer VM2 avant d'utiliser les fonctionnalités qui appellent
l'API.

### VM2 en développement

```bash
cd vm2-api
npm run dev
```

Le serveur écoute sur `0.0.0.0:3000`.

### VM1 en développement

```bash
cd vm1-bot
npm run dev
```

### VM1 hors développement

```bash
cd vm1-bot
npm run build
npm start
```

### VM2 hors développement

```bash
cd vm2-api
npm start
```

Ne lancez qu'une seule instance du bot Discord avec le même token. Plusieurs
instances peuvent provoquer des erreurs Discord comme
`Interaction has already been acknowledged`.

## API HTTP de VM2

L'API est montée avec le préfixe `/api` dans
[`vm2-api/app.ts`](C:/VScode/projet-bot-discord-infra/vm2-api/app.ts).

### `GET /api/weather`

Appelle Open-Meteo et retourne la météo actuelle à la HE Vinci.

```bash
curl http://ADRESSE_IP_VM2:3000/api/weather
```

Réponse :

```json
"Météo actuelle à la HE Vinci: 14.2\nConditions: pluie\n"
```

### `GET /api/joke`

Appelle Official Joke API et retourne une blague :

```bash
curl http://ADRESSE_IP_VM2:3000/api/joke
```

### `POST /api/groq`

Reçoit un message dans le JSON, l'envoie à Groq et retourne la réponse :

```bash
curl -X POST http://ADRESSE_IP_VM2:3000/api/groq \
  -H "Content-Type: application/json" \
  -d '{"message":"Explique simplement ce qu est une API REST"}'
```

Réponse :

```json
{
  "response": "Une API REST est..."
}
```

La route utilise un message système pour demander à Groq de répondre en
français, de manière claire, concise et compatible avec le Markdown Discord.

## Réseau entre les VM

VM2 écoute sur toutes ses interfaces avec :

```ts
app.listen(3000, "0.0.0.0")
```

Sur VM2, autoriser uniquement l'adresse de VM1 :

```bash
sudo ufw allow from ADRESSE_IP_VM1 to any port 3000 proto tcp
sudo ufw status
```

Ne pas ouvrir le port `3000` à Internet avec une règle générale
`0.0.0.0/0`.

### Tester VM1 vers VM2

Depuis VM1 :

```bash
curl http://ADRESSE_IP_VM2:3000/api/weather
curl http://ADRESSE_IP_VM2:3000/api/joke
curl -X POST http://ADRESSE_IP_VM2:3000/api/groq \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour"}'
```

## Structure du projet

```text
.
├── vm1-bot/
│   ├── src/
│   │   └── index.ts       # Client Discord, commandes et appels VM2
│   ├── package.json
│   ├── tsconfig.json
│   └── .env               # Non versionné
├── vm2-api/
│   ├── routes/
│   │   └── router.ts      # Routes weather, joke et groq
│   ├── app.ts             # Serveur Express sur le port 3000
│   ├── package.json
│   ├── tsconfig.json
│   └── .env               # Non versionné
└── README.md
```

## Dépannage

### `GROQ_API_KEY` est obligatoire

Vérifier que `vm2-api/.env` existe et contient :

```dotenv
GROQ_API_KEY=votre_cle_groq
```

Démarrer la commande depuis le dossier `vm2-api` :

```bash
npm start
```

### VM1 reçoit une réponse `404`

Vérifier :

1. que VM2 utilise la version actuelle du projet ;
2. que VM2 est démarrée ;
3. que `API_URL` pointe vers VM2 ;
4. que le chemin appelé existe (`/api/groq`, `/api/joke` ou `/api/weather`) ;
5. que le test `curl` depuis VM1 fonctionne.

`localhost` dans `API_URL` désigne la machine qui exécute VM1, pas VM2.

### VM1 reçoit une réponse `502`

VM1 atteint VM2, mais VM2 n'a pas réussi à appeler le service externe.
Consulter les logs de VM2 et vérifier son accès Internet, la clé Groq ou la
disponibilité du service concerné.

### Les commandes slash n'apparaissent pas

Vérifier :

1. le scope `applications.commands` lors de l'invitation ;
2. les logs `commandes slash enregistrées` dans VM1 ;
3. les permissions du bot dans le serveur ;
4. le délai de propagation global de Discord.

### `Interaction has already been acknowledged`

Arrêter les instances du bot déjà lancées et ne conserver qu'un seul processus
VM1 actif avec le token Discord.

### Vérifier le typage

VM1 :

```bash
cd vm1-bot
npm run build
```

VM2 :

```bash
cd vm2-api
npm run typecheck
```

## Sécurité

- Ne jamais commiter `.env`.
- Ne jamais publier `TOKEN` ou `GROQ_API_KEY`.
- Si une clé est exposée, la révoquer et en générer une nouvelle immédiatement.
- Limiter le port `3000` à l'adresse IP de VM1.
- Ne pas afficher les secrets dans les logs.
- Prévoir HTTPS et une authentification si l'API doit sortir du réseau privé.

## Évolutions possibles

- Ajouter `GET /health` pour superviser VM2.
- Ajouter une authentification entre VM1 et VM2.
- Limiter les messages libres à un salon Discord dédié.
- Conserver un historique de conversation par utilisateur.
- Ajouter des tests automatisés pour VM1 et VM2.
- Utiliser des commandes Discord locales pendant le développement pour les voir
  immédiatement, puis les enregistrer globalement en production.
