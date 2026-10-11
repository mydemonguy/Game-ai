<script>
"use strict";
const C=document.getElementById('c');let X=C.getContext('2d',{alpha:false});
let W=1920;const H=1080,GY=880;
const touchy=matchMedia('(pointer:coarse)').matches||('ontouchstart' in window);
/* stage pixels on the right that the touch buttons cover; enemies are kept out of that strip */
const RSAFE=touchy?500:200;
/* the stage is always 1080 tall; its width follows the screen (1920 on 16:9, 2400 on a 20:9 phone), so there are no black bars */
function fit(){const w=innerWidth,h=innerHeight,land=w>=h;
  const nw=land?Math.round(Math.min(2560,Math.max(1440,H*w/h))):1920;
  if(nw!==W||C.width!==nw){W=nw;C.width=W;C.height=H;C._dirty=1}
  const s=Math.min(w/W,h/H);C.style.width=W*s+'px';C.style.height=H*s+'px';
  document.getElementById('rotate').hidden=!(touchy&&h>w*1.05);}
addEventListener('resize',fit);fit();

/* ---------- audio ---------- */
let AC=null;
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){AC=null}}
function sfx(f,d,t,v,slide){if(!AC)return;try{const n=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=t||'square';o.frequency.setValueAtTime(f,n);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),n+d);g.gain.setValueAtTime(v||.06,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);
  o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+d+.02)}catch(e){}}
const S={hit:()=>sfx(240,.09,'square',.06,-150),swing:()=>sfx(700,.08,'sawtooth',.025,-500),jump:()=>sfx(320,.12,'triangle',.06,320),
  hurt:()=>sfx(140,.22,'sawtooth',.08,-80),special:()=>{sfx(180,.45,'sawtooth',.07,1100);sfx(90,.5,'sine',.1,200)},die:()=>sfx(110,.35,'square',.06,-70),
  pick:()=>sfx(660,.18,'sine',.08,600),shot:()=>sfx(880,.09,'sine',.025,-500),boom:()=>sfx(60,.6,'sawtooth',.12,-20),warn:()=>sfx(420,.25,'triangle',.05,-100)};

/* ---------- input ---------- */
const K={left:0,right:0,jump:0,attack:0,special:0,dash:0},P={};
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',KeyJ:'attack',KeyX:'attack',KeyK:'special',KeyC:'special',KeyL:'dash',ShiftLeft:'dash',ShiftRight:'dash'};
addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(k&&G.state==='play'){if(!K[k])P[k]=1;K[k]=1;e.preventDefault()}
  if((e.code==='Escape'||e.code==='KeyP')&&!e.repeat)togglePause();});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)K[k]=0});
/* action buttons: no pointer capture, so a thumb can slide from one button onto another */
document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k,ids=new Set();
  const press=e=>{if(!ids.size){if(!K[k])P[k]=1;K[k]=1;b.classList.add('on');buzz(6)}ids.add(e.pointerId)};
  const rel=e=>{ids.delete(e.pointerId);if(!ids.size){K[k]=0;b.classList.remove('on')}};
  b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{b.releasePointerCapture(e.pointerId)}catch(_){}press(e)});
  b.addEventListener('pointerenter',e=>{if(e.pointerType==='touch'||e.buttons)press(e)});
  ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,rel));
  b._clear=()=>{ids.clear();K[k]=0;b.classList.remove('on')}});
/* floating thumbstick: touch anywhere in the left zone, the stick centres under the thumb */
const SZ=document.getElementById('stickZone'),SB=document.getElementById('stickBase'),SK=document.getElementById('stickKnob');
const stick={id:null,ox:0,oy:0,x:0};
function stickSet(dx){const r=SB.offsetWidth*.42||60,n=Math.max(-1,Math.min(1,dx/r));stick.x=n;
  SK.style.transform=`translate(calc(-50% + ${n*r}px),-50%)`;K.left=n<-.28?1:0;K.right=n>.28?1:0}
