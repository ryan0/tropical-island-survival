# The reef and the lagoon: what belongs where

What a real atoll's reef holds, region by region, and what we take from it. It comes from research done on 16
November 2026 for the reef's redesign. The full report, with its sources, is `research/atoll-reef-zones.md`.

How far to trust it: the research was done by helpers reading the web. The measured sizes come mostly from one
good source read in full, the 1954 survey of Bikini and its neighbours in the Marshall Islands; the food comes
mostly from a study of fishing on Atafu in Tokelau, also read in full. Much of the rest was read only as search
summaries, and nobody has checked the citations by hand. Where the report marks something as inference, so does
this. A number here is a good guide, not a fact.

## What Ryan decided (16 November 2026)

- **The setting is the Marshall Islands to Kiribati.** Nature is the inspiration, not the rule: we mix where it
  makes a better game.
- **Shape and depth come first**, so that the waves can go on (their mesh depends on where they break). The rest
  follows in the order below. A placeholder will do where the real thing is not yet built.
- **The moon and the tide are for later**, the moon before the tide. Almost every food below is gated by one or
  the other, so both are worth having. What the tide would take is at the end.
- **The present coral models are to be placed afresh and redesigned.** Ryan suspected they suit the deeper
  water; the research says most of them are shallow-water coral.
- **The tide to plan for is half a metre either way** about the still level, which is the sea at mid-tide (the
  rules that keep it possible are at the end).
- **Overhangs, caves and roofed channels are wanted in time.** They may be better as things of their own, set on
  the ground, than as ground: we shall see. Until then they are open channels and potholes.

## The order of work

1. The reef's shape and depth, from the list below.
2. The present models placed by exposure and by the reef's curve.
3. The pink ridge dressed: its colour, its blowholes.
4. Fire coral, the first hazard.
5. The drop-off and the lee dressed with the kinds we lack.
6. The sights that are placed once.

The shape and depth work. Ryan agreed items 1 to 6 on 16 November 2026 and they are built
(`src/world/island-shape/island.glsl`); 7 and 8 do not change where the swell breaks, and follow.

1. Two values shared round the rim: how exposed a stretch is to the swell, and whether the reef there bulges
   towards the sea or curves away from it. The rest reads them, so that the reef differs along the shore by
   rule.
2. The south crest as a ridge: high where the reef bulges, with bare flat behind it; a low arch where it curves
   away, with rich garden behind. Surge channels cut the high ridge, between buttresses.
3. The fore reef: grooves with flat floors and steep walls between spurs, deepening outwards, and a terrace
   before the drop.
4. Storm notches in the south edge: three bays floored with blocks.
5. The pass: a flat scoured floor, a low ridge of coral across it, and a lobe of sand off its seaward mouth.
6. The lee: a wall below the sill, not a slope, and no spurs.
7. Behind the crest: a lower strip of flat-topped heads and pothole pools (1.5-3 m across, 1-1.5 m deep).
   Built 26 November 2026, at the least size the ground's squares draw: heads some 6 m across standing to half
   a metre under the sea, potholes some 5 m across and 1.3 m deep, crowded here and few there, on the sides
   the sea beats on.
8. The lagoon: patch reefs steep-sided and flat-topped, 3-9 m across; the shelf's edge in lobes; the hole's
   walls steep. Built 26 November 2026: the patch reefs are clusters of flat-topped knolls some 8 m across
   (they were broad domes), the shelf's edge has a second, finer wander, and the hole's walls were steep
   already. And the way in from the inlet has broad, wandering sides: cut like the inlet itself, it was two
   straight ledges of rock across the shelf.

**The gardens deeper, with basins (Ryan, 26 November 2026):** "I would like the garden area between the
breaking waves and shore to be slightly deeper. And as well I would like the depth of this area to vary a
bit more just so there are deeper areas here (think 10-20 ft) for the player to explore while protected
from the open ocean." The gardens lie 2.7 m down, give or take 1.9 (they were 2.3, give or take 1.7); the bare
flat behind the high ridge 1.5 m (it was 1.2); and some half dozen basins lie round the atoll, each fifty to
eighty metres long, 4.5 to 6.5 m deep with a floor of sand: one straight off home, 55 to 95 m off the beach.
The shallows by the beach, the crest and everything outside it are as they were, so the swell breaks where
it did. The debug panel flies to two of the basins.

