/* Lifted from legacy/src/js/70_audio.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './66_spray.js';   /* first, so that the files still run in build 78's order */

/* Sound (off until the WAVES button is tapped): filtered-noise surf whose loudness follows the breaking waves, crickets at night. */

var surfGain=null,cricket=null,audioCtx=null,soundOn=false,audioMaster=null,soundBtn=document.getElementById('snd');
soundBtn.addEventListener('click',function(){
  try{
    if(!audioCtx){
      var AC=window.AudioContext||window.webkitAudioContext;
      audioCtx=new AC();
      var len=audioCtx.sampleRate*3,buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),dd=buf.getChannelData(0),v=0;
      for(var i=0;i<len;i++){
        v=v*0.97+(Math.random()*2-1)*0.03;
        dd[i]=v*6;
      }
      var src=audioCtx.createBufferSource();
      src.buffer=buf;
      src.loop=true;
      var lp=audioCtx.createBiquadFilter();
      lp.type='lowpass';
      lp.frequency.value=900;
      var gn=audioCtx.createGain();
      gn.gain.value=0.35;
      surfGain=gn;
      var lfo=audioCtx.createOscillator();
      lfo.frequency.value=0.7/(2*Math.PI);
      var lg=audioCtx.createGain();
      lg.gain.value=0.25;
      lfo.connect(lg);
      lg.connect(gn.gain);
      var lf=audioCtx.createGain();
      lf.gain.value=350;
      lfo.connect(lf);
      lf.connect(lp.frequency);
      audioMaster=audioCtx.createGain();
      audioMaster.gain.value=0;
      src.connect(lp);
      lp.connect(gn);
      gn.connect(audioMaster);
      audioMaster.connect(audioCtx.destination);
      src.start();
      lfo.start();
      var co=audioCtx.createOscillator();
      co.frequency.value=4400;
      var cg=audioCtx.createGain();
      cg.gain.value=0.5;
      var cl=audioCtx.createOscillator();
      cl.type='square';
      cl.frequency.value=17;
      var clg=audioCtx.createGain();
      clg.gain.value=0.5;
      cl.connect(clg);
      clg.connect(cg.gain);
      var cs=audioCtx.createOscillator();
      cs.frequency.value=0.9;
      var csg=audioCtx.createGain();
      csg.gain.value=0.5;
      cs.connect(csg);
      csg.connect(cg.gain);
      cricket=audioCtx.createGain();
      cricket.gain.value=0;
      co.connect(cg);
      cg.connect(cricket);
      cricket.connect(audioMaster);
      co.start();
      cl.start();
      cs.start();
    }
    soundOn=!soundOn;
    audioCtx.resume();
    audioMaster.gain.linearRampToValueAtTime(soundOn?0.8:0,audioCtx.currentTime+0.6);
    soundBtn.textContent=soundOn?'waves on':'waves off';
  }catch(_){soundBtn.textContent='no audio';}
});

/* frame step: crickets come up at night (the surf loudness is driven from updateSpray, which measures how much is breaking) */
function updateAudio(F){
  if(cricket)cricket.gain.value=F.night*0.035;
}

export {soundBtn,surfGain,updateAudio};
