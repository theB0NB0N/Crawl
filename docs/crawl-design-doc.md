# Crawl Design Doc

Last updated: 2026-10-27

## Vision and tone

Crawl is a solo, text-based dungeon crawl in the style of Dungeon Crawler Carl, run by a sarcastic System AI. It is a personal project for Will and maybe a friend or two, never for profit, built as a phone-first web app.

- Fast and punchy: short turns, narrative fights, and failed checks that do not always cost HP.
- The System is the star: cheerful cruelty, absurd rules, running jokes.
- Fans (the audience) appear only occasionally, so they stay special.
- DCC-style structure: inventory tabs, frequent achievements, loot boxes kept separate, a fog-of-war map, and five trinket slots.
- Fully original content and names, with DCC as the flavor, not the source.

## Character creation

You play a human crawler, choose your own name and class, and start at level 1. The class list comes from the books, narrowed to 20 that work in a solo, text-based phone game.

**Flow**

1. Intake: the System asks your name and confirms your species. It is always human.
2. Class choice: pick one of the 20 classes below. The System insults your choice.
3. Stats: all five stats start at 10, then the class adds +2 to its primary stat.
4. Starting kit: class gear, one junk "Welcome Gift", and one trinket.
5. First achievement plus a bronze loot box, so both systems are taught immediately.

**Classes**

| # | Class | From the books | Primary | Game hook (my design) |
| --- | --- | --- | --- | --- |
| 1 | Compensated Anarchist | Carl's class | DEX | Builds bombs and traps from junk; weak in a straight fight. |
| 2 | Prizefighter | Monk-based, Earth class | STR | Combo strikes; bonus when unarmed and unarmored. |
| 3 | Agent Provocateur | Carl, Floor 6 | CHA | Bait enemies into fighting each other and frame rivals; trouble follows every room you enter. |
| 4 | Origamist | Justice Light | INT | Folds paper from scrolls, flyers, and junk into one-use constructs; running out of paper is the limit. |
| 5 | Shieldmaiden | Hekla | CON | Blocks reduce damage and protect pets. |
| 6 | Football Hooligan | Donut, Floor 4 | STR | Chaos: extra damage when outnumbered, plus property damage. |
| 7 | Roller Derby Jammer | Earth class | DEX | High evasion; shoulder-checks knock enemies off balance. |
| 8 | Monster Truck Driver | Katia Grim | STR | Summon a truck once per floor for a huge, loud charge. |
| 9 | Shotgun Messenger | Florin | DEX | Burst damage from limited shells; reloading costs a turn. |
| 10 | Beastmaster | Zabit | CHA | A tamed animal companion that levels with you. |
| 11 | Cartographer | Milk | INT | Reveals more of the fog-of-war map and spots secret rooms. |
| 12 | Fire Mage Arcanist | Mordecai, during the crawl | INT | Strong fire spells; fire can burn your own loot. |
| 13 | Blizzardmancer | Elle McGibbons | INT | Freeze and slow enemies; control over raw damage. |
| 14 | NecroBard | Bard and Necromancer mix | CHA | Songs raise minions; performance checks. |
| 15 | Animal Test Subject | Poison-specialist mage | CON | Poison spells and poison immunity; you glow green, so stealth suffers. |
| 16 | Boring Ol' Mage | Zeynep | INT | Pure caster with cheap spells and no weapon skills. |
| 17 | Freelance Psychiatrist | Morris Sp, psionic | CHA | Calm, confuse, or talk down enemies with mind skills. |
| 18 | Gut Rearranger | Vadim, healer and rogue | DEX | Field surgery heals you; sneak attacks get messy. |
| 19 | Former Child Actor | Donut | CHA | Borrow a different class gimmick on each new floor. |
| 20 | Banana Farmer | Mike Barnes, druid | CON | Shoot banana seeds that grow into cover, food, or distractions. |

**How the 20 were picked**

- Playable solo, so party-support classes (Legatus, Storm Commander, Riot Forces Support) are out.
- Distinct roles: melee, tank, ranged, stealth and traps, several kinds of magic, healing, and wild cards.
- Hooks into our systems: Cartographer uses the fog-of-war map, Beastmaster uses pets, Origamist turns junk paper into tools.
- Skipped: classes the wiki does not describe, dark picks like Slave Driver, and later-floor upgrades.
- Alternates to swap in: Rogue Trapmaster, Bomb Squad Tech, Paladin, Archer, Thief, Poisoner, Pit Fighter.

**Sample intake script**

> **SYSTEM:** Welcome, Crawler. State your name. It will appear on your tombstone.
>
> **SYSTEM:** Species check... **Human.** Of course you are. The audience groaned.
>
> **SYSTEM:** Choose your class. Choose carefully. Or don't, it is funnier.
>
> **SYSTEM:** You chose **Boring Ol' Mage.** Bold. Dull, but bold.
>
> **SYSTEM:** Achievement unlocked: **Registered.** It is the last thing you will do right today.

