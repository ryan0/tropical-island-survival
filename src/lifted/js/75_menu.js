/* A bridge. Build 78's 75_menu.js is now src/ui/menu.ts; this builds the menu at the same point in start-up and says
   what each row does, in terms of the lifted files that still hold the day, the weather, the wind and the sound. */
import './70_audio.js';   /* first, so that the files still run in build 78's order */
import {createMenu} from '../../ui/menu.ts';
import {weather,wind} from './23_clouds.js';
import {setDayHold,setDayTarget} from './34_sky.js';
import {soundBtn} from './70_audio.js';

/* The menu under the corner button: choose the time of day, the sky and the wind (each can be left on "auto" to follow
   its own cycle), and turn the sound of the waves on or off. For trying things out; the game will have its own. */
var menu=createMenu(document.body,[
  {label:'time',choices:[['auto',null],['dawn',0.19],['day',0.5],['golden',0.754],['sunset',0.825],['night',0]],choose:function(v){
    /* a chosen time is hurried to and then held; "auto" lets the day run on from wherever it is */
    setDayHold(v!==null);
    setDayTarget(v);
  }},
  {label:'sky',choices:[['auto',null],['clear',0],['few clouds',0.45],['cloudy',1]],choose:function(v){weather.fixed=v;}},
  {label:'wind',choices:[['auto',null],['none',0],['light',0.33],['moderate',0.66],['high',1]],choose:function(v){wind.fixed=v;}},
  /* the sound button (70_audio.js owns it and writes "waves on" / "waves off" on it) */
  {label:'sound',control:soundBtn}
]);

export {menu};
