# Aetherfall devlog

## 19 October 2026 · overnight build session (versions 4.1 – 4.4)

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
- **Balance check**: playing without god mode, the bot does the same on random maps as on the classic map (12 falls / 3 game overs vs 13 / 3); Chapter III is the hardest on both.

### Under the hood
- The map generator is versioned (`META.gv`). Saves made with version 4.0–4.3 keep exactly the map they started on.
- The last three districts' textures stay cached and the district behind the next door preloads in the background: the bot stress test went from ~45 ms to ~23 ms average frame time under load.

### Bot testing
- **Campaign bot** (`--campaign`): plays a whole game. Fights each lockdown arena from the middle, wakes and fights the shrine guardian, walks to the shrine for the power, opens the ability gate *with that power* (dash into cracked walls, double jump the ledge, roar the laser, slam the plate, claw the crystal), saves, rides the elevator, beats Malakar.
  - `--full` adds completionist mode: opens every tank cage with the right power, double-jumps to high tanks, scratches open hollow walls, takes the egg and Aether core, clears trials, and backtracks by elevator for items that needed a later power.
  - Without `--god` it plays mortal: counts falls and takes *Continue from save* on game over.
- Results so far: 10+ full campaigns on random, shuffled and classic maps all reached and beat Malakar. Bugs it found and that are fixed: off-screen roar waves were culled after a teleport (bot), gates now retried like a player would, completionist ping-pong between worlds (bot), Aether core drops where the guardian dies (bot now reads the real position).
- `--gencheck=N`: builds N random worlds and checks doors, overlaps, room counts and that each shrine is before its gate and the exit after it (1,000+ seeds clean).
- `tools/reach_check.py` (on `--gendump` output): jump-reachability of every door, item and station using the real jump physics (50+ seeds clean; catches broken climbs when platforms are removed).
- `--doorwalk`: walks through every door and checks the landing spot (all clean).
