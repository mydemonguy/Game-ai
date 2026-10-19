# Aetherfall devlog

## 19 October 2026 · overnight build session (versions 4.1 – 4.12)

### New for players
- **Capsule elevators**: a glass tube in a lit shaft. Stand inside to charge it (green for up, amber for down), it fires a beam and launches; it is still glowing when you arrive.
- **Map codes**: every random map has a short code on the pause screen (Crockford base 32, so no I/L/O/U mix-ups). New game → *Map code* plays a friend's map; *Classic map* plays the original hand-built worlds.
- **Shuffle powers** (optional, new-game screen): each world's shrine grants a different power and its gate changes to match. Same order for everyone on the same map code.
- **Story mode**: robots and bosses do 40% less damage.
- **Overcharged robots**: rarer gold-lit versions of Ronin, Crusher, Trooper and Volt (4% of robots in Chapter I, rising to about 19% in the Rift). 1.9× health, hit 25% harder, gold health bar, and they burst into 4 extra Stardust and a shower of coins.
- **Trial rooms**: from Chapter II, one optional side room per world. Three waves heavy with Overcharged robots. Clearing it gives +25 Stardust, a full heal and coins. Sword on the map, a star once cleared.
- **Pause map coloured by district**, with a legend.
- **Fast travel** picks a world first, then a station (with three stations per world the single list ran off the screen).
- Claude's hints on random maps point to the real hollow wall and energy tanks ("to the east and up, in the Hexed Vault").
- Play time and falls are tracked; the victory screen shows them with the map code.
- Title screen shows a random district behind the menu; a one-time *What's new* card after updating.
- New sounds: capsule charge hum, arrival chime, Overcharged sparkle, trial horn.
- **District hazards** (4.5): icy districts drop icicle clusters when you pass under (14 damage, regrow after 6 s), smoggy districts vent toxic gas on a cycle with a bubbling warning, neon districts have hazard-striped floor plates that flicker and then arc. Only in the new districts' halls, kept clear of doors, gates, items and machines.
- **Map of the day** (4.5): the same map for everyone on a given day.
- **100% completion fixed on random maps** (4.6): found by the completionist bot. Random worlds had no Chapter VI shrine room, where the classic map keeps the sixth golden egg; it now waits in Chapter VI's first supply cache (old saves get it too). `--gencheck` now verifies every collectible exists exactly once per world.
- **Daily twists** (4.12): the Map of the day comes with one twist, picked from the date so everyone gets the same: Overcharged Surge (3× Overcharged robots), Glass Dino (you hit 30% harder, robots 20%; at 30%/30% the mortal bot fell 27 times instead of the usual ~13, so the robots' side was toned down), Stardust Rain (double Stardust), Shield Wall (Aegis Troopers from Chapter II, twice as many) or Swarm (one extra robot per wave). Shown on the new-game screen, as a toast when the run starts, and on the pause screen. Bot: each twist played clean; Stardust Rain doubled the Stardust as expected.
- **Aegis Troopers** (4.11): from Chapter III (and wave 8 of Endless Siege) about a third of Troopers carry a cyan front shield that blocks every hit while they walk and aim. It drops while they fire and reload, and a Starburst Roar or Ground Slam knocks it out for 4 s. New codex entry (16 now). Bot check: 22 blocked hits and 9 shield breaks in one Endless run. A full mortal campaign on 4.11 (seed 31337) beat Malakar with 13 falls, in line with the 12–14 baseline; shields blocked 7 hits over the whole game.
- **Endless Siege** (4.10): title → Challenges. One locked room (the Iron Armory arena), waves that never stop: bigger each wave, more Overcharged robots, an Iron Warden every 10th wave, health back every 5 waves. Best wave is saved; Siege Breaker feat at wave 15. Bot (no god mode, full loadout) reached wave 26.
- Endless Siege stress test (god bot, 15,000 frames, ~60 waves of spawns): node count steady at 330–376 and average frame time 5–9 ms the whole way, so no leaks from the toasts, shields or wave spawns.
- **Photo mode** (4.10): pause → Photo mode hides the HUD, buttons and menus so you can screenshot the scene; tap or press anything to come back. Single-player only.
- **Overcharged hounds and drones** (4.10): they can now spawn gold-lit too, with the same extra health, damage and Stardust.
- **Map of the day streak** (4.9): beat the day's map on consecutive days to build a streak; the new-game screen shows today's code, your streak and your best.
- **Personal records** (4.6): fastest clear per map code and mode, shown on the victory screen.
- Long cards show a "more below" hint at phone font sizes.
- **Robot codex** (4.7): pause → Archive → Robot codex. Every robot, guardian and Malakar you meet gets an entry with lore and a fighting tip; "New codex entry" pops up the first time. Kept across games.
- **Golden Gauntlet** (4.8): after clearing Boss Rush, pick the Golden Gauntlet: the same six fights with every guardian Overcharged (gold glow and health bar, 1.6× health, 25% harder hits; Malakar 1.4×). Separate best time.
- **Feats** (4.8, 16 since 4.10): achievements (Untouchable: beat a guardian without a hit; Gold Rush: 25 Overcharged robots; Daily Dino; Comet Run: under two hours; Unbroken: no falls; Gauntlet: Boss Rush; Golden Gauntlet; Archivist: full codex, and more). A gold toast slides in when you earn one. Feats & codex are on the title screen too.
- **Stats** (4.8): lifetime totals (games, sagas completed, play time, falls, robots destroyed, Overcharged, guardians, Stardust) and your fastest clears per map, next to Feats in the Archive.
- **Settings** (4.8): screen shake Full / Low / Off, and an optional run timer under the chapter name (handy for Comet Run). On phones: **touch button size** (Small / Normal / Large) and a **see-through** option. Credits moved to their own card so everything fits on a phone.
- **Void rifts** (4.8): the six dark "abyss" districts (Glacial Bastion, Hollow Foundry, Verdant Spire, Tidal Relay, Radiant Conduit…) now have their own hazard. A rift hangs at head height; every 5 s it spins up, drags you toward its core for under 2 s and hurts if you touch it. Dash cancels the pull. Kept clear of platforms, doors, gates and items.
- **Balance check**: playing without god mode, the bot does the same on random maps as on the classic map (12 falls / 3 game overs vs 13 / 3); Chapter III is the hardest on both.

### Under the hood
- The map generator is versioned (`META.gv`). Saves made with version 4.0–4.3 keep exactly the map they started on.
- The last three districts' textures stay cached and the district behind the next door preloads in the background: the bot stress test went from ~45 ms to ~23 ms average frame time under load.

### Bot testing
- **Campaign bot** (`--campaign`): plays a whole game. Fights each lockdown arena from the middle, wakes and fights the shrine guardian, walks to the shrine for the power, opens the ability gate *with that power* (dash into cracked walls, double jump the ledge, roar the laser, slam the plate, claw the crystal), saves, rides the elevator, beats Malakar.
  - `--full` adds completionist mode: opens every tank cage with the right power, double-jumps to high tanks, scratches open hollow walls, takes the egg and Aether core, clears trials, and backtracks by elevator for items that needed a later power.
  - Without `--god` it plays mortal: counts falls and takes *Continue from save* on game over.
- Results so far: 10+ full campaigns on random, shuffled and classic maps all reached and beat Malakar. Bugs it found and that are fixed: off-screen roar waves were culled after a teleport (bot), gates now retried like a player would, completionist ping-pong between worlds (bot), Aether core drops where the guardian dies (bot now reads the real position).
- **Co-op campaign** (4.10 test): the host campaign bot played a whole random map (seed 4242) with a second player (Rook, fight bot) connected from the first room to the Malakar kill: 0 errors on either side.
- 4.8 checks: a shuffled-powers campaign on the new code earned Saga's End, Mixed Up, Comet Run, Unbroken, Gold Rush and Archivist on its own, and a completionist run (seed 8086, shuffled) added Fang Hunter and Completionist; the fight bot cleared Boss Rush and the Golden Gauntlet (Gauntlet + Golden Gauntlet feats); co-op host/client run clean; deployed web build loads with no console errors.
- `--gencheck=N`: builds N random worlds and checks doors, overlaps, room counts and that each shrine is before its gate and the exit after it (1,000+ seeds clean).
- `tools/reach_check.py` (on `--gendump` output): jump-reachability of every door, item and station using the real jump physics (50+ seeds clean; catches broken climbs when platforms are removed).
- `--doorwalk`: walks through every door and checks the landing spot (all clean).
