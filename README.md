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

- ◈ Guardian Arm (tap the label above it to switch weapons)
- II pause and map (also has Sound settings)

Walk into the blue hatches at a room's edge to move to the next room; red hatches stay sealed until the room's lockdown waves are beaten. Green stations save the game. Elevators link the worlds both ways.

Abilities: Comet Dash (I), Sky Scales double jump (II), Starburst Roar (III), Ground Slam (IV), Plasma Claws (V), each found at a shrine. Every shrine is guarded by a boss: Foreman Krell, Bulwark, Alpha Hound, Crucible and the Null Seraph. Beating one wakes the shrine and drops an Aether Core (your hits charge the Aether bar faster). The first save at each world's station downloads its whole map. Pause shows your item completion %. Each world hides 2 Energy Tanks; some need abilities from later worlds, so ride the elevators back to find them all.

Secrets (2.3): every world's climbing shaft has a plate that sounds hollow. Claw it, dash into it or roar at it to open a Starblood Vault holding a Starblood Fang (claws +10% damage each) and a data tablet with a page of clan history (re-read them under Pause → Archive). Wall turrets in the shafts paint you with a laser sight before firing a three-shot burst; swipe the shots back at them. Pausing at a save station you can Fast Travel to any other station you've visited. Beating Malakar unlocks **Rift Mode**, a harder new game: robots hit 45% harder and take more punishment, and the guardians and Malakar have much more health.

Bosses (2.4): every guardian and Malakar is a hand-shaded pixel-art sprite with its own weapon and moveset. Foreman Krell lunges with a hydraulic claw, charges with a drill (and gets stuck if he hits the wall) and sprays rivets. Bulwark blocks every frontal hit with his tower shield, shield-bashes and pounds the floor. The Alpha Hound pounces, spins its bladed tail and sprints on thrusters that leave burning trails. Crucible lobs slag that leaves fire puddles and breathes fire, then overheats and takes double damage while it vents. The Null Seraph blinks beside you for lance thrusts, fires crystal feathers and a halo nova. Malakar adds crescent sword slashes that skim the floor.

Claude (2.4): a friendly archive automaton waits at every save station. Meet him in each world for a short chat and a gift; walk up to him any time for a hint about what to do next (guardian tactics, hidden walls, Energy Tanks, eggs).

Arsenal (2.5): ideas from the all-time great side-scrollers, rebuilt for Aetherfall. **Guardian Arms** (Mega Man style): every guardian you beat gives Tyko its weapon. Rivet Spray, Aegis Shield (eats enemy shots), Thruster Dash, Slag Mortar and Crystal Feathers fire from the new ◈ button and cost Aether; tap the label above it to switch. **Starblood Relics** (Hollow Knight style charms) are sold at **Claude's Exchange** (Shovel Knight style shop) for Stardust, which you earn from coins, robots, arenas and guardians. Equip three at a save station: Lodestone, Swift Talons, Long Claws, Soul Siphon, Stone Scales, Aether Battery, Thorn Hide, Comet Tail, Fury Heart, Lucky Egg. **Boss Rush** (unlocked by beating Malakar): all five guardians and Malakar back to back against the clock, with your relics, on a separate save.

## Changing the game

The game's source is in `game/`: `shell.html` (page, menus and touch controls), `vendor/` (Phaser 3.90, arcade build) and the numbered scripts:
`01_core` input and data · `02_audio` music and sound · `03_art`/`04_textures` art baked into GPU textures · `05_world`/`06_rooms` room layouts, physics bodies, doors and saves ·
`07_actors` player, robots, boss, combat · `08_fx` particles, lights, weather, post-processing · `09_view_room`/`10_view_actors` Phaser display objects · `11_hud` HUD scene · `13_guardians` shrine bosses · `14_bossart` boss pixel art · `15_npc` Claude · `12_flow` screens, game loop and Phaser config.
Run `game/build.sh` to assemble everything into `app/src/main/assets/index.html` (fonts and Phaser embedded for offline play), then push; GitHub builds a new APK and publishes it under **Releases**.

Builds are signed with `app/aetherfall-debug.keystore`, so each new APK installs as an update over the old one. It is a debug key for this hobby project, not for a Play Store release.

## Credits

- Dino sprite: the free dino sprite pack supplied by the project owner (frames packed into `game/sprites/dino.webp` by `game/sprites/make_atlas.py`).
- Fonts: Cinzel and Chakra Petch (SIL Open Font License, see `game/fonts/`).
- Engine: Phaser 3.90 by Phaser Studio (MIT License, see `game/vendor/PHASER-LICENSE.md`).