function stickEnd(){stick.id=null;stick.x=0;K.left=K.right=0;SB.classList.remove('live');SB.style.left='';SB.style.bottom='';SB.style.top='';SK.style.transform=''}
SZ.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();if(stick.id!==null)return;stick.id=e.pointerId;try{SZ.setPointerCapture(e.pointerId)}catch(_){}
  const zr=SZ.getBoundingClientRect(),half=SB.offsetWidth/2;
  const x=Math.max(zr.left+half,Math.min(zr.right-half,e.clientX)),y=Math.max(zr.top+half,Math.min(zr.bottom-half,e.clientY));
  stick.ox=x;SB.style.left=(x-zr.left)+'px';SB.style.top=(y-zr.top-half)+'px';SB.style.bottom='auto';SB.classList.add('live');stickSet(e.clientX-x)});
SZ.addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;e.preventDefault();stickSet(e.clientX-stick.ox)});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>SZ.addEventListener(t,e=>{if(e.pointerId===stick.id)stickEnd()}));
function buzz(p){try{if(touchy&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}
function clearInput(){if(typeof stickEnd==='function'&&stick.id!==null)stickEnd();for(const k in K)K[k]=0;for(const k in P)delete P[k];document.querySelectorAll('[data-k]').forEach(b=>{b.classList.remove('on');if(b._clear)b._clear()})}

/* ---------- world data ---------- */
const LV=[
 {name:'Ruins of Veyra',ch:'Chapter I',theme:'ruins',len:6200,sky:['#120a26','#3d2152','#b8555a'],planet:'#f2a67a',far:'#24163a',mid:'#2f1c45',gnd:'#170f22',glow:'#ff9a6a',
  waves:[['g','g'],['g','d','g'],['g','g','g'],['d','g','d','g']]},
 {name:'Lumen Crystal Wilds',ch:'Chapter II',theme:'crystal',len:6600,sky:['#03121f','#0b3346','#1f7a7a'],planet:'#b9fff2',far:'#0b2a3a',mid:'#0f3a4a',gnd:'#06161f',glow:'#62ffe0',
  waves:[['g','d','d'],['g','g','b'],['d','d','g','g'],['b','g','d','g']]},
 {name:'Skyharbor Aeris',ch:'Chapter III',theme:'sky',len:7000,sky:['#0d1a3f','#2c4a8a','#e0a07a'],planet:'#ffe2b0',far:'#2a3a6a',mid:'#1d2850',gnd:'#141a33',glow:'#ffd27a',
  waves:[['d','d','g'],['b','d','d'],['g','g','g','d','d'],['b','b','d']]},
 {name:'The Ashen Forge',ch:'Chapter IV',theme:'forge',len:7000,sky:['#140504','#45120a','#c2401a'],planet:'#ff6a2a',far:'#2a0e0a',mid:'#3a1410',gnd:'#1a0806',glow:'#ff5a1f',
  waves:[['c','g','g'],['b','c','d'],['g','g','c','c'],['b','b','c','d']]},
 {name:'Gates of the Null Citadel',ch:'Chapter V',theme:'citadel',len:7400,sky:['#05030f','#1c0f3d','#5a2a8a'],planet:'#c9a8ff',far:'#160c30',mid:'#201240',gnd:'#0c0718',glow:'#b48cff',
  waves:[['c','c','d','d'],['b','b','g','g','c'],['d','d','d','c','c'],['b','b','b','c']]},
 {name:'Throne of the Rift',ch:'Chapter VI',theme:'throne',len:6000,sky:['#020205','#170718','#4a0a2a'],planet:'#ff3d6e',far:'#120612',mid:'#1c0a1c',gnd:'#08040a',glow:'#ff3d6e',
  waves:[['c','b','d'],['g','g','c','c','b']],boss:true}
];
LV.forEach(L=>{const n=L.waves.length,end=L.boss?L.len-2200:L.len-900;L.trig=L.waves.map((_,i)=>Math.round(900+(end-900)*i/Math.max(1,n-1)))});

const STORY={
 intro:[
  {ey:'The Age of Aether',h:'The Light Between Stars',b:`<p>For a thousand years the kingdom of <b>Ithra</b> drew its power from the Aether, the living light that flows between the stars. It lit their cities, sang through their crystal forests and lifted their skyships into the clouds.</p><p>The <b>Starblade Order</b> kept the peace. Each knight carried a sword forged from the heart of a dying star.</p>`},
  {ey:'The Fall',h:'Malakar Opens the Rift',b:`<p>Then Archmage <b>Malakar</b>, the Order's own Grand Master, tore open the Rift at the world's core. Void poured out. He fused his followers with machine and shadow and named them the <b>Hollowed</b>.</p><p>The Order fell in a single night. Ithra went dark.</p>`},
  {ey:'Awakening',h:'The Last Starblade',b:`<p>Thirty years later, in a sealed cryo-vault beneath the ruined temple, <b>Kael Varen</b> opens his eyes. In his hand is the last starblade. Inside it lives <b>Lyra</b>, the blade's star-spirit, and she has been waiting.</p><p><span class="who">LYRA:</span> "Get up, knight. The Rift is still open, and you are all the light this world has left."</p>`}
 ],
 brief:[
  `<p><span class="who">LYRA:</span> "These ruins were Veyra, the temple city. The Hollowed patrol them now. Their cores are stolen souls wrapped in iron. Free them."</p>`,
  `<p><span class="who">LYRA:</span> "The Lumen Wilds used to sing. Malakar's drones are draining the crystals to feed the Rift. Can you hear how quiet it is?"</p>`,
  `<p><span class="who">LYRA:</span> "Skyharbor Aeris. His fleet docks here before every raid. Watch the edge, Kael. It's a long fall to the clouds."</p>`,
  `<p><span class="who">LYRA:</span> "The Ashen Forge is where the Hollowed are made. Kael, I found records here. Malakar didn't just lead the Order. He forged <i>this</i> blade. He forged <i>me</i>."</p>`,
  `<p><span class="who">LYRA:</span> "The Null Citadel. Its gates were built to keep the Void <i>in</i>. He turned them inside out. Every Hollowed he has left is waiting here."</p>`,
  `<p><span class="who">MALAKAR:</span> "Little star. You came home to your maker."</p><p><span class="who">LYRA:</span> "Don't listen to him. Strike true, Kael. This ends tonight."</p>`
 ],
 clear:[
  'The first souls rise free from their iron shells, glowing for a moment before they fade into the dawn.',
  'A single crystal begins to hum again. Then another. The forest remembers its song.',
  'Malakar\'s flagship burns on its moorings. The Hollowed fleet will not fly tonight.',
  'The great anvils go cold. No more Hollowed will be made in Ithra.',
  'The Citadel gates crack open. Beyond them, the Rift pulses like a red heart.'
 ],
 ending:[
  {ey:'Malakar Falls',h:'The Rift Closes',b:`<p><span class="who">MALAKAR:</span> "I only wanted... to make the light last forever..."</p><p>Kael drives the starblade into the heart of the Rift. Lyra's light pours out of the sword, brighter than any star, and the wound in the world begins to seal.</p>`},
  {ey:'Epilogue',h:'Dawn Over Ithra',b:`<p>When Kael wakes, the sky is blue. The crystal forests sing. Skyships rise over Veyra, and the freed souls of the Hollowed drift upward like lanterns.</p><p>The starblade is dark now. But sometimes, late at night, it hums.</p><p><span class="who">LYRA:</span> "The stars remember you, knight."</p>`}
 ]
};

/* ---------- state ---------- */
const G={state:'menu',lv:0,score:0,paused:false,best:0};
let unlocked=1;try{unlocked=Math.max(1,Math.min(6,+localStorage.getItem('aetherfall_unlock')||1));G.best=+localStorage.getItem('aetherfall_best')||0}catch(e){}
function saveProg(){try{localStorage.setItem('aetherfall_unlock',unlocked);localStorage.setItem('aetherfall_best',Math.max(G.best,G.score))}catch(e){}}
let rings=[],pl,en=[],shots=[],parts=[],picks=[],texts=[],hz=[],spawnQ=[],cam=0,lock=false,waveI=0,shake=0,boss=null,bossDone=false,lvT=0,hitStop=0,banner=null,bg=null,flashT=0,doneT=0;
const dm=()=>1+G.lv*.12;

function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const ebox=e=>({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const pbox=()=>({x:pl.x-32,y:pl.y-150,w:64,h:150});

function newPlayer(){return{x:300,y:GY,vx:0,vy:0,face:1,hp:100,max:100,en:30,ground:true,jumps:0,atk:0,atkCD:0,combo:0,comboT:0,inv:0,hurtT:0,hitDone:new Set(),run:0,dashT:0,dashCD:0,squash:0,hits:0,hitsT:0,ghostT:0,ghosts:[]}}

const ETYPES={
 g:{w:80,h:165,hp:42,spd:260,dmg:10,score:100},
 b:{w:140,h:270,hp:130,spd:150,dmg:22,score:300,heavy:true},
 d:{w:70,h:70,hp:28,spd:0,dmg:8,score:150,fly:true},
 c:{w:80,h:160,hp:55,spd:0,dmg:9,score:250}
};
function spawnEnemy(type,side){const T=ETYPES[type],x=side<0?cam-120:cam+W+120;
  const e={type,x,y:T.fly?520+Math.random()*130:GY,w:T.w,h:T.h,hp:T.hp*dm(),max:T.hp*dm(),vx:0,vy:0,face:-side,state:'walk',t:.6+Math.random()*.8,flash:0,seed:Math.random()*10,heavy:T.heavy,fly:T.fly,hy:0,score:T.score};
  e.hy=e.y;if(type==='c'){e.x=side<0?cam+260:cam+W-RSAFE-60;e.y=GY;e.fade=1;e.t=1.2}
  en.push(e);burst(e.x,e.y-e.h/2,'#ff4fd8',14);}
function spawnWave(list){list.forEach((t,i)=>spawnQ.push({t:i*.55,type:t,side:i%2?-1:1}))}

/* ---------- fx ---------- */
function burst(x,y,col,n,sp){sp=sp||600;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=sp*(.3+Math.random()*.7);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-120,life:.35+Math.random()*.45,max:.8,col,sz:4+Math.random()*6,g:900})}}
function sparks(x,y,col,n,dir){for(let i=0;i<n;i++){const a=(dir>0?0:Math.PI)+(Math.random()-.5)*1.6,v=700+Math.random()*900;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.12+Math.random()*.16,max:.28,col,sz:3,g:600,streak:1})}}
function ring(x,y,col,r){rings.push({x,y,col,r:r||90,life:.28,max:.28})}
function dust(x,y){for(let i=0;i<8;i++)parts.push({x:x+(Math.random()-.5)*60,y,vx:(Math.random()-.5)*300,vy:-Math.random()*200,life:.4,max:.4,col:'rgba(220,210,255,.5)',sz:8,g:300})}
function souls(x,y){for(let i=0;i<6;i++)parts.push({x:x+(Math.random()-.5)*40,y,vx:(Math.random()-.5)*60,vy:-120-Math.random()*160,life:1.2,max:1.2,col:'#bff6ff',sz:7,g:-40})}
function ftext(x,y,s,col,big){texts.push({x,y,s,col,life:.8,big})}
function showBanner(t,sub,dur){banner={t,sub,life:dur||2.2,max:dur||2.2}}

