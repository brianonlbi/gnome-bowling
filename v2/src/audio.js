// Gnome Bowling 2.0 — all sound is synthesized with WebAudio (carried over from 1.0).
function rand(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
export const Snd=(function(){
  var ac=null,master=null,musicG=null,muted=false,noiseBuf=null,rollSrc=null,rollG=null,musTimer=null,musNext=0,musIdx=0,lastPin=0;
  try{muted=localStorage.getItem('gnomebowl_mute')==='1';}catch(e){}
  function init(){
    if(ac){if(ac.state==='suspended')ac.resume();return;}
    try{
      var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ac=new AC();master=ac.createGain();master.gain.value=muted?0:0.9;master.connect(ac.destination);
      musicG=ac.createGain();musicG.gain.value=0.5;musicG.connect(master);
      noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      musNext=ac.currentTime+0.3;musTimer=setInterval(musicTick,120);
    }catch(e){ac=null;}
  }
  function tone(f,d,o){if(!ac)return;o=o||{};var t=ac.currentTime+(o.at||0),os=ac.createOscillator(),g=ac.createGain();
    os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+d);
    var v=o.vol||0.2;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+(o.att||0.012));g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    os.connect(g);g.connect(o.dest||master);os.start(t);os.stop(t+d+0.05);}
  function noise(d,o){if(!ac)return;o=o||{};var t=ac.currentTime+(o.at||0),s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=noiseBuf;s.loop=true;f.type=o.ft||'lowpass';f.frequency.setValueAtTime(o.f||1200,t);if(o.fto)f.frequency.exponentialRampToValueAtTime(o.fto,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(o.vol||0.2,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    s.connect(f);f.connect(g);g.connect(o.dest||master);s.start(t,Math.random()*0.5);s.stop(t+d+0.05);}
  // Jingle Bells (public domain, 1857) — [midi note, beats]
  var MEL=[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
           [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2],
           [64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
           [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,3],[0,1]];
  var BASS=[48,48,48,48,53,48,50,55,48,48,48,48,53,48,55,48],BEAT=0.27,musBeat=0;
  function mf(m){return 440*Math.pow(2,(m-69)/12);}
  function musicTick(){if(!ac||ac.state!=='running')return;
    while(musNext<ac.currentTime+0.35){
      var n=MEL[musIdx],at=musNext-ac.currentTime,dur=n[1]*BEAT;
      if(n[0])tone(mf(n[0]+12),dur*0.95,{type:'triangle',vol:0.07,at:at,dest:musicG});
      // bass + sleigh bells on the beat grid
      var b0=Math.ceil(musBeat-1e-6),b1=musBeat+n[1];
      for(var b=b0;b<b1-1e-6;b++){var bt=at+(b-musBeat)*BEAT;
        if(b%2===0)tone(mf(BASS[((b/4)|0)%16]),BEAT*1.6,{type:'sine',vol:0.09,at:bt,dest:musicG});
        noise(0.06,{ft:'highpass',f:7000,vol:b%2?0.02:0.035,at:bt,dest:musicG});}
      musBeat+=n[1];musNext+=dur;musIdx++;if(musIdx>=MEL.length){musIdx=0;musBeat=0;}
    }}
  var api={
    init:init,
    get muted(){return muted;},
    toggle:function(){muted=!muted;if(master)master.gain.value=muted?0:0.9;try{localStorage.setItem('gnomebowl_mute',muted?'1':'0');}catch(e){}},
    click:function(){tone(700,0.07,{type:'square',vol:0.08});tone(1050,0.09,{type:'square',vol:0.06,at:0.05});},
    tick:function(){tone(900,0.04,{type:'square',vol:0.04});},
    whoosh:function(){noise(0.3,{ft:'bandpass',f:500,fto:2500,vol:0.2});},
    boing:function(){tone(180,0.4,{type:'sine',to:520,vol:0.22});tone(260,0.3,{type:'triangle',to:700,vol:0.1,at:0.08});},
    rollStart:function(v){if(!ac)return;api.rollStop();rollSrc=ac.createBufferSource();rollSrc.buffer=noiseBuf;rollSrc.loop=true;
      var f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=180+v*1.6;rollG=ac.createGain();rollG.gain.value=0.0001;
      rollG.gain.linearRampToValueAtTime(0.22,ac.currentTime+0.15);rollSrc.connect(f);f.connect(rollG);rollG.connect(master);rollSrc.start();},
    rollStop:function(){if(rollSrc&&ac){try{rollG.gain.cancelScheduledValues(ac.currentTime);rollG.gain.setValueAtTime(rollG.gain.value,ac.currentTime);rollG.gain.linearRampToValueAtTime(0.0001,ac.currentTime+0.12);rollSrc.stop(ac.currentTime+0.15);}catch(e){}rollSrc=null;}},
    pin:function(j){if(!ac)return;var now=ac.currentTime;if(now-lastPin<0.035)return;lastPin=now;var v=clamp(j/400,0.05,0.3);
      noise(0.09,{ft:'bandpass',f:rand(1400,2600),vol:v});tone(rand(500,900),0.09,{type:'triangle',to:260,vol:v*0.8});
      if(Math.random()<0.35)tone(rand(900,1500),0.12,{type:'sine',to:rand(500,800),vol:0.06,at:0.03});},
    gutter:function(){noise(0.25,{f:300,vol:0.3});tone(110,0.25,{type:'sine',to:70,vol:0.2});},
    strike:function(){[523,659,784,1047,1319,1568].forEach(function(f,i){tone(f,0.3,{type:'square',vol:0.09,at:i*0.08});tone(f*1.5,0.3,{type:'triangle',vol:0.07,at:i*0.08});});
      for(var i=0;i<6;i++)noise(0.08,{ft:'highpass',f:6000,vol:0.08,at:0.5+i*0.07});},
    spare:function(){[523,659,784,1047].forEach(function(f,i){tone(f,0.25,{type:'triangle',vol:0.14,at:i*0.09});});},
    sad:function(){[[233,0.3],[220,0.3],[208,0.3],[196,0.7]].reduce(function(at,n){tone(n[0],n[1],{type:'sawtooth',vol:0.1,at:at,to:n[0]*0.94});return at+n[1]*0.95;},0);},
    raspberry:function(at){if(!ac)return;var t=ac.currentTime+(at||0),os=ac.createOscillator(),g=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain(),env=ac.createGain();
      os.type='sawtooth';os.frequency.setValueAtTime(95,t);os.frequency.linearRampToValueAtTime(70,t+0.7);lfo.type='square';lfo.frequency.value=31;lg.gain.value=0.5;g.gain.value=0.5;
      lfo.connect(lg);lg.connect(g.gain);os.connect(g);g.connect(env);env.gain.setValueAtTime(0.0001,t);env.gain.linearRampToValueAtTime(0.22,t+0.03);env.gain.setValueAtTime(0.22,t+0.55);env.gain.exponentialRampToValueAtTime(0.0001,t+0.75);
      env.connect(master);os.start(t);lfo.start(t);os.stop(t+0.8);lfo.stop(t+0.8);},
    nyah:function(){[[784,.18],[659,.18],[880,.18],[784,.18],[659,.3]].reduce(function(at,n){tone(n[0],n[1],{type:'square',vol:0.07,at:at});return at+n[1];},0);},
    giggle:function(){for(var i=0;i<7;i++)tone(rand(900,1500),0.07,{type:'sine',vol:0.09,at:i*0.085,to:rand(700,1100)});},
    hoho:function(){[150,130,110].forEach(function(f,i){tone(f,0.22,{type:'sawtooth',vol:0.13,at:i*0.26,to:f*0.8});tone(f*2,0.2,{type:'sine',vol:0.06,at:i*0.26});});},
    jig:function(){[659,784,880,784,659,784,880,1047].forEach(function(f,i){tone(f,0.1,{type:'square',vol:0.05,at:i*0.11});});},
    pop:function(){tone(400,0.08,{type:'sine',to:900,vol:0.15});},
    splat:function(){noise(0.18,{f:900,fto:200,vol:0.3});tone(160,0.12,{type:'sine',to:80,vol:0.15});},
    honk:function(){tone(310,0.16,{type:'square',vol:0.09});tone(310,0.22,{type:'square',vol:0.09,at:0.2});},
    chirp:function(){for(var i=0;i<3;i++)tone(2600,0.07,{type:'sine',to:3600,vol:0.06,at:i*0.13});},
    whee:function(){tone(500,0.6,{type:'sine',to:1500,vol:0.08});noise(0.7,{ft:'highpass',f:3000,vol:0.04});},
    snore:function(){noise(0.5,{f:220,vol:0.1});tone(70,0.5,{type:'sawtooth',vol:0.05,to:55});},
    thud:function(){tone(120,0.12,{type:'sine',to:60,vol:0.2});},
    gobble:function(){for(var i=0;i<9;i++)tone(760-i*45,0.07,{type:'sawtooth',vol:0.09,at:i*0.075,to:520-i*30});for(var j=0;j<7;j++)tone(700-j*45,0.07,{type:'sawtooth',vol:0.08,at:0.85+j*0.075,to:480-j*30});},
    chomp:function(){noise(0.07,{f:700,vol:0.22});tone(190,0.07,{type:'square',to:120,vol:0.07});},
    burp:function(){tone(125,0.75,{type:'sawtooth',to:52,vol:0.22});tone(190,0.6,{type:'square',to:70,vol:0.06});noise(0.7,{f:260,vol:0.12});},
    kiss:function(){tone(1500,0.09,{type:'sine',to:2900,vol:0.12});tone(2200,0.07,{type:'sine',to:3200,vol:0.08,at:0.1});},
    fanfare:function(){[[392,.16],[392,.16],[392,.16],[523,.5],[392,.16],[523,.16],[659,.16],[784,.9]].reduce(function(at,n){tone(n[0],n[1]*1.1,{type:'square',vol:0.09,at:at});tone(n[0]*1.5,n[1]*1.1,{type:'triangle',vol:0.08,at:at});tone(n[0]/2,n[1]*1.1,{type:'sawtooth',vol:0.05,at:at});return at+n[1];},0);},
    boom:function(){noise(0.6,{f:500,fto:60,vol:0.3});tone(90,0.4,{type:'sine',to:40,vol:0.25});for(var i=0;i<5;i++)noise(0.05,{ft:'highpass',f:5000,vol:0.06,at:0.25+i*0.07+Math.random()*0.04});},
    whistle:function(){tone(600,0.5,{type:'sine',to:2400,vol:0.06});},
    glory:function(){var ch=[[523,659,784],[587,740,880],[659,831,988],[784,988,1175],[1047,1319,1568]];ch.forEach(function(c,i){c.forEach(function(f){tone(f,i===4?2.2:0.5,{type:'square',vol:0.06,at:i*0.42});tone(f/2,i===4?2.2:0.5,{type:'triangle',vol:0.07,at:i*0.42});});});
      for(var k=0;k<24;k++)tone([1047,1319,1568,2093][k%4],0.09,{type:'triangle',vol:0.05,at:2.2+k*0.09});}
  };
  return api;
})();
