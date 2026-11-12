/* The menu under the corner button: choose the time of day, the sky and the wind (each can be left on "auto" to follow
   its own cycle), and turn the sound of the waves on or off. For trying things out; the game will have its own. */
var menuEl=document.createElement('div');
menuEl.id='menu';
menuEl.style.display='none';
/* one row: a label and a button for each choice [text, value]; pick(value) is called with the one pressed */
function menuRow(label,options,pick){
  var row=document.createElement('div'),cap=document.createElement('span'),btns=[];
  row.className='mrow';
  cap.textContent=label;
  row.appendChild(cap);
  options.forEach(function(o){
    var b=document.createElement('button');
    b.className='mopt';
    b.textContent=o[0];
    b.addEventListener('click',function(){
      pick(o[1]);
      btns.forEach(function(x){x.classList.toggle('on',x===b);});
    });
    row.appendChild(b);
    btns.push(b);
  });
  if(btns.length)btns[0].classList.add('on');
  menuEl.appendChild(row);
  return row;
}
menuRow('time',[['auto',null],['dawn',0.19],['day',0.5],['golden',0.754],['sunset',0.825],['night',0]],function(v){
  /* a chosen time is hurried to and then held; "auto" lets the day run on from wherever it is */
  dayHold=v!==null;
  dayTarget=v;
});
menuRow('sky',[['auto',null],['clear',0],['few clouds',0.45],['cloudy',1]],function(v){weather.fixed=v;});
menuRow('wind',[['auto',null],['none',0],['light',0.33],['moderate',0.66],['high',1]],function(v){wind.fixed=v;});
/* the sound button (70_audio.js owns it and writes "waves on" / "waves off" on it) lives here now */
menuRow('sound',[],function(){}).appendChild(soundBtn);
soundBtn.style.display='';
document.body.appendChild(menuEl);
/* (a touch on the menu must not also turn the camera) */
['pointerdown','touchstart','mousedown'].forEach(function(ev){
  menuEl.addEventListener(ev,function(e){e.stopPropagation();});
});
function toggleMenu(){
  menuEl.style.display=menuEl.style.display==='none'?'block':'none';
}