/* ---------- combat ---------- */
function damage(e,d,kb){if(e.dead)return;d=Math.round(d);e.hp-=d;e.flash=.14;if(!e.isBoss)e.vx+=kb*(e.heavy?.35:1);
  if(pl){pl.hits++;pl.hitsT=1.8}const hy=e.y-e.h*.55;
  ftext(e.x,e.y-e.h-10,d,d>=30?'#ffd27a':'#fff',d>=30);burst(e.x,hy,'#ffd27a',6,500);sparks(e.x,hy,'#fff3c4',9,Math.sign(kb)||1);ring(e.x,hy,'#ffd27a',d>=30?140:90);S.hit();buzz(8);hitStop=d>=30?.06:.035;
  if(e.hp<=0){if(e.isBoss){killBoss();return}
    e.dead=true;G.score+=e.score*(1+Math.min(4,Math.floor((pl?pl.hits:0)/10)));burst(e.x,e.y-e.h/2,'#ff4fd8',30,850);ring(e.x,e.y-e.h/2,'#ff4fd8',180);souls(e.x,e.y-e.h/2);S.die();buzz(14);shake=Math.max(shake,7);
    if(Math.random()<.2)picks.push({x:e.x,y:e.y-e.h/2,vy:-500,type:'hp'});else if(Math.random()<.25)picks.push({x:e.x,y:e.y-e.h/2,vy:-500,type:'en'});}}
