<script>
"use strict";
/* ---------- audio: synthesised music (one theme per world + combat layer), ambience beds and layered sound effects ---------- */
let AC=null,AU=null;
const VOL={music:.5,sfx:.9};
try{const v=JSON.parse(localStorage.getItem('aetherfall_vol')||'null');if(v){VOL.music=Math.max(0,Math.min(1,+v.music));VOL.sfx=Math.max(0,Math.min(1,+v.sfx))}}catch(e){}
function setVol(k,v){VOL[k]=v;try{localStorage.setItem('aetherfall_vol',JSON.stringify(VOL))}catch(e){}
  if(AU){const n=AC.currentTime;if(k==='music')AU.mus.gain.setTargetAtTime(v*AU.duck,n,.05);else AU.sfx.gain.setTargetAtTime(v,n,.05)}}
function impulse(dur,decay){const sr=AC.sampleRate,len=Math.floor(sr*dur),b=AC.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,decay)*(i<sr*.004?i/(sr*.004):1)}
    for(let k=0;k<7;k++){const p=Math.floor(sr*(.011+k*.017+c*.003));if(p<len)d[p]+=(k%2?-.6:.6)*(1-k/8)}}return b}
function initAudio(){if(AC){if(AC.state==='suspended'&&!document.hidden)AC.resume().catch(()=>{});return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'})}catch(e){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(_){AC=null;return}}
  const n=AC.currentTime,master=AC.createGain(),comp=AC.createDynamicsCompressor();master.gain.value=.85;
  comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;master.connect(comp);comp.connect(AC.destination);
  const rev=AC.createConvolver();rev.buffer=impulse(2.6,3);const revG=AC.createGain();revG.gain.value=.3;rev.connect(revG);revG.connect(master);
  const mus=AC.createGain();mus.gain.value=VOL.music;mus.connect(master);const mSend=AC.createGain();mSend.gain.value=.55;mus.connect(mSend);mSend.connect(rev);
  const sfx=AC.createGain();sfx.gain.value=VOL.sfx;sfx.connect(master);const sSend=AC.createGain();sSend.gain.value=.35;sfx.connect(sSend);sSend.connect(rev);
  /* tempo echo for lead lines */
  const echo=AC.createDelay(2),fb=AC.createGain(),ef=AC.createBiquadFilter(),eo=AC.createGain();echo.delayTime.value=.47;fb.gain.value=.34;ef.type='lowpass';ef.frequency.value=2400;eo.gain.value=.45;
  echo.connect(ef);ef.connect(fb);fb.connect(echo);ef.connect(eo);eo.connect(mus);
  const len=AC.sampleRate*2,nb=AC.createBuffer(1,len,AC.sampleRate),d=nb.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  /* ambience bed: looping filtered noise plus a low hum, shaped per world */
  const as=AC.createBufferSource();as.buffer=nb;as.loop=true;const af=AC.createBiquadFilter();af.type='bandpass';af.frequency.value=800;af.Q.value=.7;const ag=AC.createGain();ag.gain.value=0;
  const lfo=AC.createOscillator(),lg=AC.createGain();lfo.frequency.value=.13;lg.gain.value=0;lfo.connect(lg);lg.connect(af.frequency);lfo.start();
  as.connect(af);af.connect(ag);ag.connect(sfx);as.start();
  const hum=AC.createOscillator(),hg=AC.createGain(),hf=AC.createBiquadFilter();hum.type='sawtooth';hum.frequency.value=55;hf.type='lowpass';hf.frequency.value=160;hg.gain.value=0;hum.connect(hf);hf.connect(hg);hg.connect(sfx);hum.start();
  AU={master,comp,rev,revG,mus,sfx,echo,noise:nb,duck:1,amb:{f:af,g:ag,lg,hg,hum},ambKey:null,cd:{},vt:[],cur:null};
  musicFor()}
function audioSuspend(on){if(!AC)return;try{if(on)AC.suspend();else AC.resume()}catch(e){}}

/* ---- voice building blocks (at = absolute AudioContext time) ---- */
function vEnd(at,src,o,dest){let node=src;
  if(o.ft){const f=AC.createBiquadFilter();f.type=o.ft;f.frequency.setValueAtTime(o.ff,at);if(o.ff2)f.frequency.exponentialRampToValueAtTime(Math.max(20,o.ff2),at+(o.ffd||o.d));f.Q.value=o.q||.8;node.connect(f);node=f}
  const g=AC.createGain(),v=o.v*(AU.vm||1),a=o.a||.003,d=o.d;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(v,at+a);
  if(o.sus!=null){g.gain.setValueAtTime(v,at+Math.max(a,d-o.sus));g.gain.linearRampToValueAtTime(.0001,at+d)}else g.gain.exponentialRampToValueAtTime(.0001,at+Math.max(a+.01,d));
  node.connect(g);node=g;if(o.pan&&AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,o.pan));node.connect(p);node=p}
  node.connect(dest);if(o.send)g.connect(o.send);src.start(at);src.stop(at+d+.06)}