How items 1 to 6 came out, and the choices made in building them:

- **Home lies behind the reef's one southern bulge** (from 65 to 98 degrees; home is at 90). So the high ridge
  and the bare flat are straight off the home beach, and the low arch with its rich gardens lies to either side,
  east and west. The exposure is 1 round the south, a half on the east, a third on the west and 0 round the
  north; a ridge grows where it is over about a half.
- **The ridge's top is 0.4 m down, the arch's 0.55 m:** at the low water planned for, the ridge is just dry and
  the arch awash. The flat behind the high ridge is 1.2 m down and nearly level, from 80 m off the beach to the
  crest.
- **The swell breaks where it did.** The spurs' tops slope 1 in 10 from the crest's edge, as the old fore reef
  did near its top, so the usual wave still breaks within a few metres of the edge and the biggest some ten
  metres out, where the wave mesh is finest. A real spur zone is shallower and nearly level; on it the swell
  would spill, not plunge.
- **Grooves and channels are at the wide end of what real ones are:** a floor about 4 m wide and walls 2 m,
  because the ground's squares are 2 m. They begin as slots and open out over 20 m. Round the south there is a
  spur every 13 m, on the flanks every 18 m and taller, round the north none.
- **The terrace** runs from 7 m down at the spurs' foot (188 m along the reef) to 11.5 m at 208 m, where the
  drop-off now begins (it was 200 m).
- **The notches:** a wide one south-south-west (44 m across, 18 m into the reef), one south-east (24 m, 13 m)
  and a small one south-west (16 m, 10 m). None breaches the crest. The blocks on their floors are lumps of the
  ground, a placeholder.
- **The lee's wall** falls from the sill to the sea floor within about 20 m, with broad lumps. A real one is
  vertical only below 30 m, which is under our sea floor.
- **The pass's lobe** is a fan of sand that widens as it runs out, highest along its middle, sloping from 9 m
  down to 12.5 m and then falling away; the ridge across the pass is 1.8 m high.

Refined on 17 November 2026, after Ryan had flown over it with the sea drained and found its outlines angular:

- **The ground's squares are cut into four wherever the shape bends sharply** (`terrain-shape.ts`): the walls of
  grooves and channels, the edges of the notches and the pass, the lumps. A groove's wall is then drawn by 1 m
  squares, not 2 m. The ground has 332 thousand triangles, from 173 thousand; `cutInFourWhereBendsOver` is the
  dial.
- **No two spurs end at the same place:** their ends, and the drop-off's lip with them, stand up to 13 m further
  in or out. The deepest grooves run on across the terrace as shallow chutes of sand and notch the lip.
- **Lumps stand for things to come** (one pattern, some 4 m across): coral heads in clusters on the terrace,
  rounded masses on the drop-off's face and on the lee's wall, the notches' fallen blocks. On a steep wall the
  masses stand as spires; Ryan finds them interesting, and wants how they are drawn refined later.
- **The lee's wall** has three ledges on the way down, and its line wanders.
- **The notches** have scalloped sides, bigger blocks in places, and the rubble that fell from them lies spread
  on the terrace below.



## Where the present models belong

| Model | What it is on a real atoll | Where it belongs | Sizes |
|---|---|---|---|
| Rock head with rubble | Three shallow things share its shape: a microatoll (a colony dead on top at low-tide level and alive round its rim), a storm-thrown block, a lagoon knoll | Microatolls in the gardens and on the lagoon's shelf; blocks in a band 55-115 m off the beach; knolls in the lagoon's basin | Microatolls 1-8 m across; blocks 1.5-3 m across and 1-2 m high, the largest 10 m; knolls 3-15 m |
| Lobed coral (Porites) | Massive Porites | Nearest the beach, on the microatolls, dominant on the lagoon's patch reefs, common on the lee; deep only as flattened plates | 1-5 m; one giant of 8-10 m would be a landmark (inference) |
| Bushy coral (Acropora) | Stout, wave-proof Acropora | On and just behind the crest; the upper fore reef; in thickets with clams in the lagoon | |
| Staghorn | Thickets | Hollows on the tops of lagoon knolls; the lee; sparingly on ledges of the drop-off | Not measured anywhere |
| Table coral | Acropora tables | The upper fore reef; the lee's flat (masses 2 m across in 1.2-1.5 m of water); the top of the drop-off | 1-3 m, now and then 4-5 m (inference) |
| Cauliflower coral (Pocillopora) | The commonest coral at an exposed reef edge | The crest's edge, the strip behind the ridge, the shallow fore reef | 25-50 cm; the antler kind 0.5-1 m |
| Giant clam | It needs light: densest in under 10 m | Bored into reef tops in the gardens and near the crest; loose on the lagoon's sand and margins; a few on the outer slope | To 30 cm where bored in; the true giant clam to 1.4 m |