function hurtPlayer(d,kx){const p=pl;if(p.inv>0||G.state!=='play')return;d=Math.round(d);p.hp-=d;p.inv=.9;p.hurtT=.28;p.vx=kx;p.vy=-420;p.ground=false;p.atk=0;
  shake=14;flashT=.18;S.hurt();buzz(45);p.hits=0;ftext(p.x,p.y-170,d,'#ff3d6e');burst(p.x,p.y-80,'#ff3d6e',12);
  if(p.hp<=0){p.hp=0;gameOver()}}

function updPlayer(dt){const p=pl,L=LV[G.lv];
  p.inv=Math.max(0,p.inv-dt);p.atkCD-=dt;p.comboT-=dt;p.hurtT-=dt;p.dashCD-=dt;p.squash=Math.max(0,p.squash-dt*5);
  p.hitsT-=dt;if(p.hitsT<=0)p.hits=0;
  for(const g of p.ghosts)g.life-=dt;p.ghosts=p.ghosts.filter(g=>g.life>0);
  let ax=0;if(p.hurtT<=0){if(K.left)ax-=1;if(K.right)ax+=1}
  if(p.atk>0){p.atk-=dt;ax*=.25}
  if(ax&&p.atk<=0)p.face=Math.sign(ax);
  if(p.hurtT<=0){const tgt=ax*640;p.vx+=(tgt-p.vx)*Math.min(1,dt*(p.ground?14:7))}
  if(P.jump&&p.hurtT<=0){if(p.ground){p.vy=-1300;p.ground=false;p.jumps=1;S.jump();dust(p.x,GY)}
    else if(p.jumps<2){p.vy=-1100;p.jumps=2;S.jump();burst(p.x,p.y-40,'#5ce1ff',12,350)}}
  if(P.attack&&p.atkCD<=0&&p.hurtT<=0){p.combo=p.comboT>0?(p.combo%3)+1:1;p.comboT=.6;p.atk=.22;p.atkCD=p.combo===3?.36:.17;p.hitDone=new Set();S.swing();
    p.vx+=p.face*(p.combo===3?420:160);if(!p.ground)p.vy=Math.min(p.vy,-180)}
  if(P.dash&&p.dashCD<=0&&p.hurtT<=0){const dir=ax?Math.sign(ax):p.face;p.face=dir;p.dashT=.19;p.dashCD=.75;p.inv=Math.max(p.inv,.26);p.atk=0;
    sfx(520,.16,'sawtooth',.04,-380);buzz(10);dust(p.x,GY);burst(p.x,p.y-80,'#b48cff',10,420)}
  if(p.dashT>0){p.dashT-=dt;p.vx=p.face*1750;p.vy=Math.min(p.vy,0)*.5;p.ghostT-=dt;if(p.ghostT<=0){p.ghostT=.03;p.ghosts.push({x:p.x,y:p.y,face:p.face,life:.22})}}
  if(P.special&&p.en>=50&&p.hurtT<=0){p.en-=50;shots.push({x:p.x+p.face*70,y:p.y-85,vx:p.face*1600,vy:0,r:70,dmg:48,friend:true,life:.85,pierce:true,hit:new Set(),col:'#5ce1ff',wave:true});
    S.special();buzz(30);shake=10;burst(p.x+p.face*60,p.y-85,'#5ce1ff',20,700);ring(p.x+p.face*60,p.y-85,'#5ce1ff',220)}
  if(p.dashT<=0)p.vy+=3300*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.y>=GY){if(!p.ground&&p.vy>700){dust(p.x,GY);p.squash=1}p.y=GY;p.vy=0;p.ground=true;p.jumps=0}
  let mn=60,mx=L.len;if(lock){mn=cam+60;mx=cam+W-(touchy?RSAFE-40:60)}
  p.x=Math.max(mn,Math.min(mx,p.x));
  p.run+=Math.abs(p.vx)*dt*.02;
  if(p.atk>0&&p.atk<.18){const reach=p.combo===3?240:180,box={x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190};
    for(const e of allTargets())if(!p.hitDone.has(e)&&overlap(box,ebox(e))){p.hitDone.add(e);
      damage(e,(p.combo===3?26:14)*(1+G.lv*.06),p.face*(p.combo===3?750:260));p.en=Math.min(100,p.en+(p.combo===3?9:6))}}
}
const allTargets=()=>boss&&!boss.dead&&boss.state!=='enter'?en.concat([boss]):en;