function tone(at,o,dest){const s=AC.createOscillator();s.type=o.w||'sine';s.frequency.setValueAtTime(o.f,at);
  if(o.f2)s.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),at+(o.fd||o.d));if(o.det)s.detune.value=o.det;
  if(o.vib){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=o.vib[0];lg.gain.setValueAtTime(0,at);lg.gain.linearRampToValueAtTime(o.vib[1],at+(o.vib[2]||.01));l.connect(lg);lg.connect(s.frequency);l.start(at);l.stop(at+o.d+.06)}
  vEnd(at,s,o,dest)}
function noi(at,o,dest){const s=AC.createBufferSource();s.buffer=AU.noise;s.loop=true;s.loopStart=Math.random();s.loopEnd=2;if(o.rate)s.playbackRate.value=o.rate;
  const st=s.start.bind(s);s.start=t=>st(t,Math.random()*1.5);vEnd(at,s,o,dest)}
function fm(at,o,dest){const c=AC.createOscillator(),m=AC.createOscillator(),mg=AC.createGain();c.type=o.w||'sine';c.frequency.setValueAtTime(o.f,at);if(o.f2)c.frequency.exponentialRampToValueAtTime(o.f2,at+o.d);
  m.frequency.setValueAtTime(o.f*(o.r||2),at);mg.gain.setValueAtTime(o.idx||300,at);mg.gain.exponentialRampToValueAtTime(Math.max(1,o.idx2||1),at+(o.idd||o.d));m.connect(mg);mg.connect(c.frequency);m.start(at);m.stop(at+o.d+.06);vEnd(at,c,o,dest)}

/* ---- sound effects ---- */
const SX=()=>AU.sfx;
const VMUL={jump:2.5,swing:2.4,dash:2.4,enshot:2.5,enleap:2.4,enswipe:2.4,enspawn:1.5,ui:3,pause:2,warn:2.6,bshot:2.4,fizz:3,slam0:2,pickfang:2,pickcoin:1.4,door:.6,enelite:.8,broar:.9,bdie:.8};
function ok(k,gap){if(!AU||AC.state!=='running')return false;const n=AC.currentTime;if(AU.cd[k]&&n-AU.cd[k]<gap)return false;AU.cd[k]=n;
  AU.vt=AU.vt.filter(t=>n-t<.08);if(AU.vt.length>18)return false;AU.vt.push(n);AU.vm=VMUL[k]||1;return true}
/* stereo position and distance falloff for things in the world */
function sp(x,y){if(x==null||typeof cam!=='number')return{pan:0,g:1};const cx=cam+W/2,dx=x-cx,dy=(y==null?0:y-(camY+H/2));
  const out=Math.max(0,Math.abs(dx)-W/2)+Math.max(0,Math.abs(dy)-H/2);return{pan:Math.max(-.8,Math.min(.8,dx/(W*.6))),g:Math.max(.12,1-out/2200)}}
const T0=()=>AC.currentTime+.005,R=(a,b)=>a+Math.random()*(b-a);
function sfxJump(n){if(!ok('jump',.05))return;const t=T0(),o=SX();
  if(n===2){tone(t,{f:520,f2:1100,d:.16,v:.12,w:'triangle'},o);tone(t+.04,{f:990,f2:1980,d:.14,v:.06},o);noi(t,{d:.12,v:.05,ft:'highpass',ff:4000},o)}
  else{tone(t,{f:240,f2:520,d:.13,v:.14,w:'triangle'},o);noi(t,{d:.12,v:.06,ft:'bandpass',ff:1000,ff2:3200,q:1.2},o)}}
function sfxLand(vy){if(vy<500||!ok('land',.08))return;const k=Math.min(1,vy/2200),t=T0(),o=SX();noi(t,{d:.16,v:.22*k,ft:'lowpass',ff:700,ff2:120},o);tone(t,{f:130,f2:48,d:.13,v:.3*k},o)}
function sfxSwing(c){if(!ok('swing',.04))return;const t=T0(),o=SX(),r=R(.9,1.15);
  if(c===3){noi(t,{d:.24,v:.26,ft:'bandpass',ff:1100*r,ff2:280,q:1.4},o);tone(t+.03,{f:120,f2:70,d:.26,v:.12,w:'sawtooth',ft:'lowpass',ff:700},o);noi(t+.1,{d:.05,v:.18,ft:'bandpass',ff:2400,q:2},o)}
  else noi(t,{d:.13,v:.22,ft:'bandpass',ff:2600*r,ff2:900*r,q:1.6},o)}
function sfxHit(d,e){if(!ok('hit',.025))return;const t=T0(),o=SX(),P=e?sp(e.x,e.y):{pan:0,g:1},g=P.g,pan=P.pan,hv=d>=30;
  tone(t,{f:190,f2:60,d:.12,v:.42*g,pan},o);noi(t,{d:.06,v:.28*g,ft:'bandpass',ff:2600,q:.9,pan},o);
  fm(t,{f:R(500,900),r:2.76,idx:420,d:.2,v:.1*g,pan},o);
  if(hv){tone(t,{f:95,f2:38,d:.32,v:.42*g,pan},o);noi(t,{d:.26,v:.26*g,ft:'lowpass',ff:1800,ff2:160,pan},o)}}