**Build notes**

- Creation runs as app screens with stats handled in code, so it costs zero or one API call against the free daily cap.
- Class, stat mods, and once-per-floor gimmick flags live in the game state, not in the DM's memory.
- The DM prompt is told the class and only narrates its gimmicks.
- The game hooks are my design; the wiki only partly describes the books' own mechanics.

## Achievements

Achievements are frequent, funny, and petty; early on, about one in every five to eight turns should pay out. Each has a name, a one-line System quip, a trigger, and a reward.

**How they are awarded**

- Code-checked achievements fire automatically from the game state, with no API cost.
- DM-judged achievements come from the model. Each turn it sees five unearned names from the bank as suggestions and may invent a one-off, trivial or minor only.
- At most two per turn, and the app blocks duplicates by name.
- Each unlock shows as a one-line System quip in a toast.

**Reward scale**

| Key | Reward |
| --- | --- |
| T | 5 XP |
| M | 10 XP |
| N | 25 XP and a bronze loot box |
| J | 50 XP and a silver loot box |

**Starter bank**

| Achievement | Trigger | Checked by | Reward |
| --- | --- | --- | --- |
| Registered | Finish character creation | Code | N |
| Level Two, Who Cares | Reach level 2 | Code | M |
| Level Five, Okay Fine | Reach level 5 | Code | N |
| Close Call | Survive at 3 HP or less | Code | M |
| Hoarder of Garbage | Hold 10 items in the junk tab | Code | T |
| Walking Pharmacy | Hold 5 consumables at once | Code | T |
| Window Shopping | Open your first loot box | Code | T |
| Box Addict | Open 5 loot boxes | Code | M |
| Next Floor, Please | Reach floor 2 | Code | N |
| Slow and Steady | Spend 100 turns on one floor | Code | M |
| Running Late | Floor timer drops under 50 turns | Code | T |
| Fully Loaded | Fill all five trinket slots | Code | M |
| Janitorial Services | Defeat a janitor or cleaner-type enemy | DM | T |
| Wrong Door | Open the one door the System warned about | DM | M |
| Pet the Dog | Befriend or pet something that could kill you | DM | T |
| Property Damage | Wreck a dungeon fixture for no reason | DM | T |
| Fashion Crime | Equip clearly mismatched or silly gear | DM | T |
| Sweet Talker | Talk your way out of a fight | DM | M |
| Stealth, Sort Of | Sneak past an enemy and get noticed anyway | DM | T |
| Improvised Weapon | Win a fight using something that is not a weapon | DM | M |
| Crowd Pleaser | Pull off a stunt the audience would cheer, once per floor | DM | N |
| Unreasonably Polite | Clear a floor without killing anything | DM | J |
| Untouchable | Beat a floor boss without losing HP | DM | J |
| Tutorial Complete, Barely | Defeat the Floor 1 boss | DM | J |
| Embarrassing | Die to the weakest enemy on the floor | DM | none, flavor only |

Each class also gets two signature achievements, written once its mechanics are designed.

## Loot boxes

Loot boxes are earned, stored in their own tab, and opened on purpose, never mid-story. Opening one is a short ceremony run in code, so it costs no API calls.

**Where they come from**

| Source | Box |
| --- | --- |
| Registered achievement | Bronze |
| Notable achievements (N) | Bronze |
| Major achievements (J) | Silver |
| Clearing a floor | Silver |
| Defeating a floor boss | Gold |
| Rare special achievements on deep floors | Legendary |
| Random find, about 4% of turns | Bronze |

**Contents by tier**

| Tier | Items | Guaranteed | Weights |
| --- | --- | --- | --- |
| Bronze | 1 | none | Junk 40, Consumable 35, Gear 20, Trinket 5 |
| Silver | 2 | One consumable | Junk 15, Consumable 30, Gear 35, Trinket 15, Skill scroll 5 |
| Gold | 3 | One gear piece | Junk 5, Consumable 20, Gear 40, Trinket 20, Skill scroll 15 |
| Legendary | 4 | One gear piece and one trinket | Consumable 15, Gear 35, Trinket 30, Skill scroll 20 |

**Opening ceremony**

1. Tap a box in the Loot tab.
2. The box shakes, and a canned System quip for that tier plays.
3. Items reveal one at a time and drop into their inventory tabs.
4. Trinkets ask which of the five slots to use.

**Build notes**

- Items come from an item bank with modifiers (such as "Slightly Cursed"), so contents cost zero API calls. The bank is still to be written.
- Gold and legendary boxes may get one optional DM call for flavor text.
- Boxes persist across floors and cannot be bought.