function updEnemy(e,dt){const dx=pl.x-e.x,ad=Math.abs(dx);e.flash-=dt;e.t-=dt;
  if(e.type==='d'){e.face=Math.sign(dx)||1;
    let tx=pl.x-e.face*440+Math.sin(lvT*1.3+e.seed)*90;const ty=e.hy+Math.sin(lvT*2.2+e.seed)*45;
    if(lock){if(pl.x-cam>W-RSAFE-300)tx=pl.x-440;tx=Math.max(cam+140,Math.min(cam+W-RSAFE,tx))}
    e.vx+=(tx-e.x)*dt*2.4;e.vx*=Math.pow(.15,dt);e.x+=e.vx*dt;e.y+=(ty-e.y)*Math.min(1,dt*2);
    if(e.t<=0){e.t=Math.max(1.3,2.3-G.lv*.15);const a=Math.atan2(pl.y-80-(e.y-35),pl.x-e.x),v=560+G.lv*30;
      shots.push({x:e.x,y:e.y-35,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:15,dmg:ETYPES.d.dmg*dm(),life:3.2,col:'#ff4fd8'});S.shot()}
    return}
  if(e.type==='c'){e.face=Math.sign(dx)||1;e.fade=Math.max(0,(e.fade||0)-dt*2);e.x+=e.vx*dt;e.vx*=Math.pow(.02,dt);
    if(ad<260&&e.t<.8&&!e.tp){e.tp=.35;burst(e.x,e.y-80,'#b48cff',18)}
    if(e.tp){e.tp-=dt;if(e.tp<=0){e.tp=0;const side=pl.x-cam>W/2?-1:1;e.x=pl.x+side*(520+Math.random()*200);e.x=Math.max(cam+160,Math.min(cam+W-RSAFE-40,e.x));e.fade=1;e.t=1}}
    else if(e.t<=0){e.t=Math.max(1.6,2.8-G.lv*.15);const a0=Math.atan2(pl.y-90-(e.y-120),dx);
      for(let k=-1;k<=1;k++){const a=a0+k*.22;shots.push({x:e.x+e.face*40,y:e.y-120,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:17,dmg:ETYPES.c.dmg*dm(),life:3,col:'#b48cff'})}S.shot()}
    return}
  const T=ETYPES[e.type],range=e.type==='b'?200:130;
  if(e.state==='walk'){e.face=Math.sign(dx)||1;
    if(ad>range)e.vx+=(e.face*T.spd*(1+G.lv*.05)-e.vx)*Math.min(1,dt*5);else{e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='wind';e.t=e.type==='b'?.62:.42}}}
  else if(e.state==='wind'){e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='swing';e.t=.2;e.hitP=false;e.vx+=e.face*(e.type==='b'?120:260);if(e.type==='b'){shake=Math.max(shake,8);dust(e.x+e.face*120,GY);S.boom()}}}
  else if(e.state==='swing'){if(!e.hitP){const reach=e.type==='b'?230:150,box={x:e.face>0?e.x:e.x-reach,y:e.y-e.h,w:reach,h:e.h};
      if(overlap(box,pbox())){e.hitP=true;hurtPlayer(T.dmg*dm(),e.face*(e.type==='b'?900:450))}}
    if(e.t<=0){e.state='walk';e.t=(e.type==='b'?1.3:.8)+Math.random()*.7}}
  e.x+=e.vx*dt;if(e.state!=='walk')e.vx*=Math.pow(.05,dt);
  /* once on screen during a wave, ground enemies stay out of the strip under the touch buttons */
  if(lock&&touchy){const lim=cam+W-RSAFE+40;if(e.x<lim)e.in=1;if(e.in&&e.x>lim){e.x=lim;if(e.vx>0)e.vx=0}}
}
</script>