function sfxEnemyDie(e){if(!ok('edie',.04))return;const t=T0(),o=SX(),P=e&&e.x!=null?sp(e.x,e.y):{pan:0,g:1},g=P.g,pan=P.pan,big=e&&e.heavy,fly=e&&e.fly;
  noi(t,{d:big?1.2:.7,v:.5*g,ft:'lowpass',ff:fly?4000:2600,ff2:70,pan},o);tone(t,{f:fly?260:150,f2:34,d:big?.8:.5,v:.5*g,pan},o);
  tone(t,{f:900,f2:90,d:.28,v:.05*g,w:'square',ft:'lowpass',ff:2400,pan},o);
  for(let i=0;i<(big?5:3);i++)fm(t+R(.04,.3),{f:R(1100,2600),r:2.3,idx:500,d:.14,v:.05*g,pan:pan+R(-.3,.3)},o)}
function sfxHurt(d){if(!ok('hurt',.1))return;const t=T0(),o=SX();tone(t,{f:560,f2:230,d:.24,v:.2,w:'sawtooth',ft:'bandpass',ff:1500,q:3,vib:[30,40,.02]},o);
  tone(t,{f:150,f2:55,d:.16,v:.42},o);noi(t,{d:.1,v:.16,ft:'lowpass',ff:1100},o)}
function sfxPlayerDown(){if(!ok('pdown',.5))return;const t=T0(),o=SX();[659,523,440,330].forEach((f,i)=>tone(t+i*.17,{f,d:.34,v:.13,w:'triangle',ft:'lowpass',ff:2200},o));noi(t,{d:.9,v:.12,ft:'lowpass',ff:1600,ff2:100},o)}
function sfxRevive(){if(!ok('rev',.5))return;const t=T0(),o=SX();[392,523,659,784,1047].forEach((f,i)=>tone(t+i*.07,{f,d:.45,v:.09,w:'triangle'},o));noi(t,{d:.9,v:.04,a:.35,ft:'highpass',ff:6000},o)}
function sfxDash(){if(!ok('dash',.08))return;const t=T0(),o=SX();noi(t,{d:.22,v:.28,ft:'bandpass',ff:700,ff2:4200,q:1.3},o);tone(t,{f:200,f2:950,d:.14,v:.05,w:'sawtooth',ft:'lowpass',ff:3200},o);tone(t,{f:1500,f2:300,d:.09,v:.04,w:'square'},o)}
function sfxRoar(){if(!ok('roar',.2))return;const t=T0(),o=SX();
  tone(t,{f:150,f2:88,d:.75,a:.03,v:.26,w:'sawtooth',ft:'bandpass',ff:750,q:2,vib:[27,22,.05]},o);tone(t,{f:224,f2:126,d:.7,a:.03,v:.16,w:'sawtooth',det:14,ft:'bandpass',ff:1200,q:3,vib:[31,30,.05]},o);
  noi(t,{d:.65,v:.18,a:.02,ft:'bandpass',ff:520,q:1},o);tone(t+.05,{f:300,f2:2000,d:.5,v:.09},o);tone(t,{f:62,d:.6,v:.34},o)}
function sfxSlamStart(){if(!ok('slam0',.1))return;const t=T0(),o=SX();tone(t,{f:900,f2:220,d:.3,v:.06,w:'square',ft:'lowpass',ff:2200},o);noi(t,{d:.3,v:.12,ft:'bandpass',ff:1600,ff2:400,q:1.5},o)}
function sfxSlam(){if(!ok('slam',.1))return;const t=T0(),o=SX();tone(t,{f:95,f2:30,d:.55,v:.6},o);noi(t,{d:.6,v:.5,ft:'lowpass',ff:3200,ff2:90},o);fm(t,{f:180,r:1.41,idx:900,d:.5,v:.14},o);noi(t,{d:.1,v:.3,ft:'bandpass',ff:3000,q:1.5},o)}
function sfxBlock(){if(!ok('block',.06))return;const t=T0(),o=SX();fm(t,{f:1250,r:3.5,idx:420,d:.42,v:.14},o);tone(t,{f:2500,d:.3,v:.05},o)}
function sfxDeflect(){if(!ok('defl',.04))return;const t=T0(),o=SX();tone(t,{f:1800,f2:3600,d:.12,v:.14},o);fm(t,{f:2200,r:1.5,idx:300,d:.22,v:.08},o);noi(t,{d:.05,v:.12,ft:'highpass',ff:5000},o)}
function sfxFizz(){if(!ok('fizz',.05))return;noi(T0(),{d:.08,v:.06,ft:'bandpass',ff:3200,q:1.2},SX())}
function sfxPick(type){if(!ok('pick'+type,.05))return;const t=T0(),o=SX();
  if(type==='coin'){tone(t,{f:988,d:.08,v:.07,w:'square',ft:'lowpass',ff:4200},o);tone(t+.07,{f:1319,d:.32,v:.07,w:'square',ft:'lowpass',ff:4200},o)}
  else if(type==='fruit'){[523,659,784].forEach((f,i)=>tone(t+i*.045,{f,d:.2,v:.11,w:'triangle'},o));tone(t,{f:300,f2:900,d:.1,v:.07},o)}
  else if(type==='med'){[392,494,587].forEach(f=>tone(t,{f,d:.5,a:.02,v:.07,w:'triangle'},o));tone(t+.12,{f:784,d:.45,v:.07},o)}
  else if(type==='shard'){[1568,2093,2637].forEach((f,i)=>fm(t+i*.05,{f,r:3.5,idx:240,d:.5,v:.06},o))}
  else if(type==='shield'){tone(t,{f:220,f2:440,d:.42,v:.14,vib:[6,10,.1]},o);tone(t+.1,{f:660,d:.4,v:.05,w:'triangle'},o)}
  else if(type==='fang'){tone(t,{f:110,f2:78,d:.42,v:.18,w:'sawtooth',ft:'bandpass',ff:620,q:2,vib:[24,14]},o);tone(t,{f:440,f2:880,d:.2,v:.05,w:'square',ft:'lowpass',ff:2600},o)}
  else if(type==='egg'){[523,659,784].forEach((f,i)=>tone(t+i*.1,{f,d:.32,v:.11,w:'triangle'},o));tone(t+.3,{f:1047,d:.8,v:.11,w:'triangle',vib:[6,8,.3]},o);noi(t+.3,{d:.8,v:.03,a:.2,ft:'highpass',ff:7000},o)}
  else if(type==='tank'){musicDuckFor(2.2);[440,554,659,880].forEach((f,i)=>tone(t+i*.12,{f,d:.3,v:.08,w:'square',ft:'lowpass',ff:2600},o));
    [440,554,659,1109].forEach(f=>tone(t+.5,{f,d:1.3,a:.05,sus:.6,v:.045,w:'sawtooth',ft:'lowpass',ff:2200},o))}
  else tone(t,{f:880,f2:1320,d:.15,v:.08},o)}
