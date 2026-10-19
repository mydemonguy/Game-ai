# Aetherfall devlog

## 19 October 2026 · overnight build session (versions 4.1 – 4.13)

### New for players, by version

**4.1 – 4.4**
- **Capsule elevators**: a glass tube in a lit shaft. Stand inside to charge it (green for up, amber for down), it fires a beam and launches; it is still glowing when you arrive.
- **Map codes**: every random map has a short code on the pause screen (Crockford base 32, so no I/L/O/U mix-ups). New game → *Map code* plays a friend's map; *Classic map* plays the original hand-built worlds.
- **Shuffle powers** (optional, new-game screen): each world's shrine grants a different power and its gate changes to match. Same order for everyone on the same map code.
- **Story mode**: robots and bosses do 40% less damage.
- **Overcharged robots**: rarer gold-lit versions of Ronin, Crusher, Trooper and Volt (4% of robots in Chapter I, rising to about 19% in the Rift). 1.9× health, hit 25% harder, gold health bar, and they burst into 4 extra Stardust and a shower of coins.
- **Trial rooms**: from Chapter II, one optional side room per world. Three waves heavy with Overcharged robots. Clearing it gives +25 Stardust, a full heal and coins. Sword on the map, a star once cleared.
- **Pause map coloured by district**, with a legend. **Fast travel** picks a world first, then a station.
- Claude's hints on random maps point to the real hollow wall and energy tanks ("to the east and up, in the Hexed Vault").
- Play time and falls are tracked; the victory screen shows them with the map code.
- Title screen shows a random district behind the menu; a one-time *What's new* card after updating.
- New sounds: capsule charge hum, arrival chime, Overcharged sparkle, trial horn.

**4.5 – 4.6**
- **District hazards**: icy districts drop icicle clusters when you pass under (14 damage, regrow after 6 s), smoggy districts vent toxic gas on a cycle with a bubbling warning, neon districts have hazard-striped floor plates that flicker and then arc. Only in the new districts' halls, kept clear of doors, gates, items and machines.
- **Map of the day**: the same map for everyone on a given day.
- **100% completion fixed on random maps** (found by the completionist bot): random worlds had no Chapter VI shrine room, where the classic map keeps the sixth golden egg; it now waits in Chapter VI's first supply cache (old saves get it too). `--gencheck` now verifies every collectible exists exactly once per world.
- **Personal records**: fastest clear per map code and mode, shown on the victory screen.
- Long cards show a "more below" hint at phone font sizes.

**4.7**
- **Robot codex**: pause → Archive → Robot codex. Every robot, guardian and Malakar you meet gets an entry with lore and a fighting tip; "New codex entry" pops up the first time. Kept across games.

**4.8**
- **Feats** (16 now): Untouchable (beat a guardian without a hit), Gold Rush (25 Overcharged robots), Daily Dino, Comet Run (under two hours), Unbroken (no falls), Gauntlet, Golden Gauntlet, Siege Breaker, Archivist (full codex) and more. A gold toast slides in when you earn one.
- **Stats**: lifetime totals (games, sagas completed, play time, falls, robots destroyed, Overcharged, guardians, Stardust) and your fastest clears. Feats, Stats and the codex are on the title screen and in pause → Archive.
- **Golden Gauntlet**: after clearing Boss Rush, the same six fights with every guardian Overcharged (gold glow and health bar, 1.6× health, 25% harder hits; Malakar 1.4×). Separate best time.
- **Void rifts**: the six dark "abyss" districts now have their own hazard. A rift hangs at head height; every 5 s it spins up, drags you toward its core for under 2 s and hurts if you touch it. Dash cancels the pull. Kept clear of platforms, doors, gates and items.
- **Settings**: screen shake Full / Low / Off, an optional run timer, and on phones touch button size (Small / Normal / Large) plus a see-through option. Credits moved to their own card so everything fits on a phone.

**4.9**
- **Map of the day streak**: beat the day's map on consecutive days; the new-game screen shows today's code, your streak and your best.

