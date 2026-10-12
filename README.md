# Aetherfall – Android project

A 1080p sci-fi fantasy action-explorer: six worlds of connected rooms (Super Metroid-style map), abilities that open new paths, and a final boss fight against Malakar, the Void Sovereign. Synthesised music for every world with a combat layer during lockdowns, plus layered sound effects.
It runs fully offline, in landscape, with the system bars hidden. Since version 2.0 it runs on the **Phaser 3** game engine (WebGL): Arcade physics, GPU particles for weather and impacts, a real-time light map, bloom and vignette post-processing, and cut-out robot rigs animated as Phaser containers. Settings has a Graphics switch: High draws at full screen resolution, Balanced (default) and Fast draw fewer pixels and let the screen stretch them up. The game steps down by itself if the frame rate dips, and asks Android for a 60 Hz display mode so 90/120 Hz screens don't double the work.

## Option A: Build on GitHub (no computer setup needed)

1. Create a free account at github.com and make a new **empty** repository (for example `aetherfall`).
2. On the repository page, choose **Add file → Upload files**. Unzip this project and drag in **everything inside the `Aetherfall` folder**, including the hidden `.github` folder.
   If your phone or computer hides the `.github` folder, upload the other files first. Then choose **Add file → Create new file**, name it `.github/workflows/build-apk.yml`, and paste in that file's contents.
3. Open the **Actions** tab. The "Build Aetherfall APK" job starts by itself; if it doesn't, click it and press **Run workflow**. It takes about 3–5 minutes.
4. When it shows a green check, open the run and download **Aetherfall-apk** under *Artifacts*. Unzip it to get `app-debug.apk`.

## Option B: Build with Android Studio

1. Install Android Studio (free) from developer.android.com/studio.
2. **File → Open** and pick the `Aetherfall` folder. Let it sync; accept any prompt to download SDK 34.
3. **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
4. The APK is at `app/build/outputs/apk/debug/app-debug.apk`.

## Installing on your phone

1. Copy `app-debug.apk` to the phone, or download it there directly.
2. Tap it. Android will ask you to allow installs from that app (Files or Chrome). Allow it, then tap **Install**.
3. Play Protect may warn that the developer is unknown. This is normal for any app you build yourself; choose **Install anyway**.

## Controls

- Thumbstick (touch anywhere on the left side and slide) to move
- ▲ jump (tap again in the air to double jump)
- ⚔ strike (tap 3× for a combo; slash enemy orbs to reflect them)
- ✦ Starburst (uses half the Aether bar; the ring around the button shows it)
- » Dash (you can't be hit while dashing), unlocked in Chapter I
- Pull the stick down to drop through catwalks; down + strike in the air is the Ground Slam (Chapter IV)

- II pause and map (also has Sound settings)

Walk into the blue hatches at a room's edge to move to the next room; red hatches stay sealed until the room's lockdown waves are beaten. Green stations save the game. Elevators link the worlds both ways.

Abilities: Comet Dash (I), Sky Scales double jump (II), Starburst Roar (III), Ground Slam (IV), Plasma Claws (V), each found at a shrine. Each world hides 2 Energy Tanks; some need abilities from later worlds, so ride the elevators back to find them all.

## Changing the game

The game's source is in `game/`: `shell.html` (page, menus and touch controls), `vendor/` (Phaser 3.90, arcade build) and the numbered scripts:
`01_core` input and data · `02_audio` music and sound · `03_art`/`04_textures` art baked into GPU textures · `05_world`/`06_rooms` room layouts, physics bodies, doors and saves ·
`07_actors` player, robots, boss, combat · `08_fx` particles, lights, weather, post-processing · `09_view_room`/`10_view_actors` Phaser display objects · `11_hud` HUD scene · `12_flow` screens, game loop and Phaser config.
Run `game/build.sh` to assemble everything into `app/src/main/assets/index.html` (fonts and Phaser embedded for offline play), then push; GitHub builds a new APK and publishes it under **Releases**.

Builds are signed with `app/aetherfall-debug.keystore`, so each new APK installs as an update over the old one. It is a debug key for this hobby project, not for a Play Store release.

## Credits

- Dino sprite: the free dino sprite pack supplied by the project owner (frames packed into `game/sprites/dino.webp` by `game/sprites/make_atlas.py`).
- Fonts: Cinzel and Chakra Petch (SIL Open Font License, see `game/fonts/`).
- Engine: Phaser 3.90 by Phaser Studio (MIT License, see `game/vendor/PHASER-LICENSE.md`).