## Item bank and runtime items

The full bank has 210 items, 18 modifiers, and 10 story templates. It lives in the project files as `claude/item-bank.md` (readable) and `claude/item-bank.json` (for the app).

| Category | Items |
| --- | --- |
| Junk | 45 |
| Consumables | 39 |
| Weapons | 30 |
| Armor and clothing | 36 |
| Trinkets | 39 |
| Skill scrolls | 21 |

Each item has a rarity from 1 to 4 (a box of that tier or higher can drop it), tags, a plain-language effect, and a System quip. Modifiers such as "Slightly Cursed" or "Sponsor-Approved" stack on top for variety.

**Can items be generated at runtime?** Yes, in three layers, cheapest first:

1. Tag-weighted picks (free): the app tracks tags from recent events, such as fire, stealth, or janitor, and weights drops toward matching items. A fire-heavy floor makes fire-themed loot likelier.
2. Story templates (free): names built from recent state, like "{enemy}-Scented Candle" or "{room} Souvenir Mug".
3. Model-written items (one API call): for gold and legendary boxes, one call writes the items from the last few turns of story.

Safety rails: runtime items use the same schema and stat caps as bank items, bonuses come from rarity and not from the model's wording, and a bad reply falls back to the bank.

## Floor 1: Orientation

Floor 1 is the tutorial: a goblin-run onboarding wing that introduces every core system once, under a 300-turn collapse timer, with a boss who holds the key to the stairs. The map data for the app is in `claude/floor-1.json`.

**Five-floor outline (working ideas)**

| Floor | Name | Theme | New system |
| --- | --- | --- | --- |
| 1 | Orientation | Goblin onboarding wing, part basement, part sewer | Core loop, achievements, trinkets, loot boxes, fog-of-war map |
| 2 | The Marketplace | A sprawling dungeon mall | Shops, currency, factions |
| 3 | The Backlot | A film set full of illusions | Audience hype, illusions, set-piece traps |
| 4 | The Arena | Fight pits and crowd favor | Duels, crowd mechanics |
| 5 | The Executive Suite | The System's own offices | Everything combined, final boss |

**Dungeon intro script**

> **SYSTEM:** Welcome to the Dungeon. Five floors, one exit, zero refunds.
>
> **SYSTEM:** Each floor has a timer. When it hits zero, the floor collapses with you on it.
>
> **SYSTEM:** You will be watched, rated, and occasionally mocked. Please do not take it personally. Take it professionally.
>
> **SYSTEM:** Floor 1 is Orientation. Your onboarding goblins are eager to meet you.
>
> **SYSTEM:** The stairs are through the Foreman's office. He has the badge. He also has opinions.

**Timer and floor rules**

- The floor starts at 300 turns. Resting in the safe room costs 5 turns.
- At 200 turns left, "Restructuring": the Flooded Sublevel deepens and eels roam wider.
- At 100 turns left, "Layoffs": Goblin Security Guards patrol, with a 1-in-6 chance of an encounter each move.
- At 50 turns left, the lights go red and Foreman Gruk gets +2 damage.
- At 0 turns left, the floor collapses. The crawler dies unless standing in the Stairs Room.
- A crawler who explores everything has roughly 40 to 60 turns to spare.

**Rooms**

| # | Room | Type | What is there | Teaches |
| --- | --- | --- | --- | --- |
| 1 | Intake Hall | Start | Broken welcome desk, flickering orientation screen, three exits | Looking around, choosing a path |
| 2 | Mop Closet | Fight | A Goblin Janitor guarding junk and a janitor's key | First fight, first loot |
| 3 | Cafeteria of Questionable Meat | Set piece | Healing food and a Vending Machine Mimic holding the Supply Cage key | Risk versus reward, consumables |
| 4 | Rat Warren | Fight and trap | Rat swarm and a pressure-plate corridor | Traps, group combat, escaping |
| 5 | Break Room | Safe room | Couch, free vending machine, trinket on a shelf, loot box opening spot | Safe rooms, trinkets, loot boxes |
| 6 | Flooded Sublevel | Hazard | Knee-deep water, Sump Eels, a hidden pipe | Terrain hazards, fire and electric synergy |
| 7 | Records Archive | Puzzle | Filing maze, a Paper Shredder, a secret door north | Secrets, map fragments, Origamist and Cartographer synergy |
| 8 | Hall of Poor Decisions | Trap gauntlet | Three pressure-plate paths to the Foreman's Office and a plaque of warnings | Solving traps, class skills |
| 9 | Goblin Union Hall | Social | Steward Pip and a goblin work stoppage | Talking, bargaining, the strike option |
| 10 | Supply Cage | Locked loot | Consumables and one gear piece; needs the key | Locks and keys |
| 11 | Maintenance Shaft | Secret | Vent crawl to the Foreman's back door, two Intern Zombies | Shortcuts, stealth, ambush |
| 12 | Secret Stash | Secret | Employee of the Month shrine and a silver loot box | Secrets pay off |
| 13 | Foreman's Office | Boss | Foreman Gruk | The boss pattern |
| 14 | Compliance Door | Gate | Badge reader; four ways through | Multiple solutions |
| 15 | Stairs Room | Exit | Staircase down and the floor-clear screen | Floor transition |