function sfxItemGet(){if(!ok('item',.5))return;musicDuckFor(3.2);const t=T0(),o=SX();noi(t,{d:1.1,v:.1,a:.6,ft:'lowpass',ff:200,ff2:5000,ffd:.9},o);
  [262,330,392,523,659,784,1047].forEach((f,i)=>tone(t+.5+i*.055,{f,d:.5,v:.075,w:'triangle'},o));
  [523,659,784,988].forEach(f=>tone(t+.9,{f,d:2.2,a:.25,sus:1,v:.035,w:'sawtooth',ft:'lowpass',ff:2000},o));[2093,2637,3136].forEach((f,i)=>fm(t+.95+i*.12,{f,r:3.5,idx:200,d:.8,v:.04},o))}
function sfxCrate(b){if(!ok('crate'+b,.04))return;const t=T0(),o=SX();
  if(!b){tone(t,{f:230,f2:140,d:.09,v:.3},o);noi(t,{d:.05,v:.2,ft:'bandpass',ff:1300,q:1.2},o);fm(t,{f:420,r:2.1,idx:350,d:.16,v:.09},o)}
  else{noi(t,{d:.42,v:.4,ft:'lowpass',ff:2800,ff2:200},o);tone(t,{f:170,f2:50,d:.3,v:.34},o);for(let i=0;i<4;i++)fm(t+R(.02,.2),{f:R(700,1600),r:2.1,idx:300,d:.12,v:.05},o)}}
function sfxEnemy(k,e){const P=e?sp(e.x,e.y):{pan:0,g:1};if(P.g<.2&&k!=='elite')return;if(!ok('en'+k,k==='shot'?.05:.06))return;const t=T0(),o=SX(),g=P.g,pan=P.pan;
  if(k==='shot'){if(e&&e.type==='c'){tone(t,{f:300,f2:900,d:.26,v:.07*g,vib:[18,40],pan},o);tone(t,{f:600,f2:1800,d:.22,v:.04*g,pan},o)}
    else{tone(t,{f:1500,f2:480,d:.12,v:.06*g,w:'square',ft:'lowpass',ff:3600,pan},o);noi(t,{d:.04,v:.05*g,ft:'highpass',ff:4000,pan},o)}}
  else if(k==='leap'){tone(t,{f:300,f2:720,d:.18,v:.12*g,w:'sawtooth',ft:'bandpass',ff:1200,q:3,pan},o);noi(t,{d:.14,v:.08*g,ft:'bandpass',ff:2000,pan},o)}
  else if(k==='smash'){tone(t,{f:82,f2:34,d:.42,v:.45*g,pan},o);noi(t,{d:.42,v:.34*g,ft:'lowpass',ff:1300,ff2:100,pan},o);fm(t,{f:150,r:1.41,idx:700,d:.3,v:.1*g,pan},o)}
  else if(k==='swipe'){tone(t,{f:220,f2:340,d:.1,v:.05*g,w:'square',ft:'lowpass',ff:1500,pan},o);noi(t,{d:.13,v:.1*g,ft:'bandpass',ff:1900,ff2:700,q:1.4,pan},o)}
  else if(k==='spawn'){tone(t,{f:200,f2:1300,d:.32,v:.07*g,vib:[24,60],pan},o);noi(t,{d:.28,v:.04*g,a:.2,ft:'highpass',ff:3000,pan},o)}
  else if(k==='elite'){[110,116.5].forEach(f=>tone(t,{f,d:1.1,a:.04,sus:.3,v:.12,w:'sawtooth',ft:'lowpass',ff:900},o));tone(t,{f:55,d:1.1,v:.3},o)}}