The kinds we lack. For the drop-off: plate and sheet corals ("lettuce"), columns, lumpy masses crusted pink, the
green chalky seaweed Halimeda, and tree-like soft corals and sea fans where the current runs. For the shallows:
fire coral (upright yellow-green or brown blades, often white-tipped, in colonies 2-3 m across), the pink ridge
with its blowhole mounds, blue coral heads, and carpets of soft coral and of button-like zoanthids for the lee.

## Each region

Distances are metres off the ocean beach, as in `src/world/island-shape/shore.glsl`.

### The ocean beach and the shallows (to 45 m)

- **Ground.** Sand made largely of the shells of single-celled animals. Beachrock on parts of the beach (15% of
  it at Bikini): a belt 11-35 m wide dipping 7-9 degrees seaward, in thin layers, polished and potholed on top,
  rough, pitted and grey-brown lower down, split into blocks in bands along the shore. It cements fast enough to
  hold flotsam (a glass float, a bottle). On the storm side only, behind the beach, a rampart of blackened coral
  boulders 1.5-1.8 m above high tide and up to 30 m wide, with worn clam shells among them. Some islets sit on a
  ledge of cemented coral heads 0.3-1.2 m high that sends rock groins out onto the reef.
- **Growth.** Little: small scattered heads of lobed coral, nodules of pink alga 2-5 cm across, brown seaweeds.
- **Reason to go.** Drift on the windward beach (pumice, logs, seeds, floats). Shellfish and crabs on the rock.
  Turtle nests, October to April. Shark pups in the shallows. The place to set out from to torch flying fish at
  night. Worn clam shell for tools.
- **Danger.** Stingrays buried in the sand (sliding the feet warns them off), stonefish at low tide, blacktip
  sharks nipping waders' feet, the sun, cuts from beachrock.
- **Along the shore.** Open sand, then beachrock slabs, then a rampart, then a groin.

### The gardens (45-118 m)

- **Ground.** On a real storm-side flat coral covers half to three-quarters of the bottom behind the ridge;
  further in, the flat is bare rock with 5-10% coral. Just behind the crest lies a lower strip full of
  flat-topped heads 1-8 m across, many breaking the surface at low tide. Pothole pools 1.5-2.7 m across and
  0.9-1.5 m deep, their walls steep to overhanging and rimmed with fire coral, sand and cobbles on the floor;
  other pools are carpeted by one brown colony. Storm-thrown blocks, usually 1.5-3 m across and 1-2 m high, lie
  in a band 30-90 m behind the reef's edge (55-115 m off our beach). Where there are many they look like "a
  picket fence". They are mushroom-shaped at the base, blackened and jagged above high tide, and the coral in
  them is tilted or upside down.
- **Growth.** From the shore outwards: lobed coral, then blue coral, then stout Acropora, the stoutest just
  behind the ridge. It is low, encrusting and stubby, with pink pavement between. Sea grapes grow long and
  upright in calm water and short on exposed edges.
- **Reason to go.** The larder. Octopus: a pile of shells outside its den gives it away; it is taken with a
  stick at low tide and is the main bait. Giant clams bored into the reef tops and pried out, the staple of the
  swell season. Spider conchs, urchins for their roe and sea cucumbers, picked up at low tide. Small groupers
  and squirrelfish under the mounds. Lobsters walk up onto the flat at night on a rising, moonlit tide and are
  taken by hand. Shell for adzes.