**4.10**
- **Endless Siege** (title → Challenges): one locked arena, waves that never stop: bigger each wave, more Overcharged robots, an Iron Warden every 10th wave, health back every 5 waves. Best wave is saved, "New best!" pops up when you pass it, Siege Breaker feat at wave 15. Picks one of four arenas (Iron Armory, Orbital Dock, Amber Foundry, Null Citadel) with the same difficulty curve in each.
- **Photo mode**: pause → Photo mode hides the HUD, buttons and menus; tap or press anything to come back. Single-player only.
- **Overcharged hounds and drones**.

**4.11**
- **Aegis Troopers**: from Chapter III (and wave 8 of Endless Siege) about a third of Troopers carry a cyan front shield that blocks every hit while they walk and aim. It drops while they fire and reload, and a Starburst Roar or Ground Slam knocks it out for 4 s. New codex entry.

**4.12**
- **Daily twists**: the Map of the day comes with one twist, picked from the date so everyone gets the same: Overcharged Surge (3× Overcharged robots), Glass Dino (you hit 30% harder, robots 20%), Stardust Rain (double Stardust), Shield Wall (Aegis Troopers from Chapter II, twice as many) or Swarm (one extra robot per wave). Shown on the new-game screen, as a toast when the run starts, and on the pause screen.

**4.13**
- **Pick your dino for Challenges**: Boss Rush, the Golden Gauntlet and Endless Siege can be played as Tyko, Zeph or Rook (the story stays Tyko's).
- Landing page: feature list and new screenshots (Endless Siege, Golden Gauntlet, void rift).

### Under the hood
- The map generator is versioned (`META.gv`). Saves made with version 4.0–4.3 keep exactly the map they started on; a save from 4.6 continues fine on 4.13.
- The last three districts' textures stay cached and the district behind the next door preloads in the background: the bot stress test went from ~45 ms to ~23 ms average frame time under load.

### Bot testing
- **Campaign bot** (`--campaign`): plays a whole game. Fights each lockdown arena from the middle, wakes and fights the shrine guardian, walks to the shrine for the power, opens the ability gate *with that power* (dash into cracked walls, double jump the ledge, roar the laser, slam the plate, claw the crystal), saves, rides the elevator, beats Malakar.
  - `--full` adds completionist mode: opens every tank cage with the right power, double-jumps to high tanks, scratches open hollow walls, takes the egg and Aether core, clears trials, and backtracks by elevator for items that needed a later power.
  - Without `--god` it plays mortal: counts falls and takes *Continue from save* on game over.
  - New test flags this session: `--rift`, `--story`, `--mod=<twist>`, `--aegis` (every Trooper shielded), `--oc`, `--rush`, `--gold`, `--endless`, `--endroom=ID`, `--chalch=zeph|rook`, `--photof=N`, `--showcard=…`.
- **Soak loops** ran all session (random seeds, one line per campaign): every campaign that finished beat Malakar with 0 script errors, across god / mortal / shuffled / completionist / Rift / Story / forced-Aegis modes, plus the classic map at 100%.
- **Co-op campaign**: the host campaign bot played a whole random map with a second player (fight bot) connected from the first room to the Malakar kill: 0 errors on either side. Short host/client runs after each netcode change were clean too.
- **Feats**: real campaigns earned Saga's End, Mixed Up, Comet Run, Unbroken, Gold Rush, Archivist, Fang Hunter and Completionist on their own; the fight bot cleared Boss Rush and the Golden Gauntlet; Endless Siege (no god mode, full loadout) reached wave 26.
- **Balance** (mortal bot, falls per full game): normal 12–15, Story 7, Aegis Troopers 13 (shields blocked 7 hits over a game), Glass Dino at 30%/30% 27 (so the robots' side was cut to 20%). Rift Mode without god mode is very hard for the bot at guardians (26 falls at Bulwark, stuck on Alpha Hound); no errors, left as it is.
- **Performance**: Endless Siege stress test (15,000 frames, ~60 waves of spawns): node count steady at 330–376, average frame time 5–9 ms throughout, so no leaks.
- **Web**: each deployed build loaded in a phone-sized headless browser with no console errors.
- Bugs the bots found this session and that are fixed: random maps could not reach 100% (missing sixth egg); my own feats code errored on a fresh save (caught by the soak loop within one run); off-screen roar waves culled after a bot teleport; completionist ping-pong between worlds.
- `--gencheck=N` (1,000+ seeds clean), `tools/reach_check.py` jump-reachability (50+ seeds clean), `--doorwalk` (all clean).