function sfxDoor(){if(!ok('door',.2))return;const t=T0(),o=SX();noi(t,{d:.32,v:.12,ft:'highpass',ff:2400,ff2:700},o);tone(t+.16,{f:130,f2:60,d:.16,v:.3},o);fm(t+.16,{f:300,r:1.41,idx:400,d:.2,v:.07},o)}
function sfxLift(dir){if(!ok('lift',.5))return;const t=T0(),o=SX();tone(t,{f:60,f2:dir<0?130:38,d:.95,a:.1,sus:.3,v:.09,w:'sawtooth',ft:'lowpass',ff:420},o);
  noi(t,{d:.95,v:.1,a:.12,sus:.3,ft:'lowpass',ff:320},o);tone(t+.72,{f:880,d:.4,v:.06},o);tone(t+.84,{f:660,d:.5,v:.06},o)}
function sfxAlarm(){if(!ok('alarm',1))return;const t=T0(),o=SX();for(let i=0;i<3;i++){tone(t+i*.5,{f:620,d:.23,v:.07,w:'square',ft:'lowpass',ff:2000,sus:.05},o);tone(t+i*.5+.25,{f:466,d:.23,v:.07,w:'square',ft:'lowpass',ff:2000,sus:.05},o)}
  tone(t,{f:55,d:.9,v:.25},o)}
function sfxClear(){if(!ok('clear',.5))return;const t=T0(),o=SX();[523,659,784,1047].forEach((f,i)=>tone(t+i*.08,{f,d:.25,v:.07,w:'square',ft:'lowpass',ff:3000},o));
  [523,659,784].forEach(f=>tone(t+.36,{f,d:.9,a:.02,v:.05,w:'triangle'},o));tone(t+.5,{f:120,f2:60,d:.15,v:.25},o)}
function sfxGateBreak(){if(!ok('gate',.2))return;const t=T0(),o=SX();noi(t,{d:1,v:.5,ft:'lowpass',ff:5000,ff2:140},o);tone(t,{f:72,f2:30,d:.8,v:.55},o);
  for(let i=0;i<6;i++)fm(t+R(0,.4),{f:R(1500,4000),r:2.7,idx:600,d:.3,v:.05,pan:R(-.5,.5)},o)}
function sfxSave(){if(!ok('save',.5))return;const t=T0(),o=SX();[392,494,587,784].forEach((f,i)=>tone(t+i*.12,{f,d:.7,v:.09,w:'triangle'},o));[392,587].forEach(f=>tone(t+.48,{f:f*2,d:1.2,a:.2,v:.03},o))}
function sfxVent(x){const P=sp(x,null);if(!ok('vent',.3))return;noi(T0(),{d:.65,a:.05,v:.05*P.g,ft:'bandpass',ff:3200,ff2:1100,q:.8,pan:P.pan},SX())}
function sfxThunder(){if(!ok('thunder',1))return;const t=T0(),o=SX();noi(t,{d:2.4,a:.04,v:.5,ft:'lowpass',ff:420,ff2:120,ffd:2.4},o);noi(t,{d:.22,v:.14,ft:'highpass',ff:2200},o)}
function sfxBossRoar(){if(!ok('broar',.5))return;const t=T0(),o=SX();tone(t,{f:72,f2:52,d:1.5,a:.06,v:.32,w:'sawtooth',ft:'bandpass',ff:420,q:2,vib:[19,10,.1]},o);
  tone(t,{f:108,f2:74,d:1.4,a:.06,v:.2,w:'sawtooth',det:-18,ft:'bandpass',ff:700,q:3,vib:[23,16,.1]},o);noi(t,{d:1.3,a:.05,v:.28,ft:'lowpass',ff:650,ff2:200},o);tone(t,{f:40,d:1.5,v:.5},o)}
function sfxBossDie(){if(!ok('bdie',1))return;const t=T0(),o=SX();noi(t,{d:3.2,a:.1,v:.4,ft:'lowpass',ff:3000,ff2:80,ffd:3},o);tone(t,{f:120,f2:25,d:3,v:.45},o);
  [262,330,392,523,659].forEach((f,i)=>tone(t+1.6+i*.12,{f,d:1.6,a:.05,v:.05,w:'triangle'},o))}
function sfxGameOver(){if(!ok('go',1))return;const t=T0(),o=SX();[392,370,349,330,262].forEach((f,i)=>tone(t+i*.26,{f,d:i===4?1.4:.6,v:.1,w:'triangle',ft:'lowpass',ff:1800},o));tone(t+1,{f:65,d:1.6,a:.2,v:.2},o)}
function sfxUI(p){if(!AU||!ok('ui',.04))return;const t=T0(),o=SX();if(p)tone(t,{f:880,f2:1320,d:.09,v:.08,w:'triangle'},o);else tone(t,{f:660,f2:520,d:.08,v:.06,w:'triangle'},o)}
function sfxPause(on){if(!ok('pause',.1))return;const t=T0(),o=SX();tone(t,{f:on?660:440,f2:on?440:660,d:.13,v:.08,w:'triangle'},o);tone(t+.06,{f:on?440:880,d:.12,v:.05},o)}
const S={hit:()=>sfxHit(14,null),die:()=>sfxEnemyDie(null),pick:()=>sfxPick('coin'),jump:()=>sfxJump(1),swing:()=>sfxSwing(1),special:()=>sfxRoar(),hurt:()=>sfxHurt(10),
  shot:()=>{if(!ok('bshot',.07))return;const t=T0();tone(t,{f:520,f2:240,d:.18,v:.07,w:'square',ft:'lowpass',ff:2200},SX());tone(t,{f:1040,f2:480,d:.12,v:.04},SX())},
  boom:()=>{if(!ok('boom',.06))return;const t=T0(),o=SX();noi(t,{d:.8,v:.45,ft:'lowpass',ff:2200,ff2:70},o);tone(t,{f:110,f2:30,d:.6,v:.5},o)},
  warn:()=>{if(!ok('warn',.15))return;const t=T0(),o=SX();tone(t,{f:540,f2:300,d:.32,v:.08,w:'sawtooth',ft:'bandpass',ff:1200,q:2},o);tone(t+.12,{f:540,f2:300,d:.3,v:.06,w:'sawtooth',ft:'bandpass',ff:1200,q:2},o)}};