- **Danger.** Stonefish half-sunk in sand and rubble. Long-spined urchins in crevices by day and out at dusk.
  The geographer cone under rocks: picking up a live shell is the trap. A bright-patched poisonous crab. A moray
  in the hole an octopus hunter reaches into. Coral cuts that infect.
- **Along the shore.** Behind a bulge of the reef, bare pavement dotted with flat-topped heads; behind a bay,
  dense garden with pools; in places a fence of black blocks.

### The crest (118-145 m, on the swell's side)

- **Ground.** A ridge built by a rock-hard pink alga, not by coral, 26-35 m wide. Off a bulge of the reef it
  stands 0.6-1.1 m above the flat behind it and is cut by surge channels; along a bay it is a broad arch
  0.15-0.3 m high. The buttresses between channels are about 6 m wide. The channels are 1.5-3 m wide at the
  reef's edge and open for 15-23 m; then they roof over, and water surges through holes in the roof with every
  wave, as far as 100 m in. The caverns under the roof are 3 m wide and 2.5-3 m deep. Blowholes sit in crater
  mounds 0.8-0.9 m high and spout at low tide. Elsewhere the ridge is a honeycomb of pillars, or hundreds of
  holes that well up quietly. Behind it stand masses of pink rock up to 1.2 m high.
- **Growth.** Pink. Cauliflower coral is the commonest at the edge (to 0.3 m), with stout Acropora just behind.
  Fire coral in vertical sheets.
- **Reason to go.** Turban snails (with clams, the only molluscs Atafu eats). Lobsters in the channels. Sea
  cucumbers thick in the surf, slate-pencil urchins. Schools of surf fish (rabbitfish, unicornfish, drummers)
  for a drive. The blowholes.
- **Danger.** The surf: no source covers people thrown onto a ridge; among surfers on Hawaiian reefs, broken
  bones lead. Fire coral burns for hours, the rash lasts days and often returns after a week or two. Being drawn
  into a cavern, and getting back in through the break (inference).
- **Along the shore.** The region that varies most: a high ridge or a low arch; honeycomb, buttresses with
  blowholes, or seeping holes; no ridge at all on the lee.

### The fore reef (145-200 m)

- **Ground.** At Bikini, a terrace from 4.6-7.6 m deep at the reef's foot to about 15 m at its outer edge,
  nearly flat or sloping 10-15 degrees. Spurs 3-12 m wide (7.6 m on average) and 46-91 m long, their seaward
  ends dropping at 45 degrees or more. Grooves 1-3 m wide, 2.4 m deep near the reef's edge and 4.6-5.5 m at
  their outer end; their walls are vertical or overhanging, their floors "flat, rounded at the edges like the
  bottom of a bathtub": bare white rock, polished pebbles or boulders, with blocks of 4.6 x 3 x 3 m slid into
  them. Storm notches cut the south edge: 8-150 m wide, 8-61 m into the reef, floored with blocks veneered in
  coral; in places a comb of narrow slots.
- **Growth.** Dense branching coral to 5-10 m: bushy, cauliflower, finger, tables. Coral crowds the channel
  walls more than the spur tops (20% there); the rest is pink crust and short turf. Fire coral on the spurs to
  10 m. A healthy remote reef has 40-60% live coral (inference).
- **Reason to go.** The most fish. Lobsters hide by day in the caves and ledges of the grooves. Fluted clams,
  turban snails, soldierfish under ledges, parrotfish.
- **Danger.** Fire coral. Lionfish in crevices, spines outwards. Crown-of-thorns starfish under rubble. Reef
  sharks that come within seconds for a speared fish. The ears: an eardrum can burst from 3.5 m down without
  equalising. Surge in the grooves.
- **Along the shore.** More swell makes lower, closer spurs that face the swell. On the flanks they are taller,
  wider apart and turned. On the north there are none.

### The drop-off (200-232 m)

- **Ground.** Real slopes go on down (25 degrees on average at Bikini); our 30 m floor is a convenience, best
  dressed as the sandy foot of a terrace. The edges are cavernous, upper parts overhanging lower, with slumped
  sections up to 12 m long. On the lee there is no terrace: a lumpy cliff, vertical from 30 m.
