/* A bridge. Build 78's 70_audio.js is now src/audio/audio.ts; this builds the sound at the same point in start-up, gives
   the sound button its work, and passes on what the frame loop, the spray and the menu expect. */
import './66_spray.js';   /* first, so that the files still run in build 78's order */
import {createAudio} from '../../audio/audio.ts';
import {watchSoundButton} from '../../ui/sound-button.ts';

/* Sound (off until the WAVES button is tapped): filtered-noise surf whose loudness follows the breaking waves, crickets at night. */
var soundBtn=document.getElementById('snd'),audio=createAudio();
watchSoundButton(soundBtn,audio.toggle);

/* frame step: crickets come up at night (the surf loudness is driven from updateSpray, which measures how much is breaking) */
function updateAudio(F){
  audio.update(F.night);
}

export {soundBtn,audio,updateAudio};