/* ---- music ---- */
const SCL={min:[0,2,3,5,7,8,10],phr:[0,1,3,5,7,8,10],dor:[0,2,3,5,7,9,10],lyd:[0,2,4,6,7,9,11],hmin:[0,2,3,5,7,8,11],maj:[0,2,4,5,7,9,11]};
/* k kick, s snare, h hat, o open hat, c clank, t tom; bass: x root, o octave, f fifth, - hold */
const TRK={
 title:  {bpm:72, root:50,sc:'dor', prog:[0,5,3,4,0,5,6,4],pad:'choir',cut:1100,lead:'triangle',arp:'bell',arpR:2,bass:'x-------x-------',dr:{k:'',s:'',h:''},seed:11,rev:.45},
 a0:     {bpm:94, root:50,sc:'min', prog:[0,0,5,5,3,3,4,4],pad:'saw',cut:850,lead:'square',arp:'pulse',arpR:1,bass:'x..x..x.x--.o.f.',dr:{k:'x.....x.x.......',s:'....x.......x...',h:'..h...h...h...h.'},seed:3,rev:.38,amb:'rain'},
 a1:     {bpm:104,root:52,sc:'phr', prog:[0,1,0,6,0,1,5,4],pad:'saw',cut:700,lead:'sawtooth',arp:'',bass:'x.x.x.x.x.x.o.x.',dr:{k:'x..x..x...x..x..',s:'....x..x....x.xx',h:'h.h.h.h.h.h.h.h.'},seed:5,rev:.28,amb:'rain2'},
 a2:     {bpm:84, root:53,sc:'lyd', prog:[0,1,0,1,5,4,3,4],pad:'glass',cut:1600,lead:'triangle',arp:'bell',arpR:1,bass:'x-------f---o---',dr:{k:'x.........x.....',s:'........x.......',h:'....h.......h...'},seed:8,rev:.5,amb:'hum'},
 a3:     {bpm:116,root:45,sc:'min', prog:[0,0,6,6,5,5,4,4],pad:'saw',cut:600,lead:'square',arp:'pulse',arpR:1,bass:'xx.xx.x.xx.xo.f.',dr:{k:'x...x...x...x...',s:'....x.......x..x',h:'.h.h.h.h.h.h.h.h',c:'..c.....c..c....'},seed:13,rev:.3,amb:'rumble'},
 a4:     {bpm:78, root:49,sc:'hmin',prog:[0,5,3,4,0,5,1,4],pad:'choir',cut:1300,lead:'sine',arp:'bell',arpR:2,bass:'x-------x---f---',dr:{k:'x.......x.......',s:'............t.t.',h:'..h.......h.....'},seed:17,rev:.55,amb:'wind'},
 a5:     {bpm:128,root:47,sc:'min', prog:[0,5,6,4,0,5,3,4],pad:'saw',cut:900,lead:'sawtooth',arp:'pulse',arpR:1,bass:'xoxoxoxoxoxoxoxo',dr:{k:'x...x...x...x..x',s:'....x.......x...',h:'hhohhhohhhohhhoh'},seed:19,rev:.35,amb:'rumble'},
 boss:   {bpm:150,root:52,sc:'hmin',prog:[0,0,5,4,0,0,1,4],pad:'saw',cut:1000,lead:'sawtooth',arp:'pulse',arpR:1,bass:'xxoxxxoxxxoxxfox',dr:{k:'x.x.x..xx.x.x..x',s:'....x.......x.xx',h:'hhhhhhhhhhhhhhhh'},seed:23,rev:.3,combat:1},
 victory:{bpm:100,root:48,sc:'maj', prog:[0,3,4,0,5,3,4,4],pad:'glass',cut:2200,lead:'square',arp:'bell',arpR:2,bass:'x...f...o...f...',dr:{k:'x.......x.......',s:'....x.......x...',h:'h.h.h.h.h.h.h.h.'},seed:29,rev:.45}};