- **Growth.** At 10-20 m, bigger boulder and plate corals. At 20-30 m, plates and "lettuce" sheets; off high
  islands, large tables and stout staghorn at 20-25 m. A lee wall has under 10% coral, with globes of pink alga
  and Halimeda on its ledges. Garden eels on sand slopes in current, in dozens to hundreds.
- **Reason to go.** The big fish: red bass, emperors, giant trevally, dogtooth tuna. Slipper lobsters. A manta
  cleaning station on a coral head at 8-15 m, on a corner the current sweeps. Groupers spawning on a promontory.
- **Danger.** Blackout near the surface on the way up, after breathing hard before the dive. Grey reef sharks,
  which hunch in threat first; silvertips from below; a ramming trevally. And eating the catch: the big fish of
  the drop-off carry most of the ciguatera.
- **Along the shore.** On the south a terrace, spurs, and notches with block-floored bays; on the lee a wall.

### The sheltered north (the lee)

- **Ground.** No ridge: the edge rises only a few centimetres. Hard rock 1.2-1.5 m down, with table-like coral
  masses 1.8 m or more across rising 0.6-0.9 m, and pools floored with coarse sand between. At a ridge-less
  edge, from the edge inwards: tide pools (6 m), coral and alga (5 m), soft coral (4 m), zoanthids (20 m), then
  rock flat. Storm blocks occur here too.
- **Growth.** More than half the soft-coral strip is veneered olive-green in a net pattern; the zoanthids are
  the size of a silver dollar. Lobed coral, plates, columns, tables and staghorn; little cauliflower or fire
  coral. More coral than the swell's side, of fewer kinds.
- **Reason to go.** Where to fish when the swell is up: on Napuka most fishing in the swell season was on the
  sheltered side. Calm diving. Busy schools of grazing fish.
- **Danger.** Calm water tempts longer, deeper dives: blackout and ears. Grey reef sharks favour lee sides. A
  swell from the other hemisphere can break here in its season.
- **Along the shore.** Gaps, patches of tables, soft-coral carpets, zoanthid mats.

### The pass

- **Ground.** The pass is the lagoon's drain: swell breaking on the rim pumps water over the reef into the
  lagoon, and it leaves by the pass. Real passes are wider (90-200 m); ours will run as a tight jet (inference).
  A flat floor of coarse white rubble with a low ridge of jagged coral across it, coral-head boulders strewn on
  the flats beside it, and a lobe of sand off the seaward mouth (inference).
- **Growth.** Near a pass fire coral matters more than coral, and the pink alga grows in columns. Sea fans,
  black coral and soft coral on the walls (a weak source). Feathery stinging hydroids in the current.
- **Reason to go.** The atoll's biggest food event: camouflage groupers gather at the full moons of June and
  July and spawn at dawn on the outgoing current, with sharks after them (17,000 fish at Fakarava; ours is a
  small pass). Coral grouper, Napoleon wrasse, bonefish at the mouth, a sea cucumber of 2.5-7 kg. Traps across
  channels; hook and line.
- **Danger.** The current: over 4 m/s is reported in Cook Islands passages, and the advice is to swim across it,
  not against it. It should be strongest on the ebb with a big swell, and a big swell alone should keep it
  running out (inference). Swept out, a swimmer faces exhaustion, slow cold and the open sea's sharks. Grey reef
  sharks rest in a pass by day and hunt at night.
- **Along the shore.** The reef for a hundred metres either side is unlike the rest: boulders, fire coral,
  columns.

### The inlet and its fan

- **Ground.** Real ones are a few centimetres to 2 m deep. Ours is on the lee of an atoll with a pass, so it
  should swing with the tide, and run outwards when a big swell holds the lagoon up (inference). A fan on the
  seaward side says the ebb carries the sand.
- **Life.** Sand country: rays, blacktips, goatfish, mullet.
- **Reason to go.** A building project that pays by the moon. Bonefish leave a lagoon through such channels on
  the 4th or 5th night after full moon, March to September, and rock weirs took up to 1,000 a day. Other fish
  cross on known nights. Mullet school at the start of the ebb.
- **Danger.** Rays. Sharks on the runs. Needlefish that leap at a light at night; they have killed.

### The lagoon

A small lagoon is warmer than the sea and has fewer kinds of coral, the best nearest where sea water comes in
(inference).

