# 📚 EMSI File — Mobile App

Application mobile React Native (Expo) pour la gestion de cours via Cloudflare R2.  
Version Android (APK) et iOS (IPA).

## Fonctionnalités

- 📂 **Navigation des Buckets** — Liste tous les buckets R2 avec navigation dans les dossiers
- 👁️ **Aperçu de fichiers** — Prévisualisation d'images, vidéos, audio, PDF
- ⬇️ **Téléchargement** — Télécharger les fichiers pour accès hors-ligne
- 📤 **Partage** — Partager les fichiers avec d'autres applications
- 🌐 **Mode Online/Offline** — Fonctionne avec ou sans connexion internet
- 🌙 **Thème sombre/clair** — Basculement automatique ou manuel
- 🔍 **Recherche** — Recherche rapide dans les buckets et fichiers

## Configuration requise

- Node.js 20+
- Expo CLI
- EAS CLI (pour les builds)
- Compte Expo (gratuit)
- Compte Apple Developer (pour iOS, $99/an)

## Installation locale

```bash
# Cloner le repo
git clone https://github.com/AbdooMrini/emsi-file.git
cd emsi-file

# Installer les dépendances
npm install

# Générer les assets placeholder
node scripts/generate-assets.js

# Lancer en développement
npx expo start
```

## Build (APK & IPA)

### Prérequis

1. **Créer un compte Expo** : [expo.dev](https://expo.dev)
2. **Installer EAS CLI** : `npm install -g eas-cli`
3. **Se connecter** : `eas login`

### Build Android (APK)

```bash
# Build APK directement
eas build --platform android --profile preview

# Ou build de production
eas build --platform android --profile production
```

### Build iOS (IPA)

```bash
# Première fois : configurer les credentials Apple
eas credentials --platform ios

# Build
eas build --platform ios --profile production
```

### Configuration Apple Developer

Pour distribuer sur iOS, vous devez :

1. **S'inscrire au Apple Developer Program** : [developer.apple.com](https://developer.apple.com/programs/)
2. **Créer un App ID** dans le portail développeur avec le bundle identifier `com.abdoomrini.emsifile`
3. **Configurer les certificats** — EAS gère automatiquement les certificats de distribution

```bash
# Configuration automatique des credentials
eas credentials --platform ios

# Sélectionner : "Build Credentials" → "Distribution Certificate" → "Generate new"
# Sélectionner : "Provisioning Profile" → "Generate new"
```

4. **Mettre à jour eas.json** avec votre Team ID Apple :

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "abdelqedous.mrini@gmail.com",
        "ascAppId": "VOTRE_APP_ID",
        "appleTeamId": "VOTRE_TEAM_ID"
      }
    }
  }
}
```

## GitHub Actions (CI/CD)

Les builds sont automatisés via GitHub Actions. Configurez les secrets :

### Secrets à configurer

Dans **GitHub → Settings → Secrets → Actions** :

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Token d'accès Expo ([expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)) |

### Obtenir le EXPO_TOKEN

1. Aller sur [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Créer un nouveau token
3. L'ajouter comme secret GitHub `EXPO_TOKEN`

### Déclencher un build

Les builds se déclenchent automatiquement sur chaque push vers `main`, ou manuellement via l'onglet "Actions" de GitHub.

## Architecture

```
app/
├── _layout.tsx          # Layout racine + navigation
├── index.tsx            # Écran d'accueil — liste des buckets
├── bucket/[name].tsx    # Contenu d'un bucket — fichiers & dossiers
├── viewer.tsx           # Aperçu de fichier
├── downloads.tsx        # Fichiers téléchargés (hors-ligne)
└── settings.tsx         # Paramètres

components/
├── BucketCard.tsx       # Carte de bucket
├── FileItem.tsx         # Élément de fichier
├── FolderItem.tsx       # Élément de dossier
├── FileActionSheet.tsx  # Menu d'actions fichier
├── EmptyState.tsx       # État vide
├── LoadingState.tsx     # État de chargement
├── NetworkBanner.tsx    # Bannière hors-ligne
└── SearchBar.tsx        # Barre de recherche

services/
├── signer.ts            # AWS Signature V4
├── s3.ts                # Client S3 pour Cloudflare R2
└── offlineManager.ts    # Gestion du cache et téléchargements

context/
├── NetworkContext.tsx    # Contexte réseau (online/offline)
└── ThemeContext.tsx      # Contexte thème (clair/sombre)

constants/
├── config.ts            # Configuration R2
├── colors.ts            # Palette de couleurs
└── fileTypes.ts         # Types de fichiers + helpers
```

## Stack Technique

- **React Native** (Expo SDK 52)
- **expo-router** — Navigation fichier-based
- **expo-file-system** — Téléchargement & cache
- **expo-sharing** — Partage natif
- **expo-av** — Lecture audio/vidéo
- **crypto-js** — Signature AWS V4
- **fast-xml-parser** — Parsing des réponses S3 XML
- **@react-native-community/netinfo** — Détection réseau
- **@react-native-async-storage/async-storage** — Stockage local

## Développé par

**Mrini Abdo** — [abdomrini.dev](https://abdomrini.dev)