const CMB={k:'x...x...x...x...',s:'....x.......x...',h:'hhhhhhhhhhhhhhhh',st:'x.....x.....x...',b:'o.o.o.o.o.o.o.o.'};
const semi=(T,d)=>{const s=SCL[T.sc],o=Math.floor(d/7),i=((d%7)+7)%7;return s[i]+12*o};
const mf=m=>440*Math.pow(2,(m-69)/12);
function genMelody(T){if(T._mel)return T._mel;const r=rng(T.seed*7919+13),n=T.prog.length,map={};
  const RHY=[[0,4,6,8,12],[0,3,6,8,10,12],[0,2,4,8,12,14],[0,6,8,12],[0,4,8,10,12,14],[0,3,4,8,11,12],[0,2,3,6,8,12]];
  const mk=()=>{const rh=RHY[Math.floor(r()*RHY.length)],c=[];let d=[0,2,4,4][Math.floor(r()*4)];for(let i=0;i<rh.length;i++){c.push(d);d+=[-2,-1,-1,1,1,2,0,-3][Math.floor(r()*8)];d=Math.max(-2,Math.min(7,d))}return{rh,c}};
  const A=mk(),B=mk(),Cm=mk();
  for(let b=0;b<n;b++){const root=T.prog[b],m=b===n-1?null:b%4===3?B:b%4===2?Cm:A;
    if(!m){map[b*16]={deg:root,len:12};continue}
    m.rh.forEach((st,i)=>{const nx=i+1<m.rh.length?m.rh[i+1]:16;let deg=root+m.c[i];if(st%8===0){const rel=((deg-root)%7+7)%7;if(rel===1||rel===3||rel===5)deg-=1;else if(rel===6)deg+=1}
      map[b*16+st]={deg,len:Math.min(nx-st,6)}})}
  return T._mel=map}
function mPad(at,T,f,dur,g){const o={d:dur,a:.45,sus:.5,v:.028,ft:'lowpass',ff:T.cut,q:.6};
  if(T.pad==='glass'){tone(at,Object.assign({},o,{f,w:'triangle',v:.04}),g);tone(at,Object.assign({},o,{f:f*2,w:'sine',v:.018,vib:[4.5,3,.6]}),g)}
  else if(T.pad==='choir'){tone(at,Object.assign({},o,{f,w:'sawtooth',ft:'bandpass',ff:800,q:2.2,v:.05,vib:[5,f*.006,.5]}),g);tone(at,Object.assign({},o,{f,w:'sawtooth',det:9,ft:'bandpass',ff:1150,q:3,v:.03}),g)}
  else{tone(at,Object.assign({},o,{f,w:'sawtooth',det:-8}),g);tone(at,Object.assign({},o,{f,w:'sawtooth',det:8}),g)}}
function mBass(at,T,f,dur,g,v){tone(at,{f,d:dur,v:.11*(v||1),w:'sawtooth',ft:'lowpass',ff:900,ff2:220,ffd:Math.min(dur,.2),q:2,sus:.04},g);tone(at,{f,d:dur,v:.12*(v||1),sus:.04},g)}
function mLead(at,T,f,dur,g){const o={f,d:dur,a:.012,sus:Math.min(.08,dur*.3),v:T.lead==='sawtooth'?.038:T.lead==='square'?.04:.07,w:T.lead,ft:'lowpass',ff:2600,vib:[5.5,f*.012,.18],send:AU.echo};tone(at,o,g)}
function mArp(at,T,f,g,v){if(T.arp==='bell')fm(at,{f,r:3.5,idx:f*.9,d:.6,v:.03*v},g);else tone(at,{f,d:.13,v:.022*v,w:'square',ft:'lowpass',ff:1900},g)}
function mDrum(at,ch,g,acc){
  if(ch==='x'||ch==='k'){tone(at,{f:150,f2:44,fd:.12,d:.28,v:.42*acc},g);noi(at,{d:.012,v:.05,ft:'highpass',ff:3000},g)}
  else if(ch==='s'){noi(at,{d:.17,v:.15*acc,ft:'bandpass',ff:1900,q:.7},g);tone(at,{f:200,f2:160,d:.09,v:.1*acc,w:'triangle'},g)}
  else if(ch==='h'){noi(at,{d:.035,v:.04*acc,ft:'highpass',ff:7500},g)}
  else if(ch==='o'){noi(at,{d:.2,v:.035*acc,ft:'highpass',ff:6500},g)}
  else if(ch==='c'){fm(at,{f:330,r:1.41,idx:700,d:.13,v:.05*acc},g)}
  else if(ch==='t'){tone(at,{f:190,f2:95,d:.25,v:.22*acc},g)}}
function stepSched(c,step,at){AU.vm=1;const T=c.T,sd=60/T.bpm/4,n=T.prog.length,bar=Math.floor(step/16)%n,s=step%16,cyc=Math.floor(step/(16*n)),root=T.prog[bar],g=c.g,cg=c.cg;
  const N=(d,oct)=>mf(T.root+semi(T,d)+12*(oct||0)),intro=cyc===0&&bar<2&&!T.combat;
  if(s===0&&T.pad){const dur=16*sd+.35;[0,2,4].forEach(k=>mPad(at,T,N(root+k,1),dur,g));if(T.sc==='hmin'||T.sc==='dor')mPad(at,T,N(root+6,0),dur,g)}
  const bc=T.bass[s];if(bc&&bc!=='.'&&bc!=='-'&&!intro){let k=1;while(s+k<16&&T.bass[s+k]==='-')k++;mBass(at,T,N(root+(bc==='f'?4:0),bc==='o'?0:-1),k*sd*.92,g)}
  if(T.arp&&s%T.arpR===0){const tones=[0,2,4,7,4,2],i=(s/T.arpR)%tones.length;mArp(at,T,N(root+tones[i],1),g,T.lead&&cyc%4!==0?.7:1)}
  if(T.lead&&cyc%4!==0){const e=genMelody(T)[bar*16+s];if(e)mLead(at,T,N(e.deg,T.lead==='sine'?2:1),e.len*sd*.95,g)}
  if(!intro)for(const ch of['k','s','h','c']){const p=T.dr[ch];if(p&&p[s]&&p[s]!=='.')mDrum(at,p[s]==='x'?'k':p[s],g,s%4===0?1:.8)}
  /* combat layer: four-on-the-floor, 16th hats, brass stabs and octave bass, faded in during lockdowns */
  if(c.cOn||AC.currentTime<c.cUntil){if(CMB.k[s]==='x')mDrum(at,'k',cg,1);if(CMB.s[s]==='x')mDrum(at,'s',cg,1.1);if(s%2===1)mDrum(at,'h',cg,.7);
    if(CMB.st[s]==='x')[0,2,4].forEach(k=>tone(at,{f:N(root+k,1),d:.2,v:.035,w:'sawtooth',ft:'lowpass',ff:2600,ff2:500,q:1.5},cg));
    if(CMB.b[s]==='o')mBass(at,T,N(root,-1),sd*.8,cg,.8)}}