- **The shelf (1.6 m).** Coarse sand, finer towards the middle. Where it meets the basin it does so in rings:
  sand with sparse coral, then heads up to 1.8 m across on sand bound by Halimeda, then a lobed edge of coral
  and soft-coral heads 1.2-6 m across. Seagrass in patches. Sea grapes. Loose clams that can simply be lifted,
  and a field of the largest along a sheltered margin in 2-3 m. Bonefish over the sand.
- **The basin (4 m) and its patch reefs.** Small knolls 3-9 m across rise 3-6 m with near-vertical or
  overhanging sides from flat sand, with little or no skirt of debris; low mounds cover a fifth of a sheltered
  floor. Their tops are flat, cemented and half to three-quarters coral: lobed coral, brackets up to 3 m long,
  staghorn thickets in the hollows, Halimeda in the pockets, clams. Their sides are pale, with little coral.
  Round each is a halo of bare sand, metres to tens of metres wide, kept bare by fish that graze close to cover.
  Mounds of burrowing shrimp, half a metre to a metre across, on fine sand. Fire coral only on patches near the
  pass (the sources disagree). Pearl oysters on rock and rubble. Garfish by torch at night; night lines.
- **The hole (13 m).** No source describes one in a Pacific lagoon, so this is inference: steep walls, dimming
  blue light, a pale silt floor; big loose clams, big sea cucumbers, red bass, Napoleon wrasse. Bad water is
  unlikely in a hole that a pass flushes. The dangers are the ears, blackout, and silt stirred up under a ledge.
- **The sandbank.** Seabirds and their eggs. Tiger sharks patrol off a seabird islet in the season when the
  young birds are learning to fly.
- **Danger in the lagoon.** Rays in groups at night. Nesting triggerfish: the space they guard is a cone that
  widens upwards, so the way out is sideways. Ciguatera in fixed places. Tiger sharks over the deeper middle;
  blacktips keep out of it, which is a sign to learn.

## Variety at the same distance out

Four real causes, in the order of how much they change:

1. **Exposure to the swell.** It sets whether there is a ridge, how close the spurs are, and which corals lead:
   cauliflower and fire coral where it is rough, lobed coral and plates where it is calm. One value round the
   rim can carry it: the south gets everything, the east a lesser version, the west and north grade to the sill.
2. **The reef's curve.** Where it bulges seaward the ridge is high, cut by surge channels, and the flat behind
   is nearly bare; where it curves away the ridge is a low arch and the flat behind is lush. Gentle headlands
   and bays therefore give barren and rich gardens by turns at the same distance out.
3. **Storm history.** Blocks crowd certain stretches only; notches cut the south edge; a damaged patch takes
   5-10 years to recover. Each stretch can carry an age since its last storm: fresh rubble and turf, a
   recovering mix, or an old thicket. Ciguatera rises with broken reef, so the same patchwork can quietly be the
   map of which fish are safe (inference).
4. **Nearness to the pass and the inlet.** Boulder-strewn flats, fire coral, columns of pink alga, more
   shellfish, and the fish that move through.

Small signs that reward a close look: the shells outside an octopus's den; white feeding scars on coral that
betray a crown-of-thorns starfish; the width of a patch reef's halo.

Sights to place once each, tied to something in the geography (inference): the grouper gathering at the pass or
on a promontory; a manta cleaning station on a corner the current sweeps; the field of big clams on a sheltered
lagoon margin; garden eels on the sand below a spur; a turtle's resting ledge; one giant lobed coral 8-10 m
across.

## Food, and what gates it

