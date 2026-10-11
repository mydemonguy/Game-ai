# Aetherfall – Android project

A 1080p sci-fi fantasy side-scrolling brawler: 6 chapters and a final boss fight against Malakar, the Void Sovereign.
It runs fully offline, in landscape, with the system bars hidden.

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
- » Dash (you can't be hit while dashing)
- II pause

## Changing the game

The game's source is in `web/` (p1.html = page + touch controls, p2–p5 = game code).
Run `web/build.sh` to assemble it into `app/src/main/assets/index.html` (fonts embedded for offline play), then push; GitHub builds a new APK and publishes it under **Releases**.

Builds are signed with `app/aetherfall-debug.keystore`, so each new APK installs as an update over the old one. It is a debug key for this hobby project, not for a Play Store release.