function musicPlay(name){if(!AU)return;const cur=AU.cur;if(cur&&cur.name===name&&!cur.dead)return;const n=AC.currentTime;
  if(cur){cur.dead=1;cur.g.gain.setTargetAtTime(0,n,.35);const old=cur;setTimeout(()=>{try{old.g.disconnect()}catch(e){}},3000)}
  const T=TRK[name];if(!T){AU.cur=null;return}const g=AC.createGain(),cg=AC.createGain();g.gain.setValueAtTime(0,n);g.gain.setTargetAtTime(1,n+.05,.4);cg.gain.value=T.combat?1:0;cg.connect(g);g.connect(AU.mus);
  AU.echo.delayTime.setValueAtTime(60/T.bpm*.75,n);AU.cur={name,T,g,cg,step:0,next:n+.12,cOn:T.combat?1:0,cUntil:0};genMelody(T)}
function musicStop(fade){if(!AU||!AU.cur)return;const c=AU.cur;c.dead=1;c.g.gain.setTargetAtTime(0,AC.currentTime,(fade||1)/3);setTimeout(()=>{try{c.g.disconnect()}catch(e){}},(fade||1)*1000+1500);AU.cur=null}
function musicDuck(on){if(!AU)return;AU.duck=on?.35:1;AU.mus.gain.setTargetAtTime(VOL.music*AU.duck,AC.currentTime,.12)}
function musicDuckFor(sec){if(!AU)return;AU.mus.gain.setTargetAtTime(VOL.music*.2,AC.currentTime,.08);clearTimeout(AU.dt);AU.dt=setTimeout(()=>{if(AU)AU.mus.gain.setTargetAtTime(VOL.music*AU.duck,AC.currentTime,.5)},sec*1000)}
function musicFor(){if(!AU)return;let n;if(G.state==='menu')n='title';else if(ROOM&&ROOM.kind==='boss'&&!META.boss)n='boss';else n='a'+Math.max(0,Math.min(5,G.lv));musicPlay(n)}
const AMBS={rain:{t:'bandpass',f:2600,q:.5,v:.05},rain2:{t:'bandpass',f:2200,q:.6,v:.032},hum:{t:'lowpass',f:220,q:1,v:.05,hum:.035},rumble:{t:'lowpass',f:320,q:1.2,v:.07,hum:.02},wind:{t:'bandpass',f:650,q:2.5,v:.06,lfo:380}};
function ambienceTick(){const want=G.state==='menu'?'menu':G.state==='play'||G.state==='card'?(TRK['a'+G.lv]||{}).amb||'none':'none',key=want+G.lv+(AU.cur?AU.cur.name:'');if(key===AU.ambKey)return;AU.ambKey=key;
  const n=AC.currentTime,A=AMBS[want]||{t:'lowpass',f:400,q:1,v:want==='menu'?.015:0},a=AU.amb;a.f.type=A.t;a.f.frequency.setTargetAtTime(A.f,n,.3);a.f.Q.value=A.q;
  a.g.gain.setTargetAtTime(A.v,n,.8);a.lg.gain.setTargetAtTime(A.lfo||0,n,.5);a.hg.gain.setTargetAtTime(A.hum||0,n,.8);
  const T=AU.cur&&AU.cur.T;AU.revG.gain.setTargetAtTime(T?T.rev*.8:.3,n,.5)}
/* called every frame: schedule notes a little ahead of time */
function musicTick(){if(!AU||AC.state!=='running')return;ambienceTick();const c=AU.cur;if(!c)return;const n=AC.currentTime;
  const want=c.T.combat?1:(lock&&G.state==='play'&&!G.paused?1:0);if(want!==c.cOn){c.cOn=want;c.cUntil=want?1e9:n+2.5;c.cg.gain.setTargetAtTime(want,n,want?.15:.7)}
  if(c.next<n-.25)c.next=n+.05;const sd=60/c.T.bpm/4;let k=0;while(c.next<n+.14&&k++<8){const sw=c.step%2===1?sd*.06:0;stepSched(c,c.step,c.next+sw);c.next+=sd;c.step++}}
</script>
