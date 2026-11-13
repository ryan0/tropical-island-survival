/* Lifted from legacy/src/js/00_config.js. The imports here and the exports at the end are new; the rest is build 78's. */

/* Settings you are likely to want to change. (Files are joined in name order, so this one is read first.) */

var BUILD='v'+import.meta.env.BUILD_VERSION+' · '+import.meta.env.BUILD_COMMIT;   /* shown in the debug panel (the label at the bottom of the screen is src/ui/build-label.ts) */
var WORLD_SEED=1;    /* decides where rocks, plants and props end up; same seed = same island (see rnd() in 05_core.js) */
var WATER_LEVEL=0;   /* height of the still sea surface */

/* The castaway's camp (lean-to, driftwood seats, firewood, the campfire and its ring of stones): built but left out of
   the scene for now - the player is to make or mend such things. Set true to see it. */
var CAMP=false;

export {BUILD,CAMP,WATER_LEVEL,WORLD_SEED};
