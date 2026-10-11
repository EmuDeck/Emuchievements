# Emuchievements 
[![Crowdin](https://badges.crowdin.net/emuchievements/localized.svg)](https://crowdin.com/project/emuchievements)

![Decky Loader](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fplugins.deckbrew.xyz%2Fplugins&query=%24%5B%3F(%40.name%20%3D%3D%20'Emuchievements')%5D.downloads&suffix=%20installs&label=decky&color=3ea6a3)

Decky Loader Steam Deck Plugin for viewing RetroAchievements progress.

## Installation

### Via URL (recommended for this fork)

Decky Loader supports installing a plugin directly from a URL pointing to its release zip. Use:

```
https://github.com/btd1337/Emuchievements/releases/latest/download/Emuchievements.zip
```

This always resolves to the zip attached to the most recent GitHub Release published by the [Build and Release workflow](.github/workflows/release.yml), so you don't need to update the URL when a new version comes out.

### Manual zip install

1. Download `Emuchievements.zip` from the [Releases page](https://github.com/btd1337/Emuchievements/releases).
2. On the Deck, enable **Developer Mode** in Decky Loader's settings.
3. Use **Install Plugin from Zip** and select the downloaded file.

## Building

```bash

pnpm i # Installs dependencies

pnpm package # Builds installable zip file

pnpm start # deploys to your deck if you have your vscode config set up for deployment (developer thing)

```

vscode and intellj IDEA run configs are included

## Translation

If you are multilingual and would like to help translate Emuchievements, please visit the crowdin page and help my american ass

https://crowdin.com/project/emuchievements

ask me over on the decky loader discord for an invite