| Food | Where | When and how |
|---|---|---|
| Octopus | Gardens: dens in crevices and rubble | Low tide, by day; a stick |
| Giant clams, bored in | Reef tops in the gardens and near the crest | Any time; pried out. The staple when the swell is up |
| Loose clams | The lagoon's shelf and margins | Any time; lifted, or levered free under water |
| Spiny lobster | The grooves by day; the flat at night | By hand on a rising, moonlit tide; diving the grooves needs a very calm day |
| Turban snails | The crest, in the surf | Low tide and calm |
| Urchins, sea cucumbers, spider conchs | Gardens | Low tide, by hand |
| Surf fish and parrotfish | Crest and fore reef | A drive into a net: many hands |
| Flying fish | Just outside the reef | Dark nights, July to October; torch and scoop net |
| Bonefish | Through the inlet | 4th or 5th night after full moon, March to September; a rock weir |
| Fish crossing between reef and lagoon | The inlet and the flat | Known nights of the moon; nets and weirs |
| Groupers | The pass | The full moons of June and July, at dawn, on the outgoing current |
| Big fish | The drop-off and outside it | Line and trolling; the ciguatera risk |
| Lagoon fish | Patch reefs | Night lines; gravel thrown in to draw them |
| Garfish | The lagoon | Night; torch and scoop net |
| Pearl oysters | Lagoon rock and rubble, to 20 m | Diving; the shell makes lures and hooks |
| Turtle eggs | The ocean beach | October to April |
| Seabirds and eggs | The sandbank | In season |
| Coconut crabs, shore crabs | The groves at night; the splash zone | By hand or net |
| Sea grapes | Calm flats and the lagoon | Low tide |
| Fresh water | A well behind the beach; rain | Wells go salty in drought |

The year on one Tuamotu atoll: the good season is May to November; in the swell season, December to March,
fishing moves to the sheltered side and the lagoon, and clams become the staple. Atafu's fishers count the first
ten nights of the moon as "ocean nights" and the second half as "nights of the lagoon".

## Dangers, and what treats them

Most injuries are common, local and survivable: coral cuts, urchin spines, fire coral. The deadly ones are rare
and tied to a place and to what the person was doing: stonefish and cone snails on the flat, the current in the
pass, blackout on the drop-off. By number of cases the leading danger is eating the wrong fish.

- **Hot water** for stonefish, lionfish, scorpionfish and stingray stings, and probably urchins: the limb in
  water as hot as can be borne (42-45 degrees) for 30-90 minutes, tested by someone else, because numbed skin
  scalds. The spines of a dead fish stay venomous for two days, so cleaning the catch is a hazard too.
- **Breathing for the victim** for the poisons that paralyse: cone snails and pufferfish (and the blue-ringed
  octopus, which is doubtful here). There is no antidote; the victim lives if kept breathing until it passes.
- **Fire coral:** vinegar; the rash often comes back after a week or two.
- **Ciguatera:** it begins half an hour to two days after the meal. Tingling, and cold things feeling hot, last
  weeks to months; fewer than one in a hundred die. Fish, alcohol and nuts bring it back for months. It is worst
  in the liver and guts, and it is local: the same places stay bad for decades. The old test was to feed the
  guts to a cat.
- **Turtle meat** can kill without warning: one healthy-looking turtle sickened 101 of 120 people and killed
  six.
- **Cuts:** washed with fresh water and soap and left open. A cut rinsed only in the sea can put a person in
  hospital.
- **Cold:** a person in the water for hours cools dangerously even at 29-33 degrees.

## What lives here, and what does not

For a setting from the Marshall Islands to Kiribati (and we are free to mix):

- **Here:** the true giant clam; the loose bear-paw clam (as far as the Marshalls); seagrass in patches; blue
  coral; fire coral; stonefish, lionfish, long-spined urchins; blacktip, whitetip, grey reef and tiger sharks;
  coconut crabs.
- **Not native, ours to add or leave:** the trochus snail and the green snail (both introduced across the
  Pacific for their shell).
- **Not here:** box jellyfish, crocodiles, sea snakes (a storm-blown stray at most). Doubtful: the blue-ringed
  octopus, the flower urchin.
- **The pink ridge** grows only where the swell breaks: the south, and perhaps the east.

## Liberties we take

- **The crest lies 0.65 m under water.** A real ridge stands at the waterline and is awash at low tide.
- **The gardens' pools reach 4.6 m and their basins 6.5 m.** No measured pool on a reef flat is deeper than 1.5 m. The deeper water is
  there to explore.
- **The sea floor is 30 m down.** A real atoll's slope goes on into the deep.
- **The pass is 45 m wide.** Real ones are 90-200 m.
- **The spurs' tops run from 0.75 m down to 4.6 m.** Real ones lie under 0.9-2.4 m. Ours slope more, so that the
  swell plunges at the crest's edge.