**Enemies**

| Enemy | HP | Damage | Notes | XP |
| --- | --- | --- | --- | --- |
| Goblin Janitor | 4 | 2 | Mop-bucket flail; surrenders at 1 HP if bribed | 5 |
| Sewer Rat swarm | 4 rats at 3 HP | 1 each | Fire scares them off | 10 |
| Intern Zombie | 8 | 2 | Slow and undead; carries coffee that heals 3 | 10 |
| Vending Machine Mimic | 15 | 4 | Looks like a snack machine; holds the Supply Cage key | 20 |
| Sump Eel | 10 | 3 | Only in water; weak to electricity | 10 |
| Paper Shredder | 12 | 3 | Eats paper and junk; fire is effective | 15 |
| Goblin Security Guard | 10 | 3 | Patrols after the 100-turn event; stun baton | 15 |
| Foreman Gruk | 40 | 5 | Boss | 50 |

**Boss: Foreman Gruk, Head of Onboarding**

A hulking goblin in a stained tie with a clipboard. He carries the Foreman's Badge and has 40 HP.

1. Orientation (40 to 26 HP): he barks orders, calls two Goblin Janitors, and swings the clipboard for 4.
2. Performance Review (25 to 11 HP): his clipboard hit gives the Review debuff, -1 to all checks until you pass a CHA check.
3. Layoffs (10 to 0 HP): enraged, he hurls filing cabinets for 6 area damage; dodge with a DEX check.

Weak points: destroying the clipboard ends the Review debuff and stuns him for a turn; fire works well in a paper-filled office; goblins can be turned against him.

**Four ways through the Compliance Door**

1. Fight: defeat Gruk and take the Foreman's Badge.
2. Sneak: crawl through the Maintenance Shaft to the back door and lift the badge, or ambush him for a first-strike bonus.
3. Talk: Steward Pip pulls the goblins off the floor, Gruk loses authority, and he trades the badge for a favor. This earns "Unreasonably Polite".
4. Force: break the door with explosives or a heavy charge. It is loud, and guards arrive at +2 damage.

**Rewards**

- About 150 to 200 XP from fights, plus achievement XP, enough to reach level 2 mid-floor and approach level 3.
- Bronze box from "Registered", silver box for the secret stash, silver box for clearing the floor, gold box for defeating Gruk.
- Achievement hooks: Janitorial Services (Mop Closet), Wrong Door (Hall of Poor Decisions), Tutorial Complete, Barely (Gruk), Untouchable, and Unreasonably Polite.

**DM notes for Floor 1**

- For the first 20 turns, cap damage at 5 HP per turn so one bad roll cannot kill a new crawler.
- Deliver the first achievement within 10 turns and a free healing item from the first loot.
- Introduce one system at a time: map on turn 1, inventory at the first pickup, achievements at the first unlock, trinkets and loot boxes in the Break Room.
- Foreshadow Gruk with three PA announcements at set turns, and keep the boss a surprise until the Foreman's Office.

## Interactive ideas

- **Class select screen:** a scrollable list of the 20 classes. Each row shows the class name and a very short description, under 10 words. Tap a row to pick it, then confirm.
- Add more ideas here as you think of them.

## Tech notes

The game is a single-file web app on GitHub Pages that calls OpenRouter's free models directly from the phone. State, dice, and rules live in code; the model only narrates.

- One API call per turn. Free models allow 20 requests per minute and 50 per day, rising to 1,000 per day after a one-time $10 credit purchase.
- The model replies with narration plus a `<state>` block of changes; the app validates and clamps it. The parser tolerates missing closing tags and code fences.
- Dice are pre-rolled in code and handed to the DM each turn.
- The DM prompt is editable in the app and saved in the browser, so prompt changes need no redeploy.
- Repo: theB0NB0N/Crawl. Pushing from Claude needs GitHub linked on desktop, planned for later.
- The free model list rotates. `openrouter/free` picks a random model each turn, so pin a specific `:free` model once one behaves well.

## Open questions

- [ ] Is the class list of 20 final, or do you want to swap any in from the alternates?
- [ ] Do you want to keep the Streamer class's Fans mechanic, or fold Fans into the System's commentary only?
- [ ] Should death end the run, or cost gear, levels, or a floor?
- [ ] Which interactive ideas do you want first? Add them under Interactive ideas.