- **Grooves 4 m wide.** Real ones are 1-3 m, and surge channels 1.5-3 m. The ground's squares are 2 m, or 1 m
  where it bends sharply.
- **Nothing overhangs.** The ground is one height for each spot, so roofed channels, caverns, caves and undercut
  knolls wait for things of their own set on the ground, or for another way of making ground. Ryan wants them in
  time.

## What the research could not find

A small deep hole in a Pacific lagoon. Food that is the lee's own. The sizes of caves, sand chutes and staghorn
thickets. How islanders themselves ranked the dangers. Two sources that would not open are the obvious next
ones: Johannes's *Words of the Lagoon*, and the Pacific Community's field guides.

## The tide: what it would take

Asked by Ryan on 16 November 2026, for later. It matters more to this game than to most, because the reef lies
within a tide's reach of the surface: the crest is 0.65 m down, the shallows 0.95 m, the tops of the gardens'
mounds 0.6 m.

*The size of a real tide* (from memory, not from the research): in the Marshall Islands and Kiribati the sea
rises and falls about 1 m at neap tides and 1.6-1.8 m at springs, twice a day; in the Tuamotus only 0.3-0.5 m. A
lagoon's tide is about half the ocean's and three or four hours late (measured at Raroia).

*What it would touch*, from easy to hard:

1. **The level itself: nearly free.** The sea's level is already one number (`uSeaLevel`) that the water, the
   ground's colouring, the rocks, the coral and the under-water tint all read. Two meshes are set to it in the
   program.
2. **Everything measured from the water's edge: a batch of work.** "Metres off the beach" is measured from the
   still waterline in the wave shader, the ground's colouring, the lagoon's shore waves, the spray and the
   program's wave model: where waves run up, the swash, the foam. Half a metre of tide moves the edge four to
   six metres across our beach. The wave mesh's finest rows (a tenth of a metre apart) lie within 1.6 m of the
   still edge, and would have to follow it or be widened, which costs points the phone pays for. What it gives:
   a band of dark wet sand left by the falling tide.
3. **The waves: the large part.** They read the sea floor's depth, the swell's delay and the moments of breaking
   from pictures made once at start-up. The tide changes the depth everywhere, and so where and whether each
   wave breaks; at low water little crosses the crest at all. Either the pictures are made afresh as the tide
   moves (off the frame's thread, a new pair every minute or so, the shader fading from one to the next), or a
   small tide is faked by adding it to the depth alone.
4. **The reef drying: the other large part.** At low water the crest, the mounds and the patch reefs stand out
   of the sea. Each is then a small shore: its waterline, wet rock, no foam painted across dry ground. Coral
   must stop growing at low water, as it really does.
5. **The program's side: many small things.** Wading and swimming, the swimmer's height, where fish may go,
   spray, footprints, things on the beach (a tide line is where they belong), the eye under water. And the
   tests: a stopped clock must stop the tide.
6. **Currents.** A lagoon that lags the sea would need two water levels meeting in the inlet and the pass, which
   cannot be drawn simply. One level everywhere, and a current worked out from how fast the tide is moving and
   how big the swell is, gives the game the same thing.

*Two sizes of it.* A small tide of a quarter of a metre either way, with the level, the moving edge and the wet
band but the waves left alone, is about one batch. A real one, with the reef drying and the waves following, is
about the size of the waves' first pass, and wants the breaker's own mesh built first.

*What keeps the door open meanwhile* (agreed with Ryan, 16 November 2026):

- **The still level is mid-tide, and the tide to plan for is half a metre either way.** The present depths
  already suit it: at low water the crest is just awash and the shallows are a wade; at high water there is over
  a metre on the crest.
- **Anything that grows up towards the surface stops at low water**, half a metre under the still level, not at
  the still level.
- **New code never writes the sea's level as 0**: it reads the one number, and a depth is the level less the
  ground.
- **Where waves break is read from the sea floor's pictures, not written as a distance.** Today the wave mesh's
  fine rows, the spray's look-out and `reefBreak` are fixed distances along the reef. The breaker's own mesh
  should take its place from the picture, so that a new picture moves the break.
- **The picture maker takes the level as an input**, and can run off the frame's thread.
