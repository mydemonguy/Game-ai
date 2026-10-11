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
const K={left:0,right:0,jump:0,attack:0,special:0,dash:0,down:0},P={};
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',KeyJ:'attack',KeyX:'attack',KeyK:'special',KeyC:'special',KeyL:'dash',ShiftLeft:'dash',ShiftRight:'dash',ArrowDown:'down',KeyS:'down'};
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
function stickSet(dx,dy){dy=dy||0;const r=SB.offsetWidth*.42||60,n=Math.max(-1,Math.min(1,dx/r)),m=Math.max(-1,Math.min(1,dy/r));stick.x=n;
  SK.style.transform=`translate(calc(-50% + ${n*r}px),calc(-50% + ${m*r*.7}px))`;K.left=n<-.28?1:0;K.right=n>.28?1:0;const dn=m>.55?1:0;if(dn&&!K.down)P.down=1;K.down=dn}
function stickEnd(){stick.id=null;stick.x=0;K.left=K.right=K.down=0;SB.classList.remove('live');SB.style.left='';SB.style.bottom='';SB.style.top='';SK.style.transform=''}
SZ.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();if(stick.id!==null)return;stick.id=e.pointerId;try{SZ.setPointerCapture(e.pointerId)}catch(_){}
  const zr=SZ.getBoundingClientRect(),half=SB.offsetWidth/2;
  const x=Math.max(zr.left+half,Math.min(zr.right-half,e.clientX)),y=Math.max(zr.top+half,Math.min(zr.bottom-half,e.clientY));
  stick.ox=x;stick.oy=y;SB.style.left=(x-zr.left)+'px';SB.style.top=(y-zr.top-half)+'px';SB.style.bottom='auto';SB.classList.add('live');stickSet(e.clientX-x,e.clientY-y)});
SZ.addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;e.preventDefault();stickSet(e.clientX-stick.ox,e.clientY-stick.oy)});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>SZ.addEventListener(t,e=>{if(e.pointerId===stick.id)stickEnd()}));
function buzz(p){try{if(touchy&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}
function clearInput(){if(typeof stickEnd==='function'&&stick.id!==null)stickEnd();for(const k in K)K[k]=0;for(const k in P)delete P[k];document.querySelectorAll('[data-k]').forEach(b=>{b.classList.remove('on');if(b._clear)b._clear()})}

/* ---------- world data ---------- */
const LV=[
 {name:'Hangar Nine',ch:'Chapter I',theme:'hangar',len:7400,sky:['#12151c','#262d3a','#4a566a'],planet:'#ffb070',far:'#20262f',mid:'#2b323d',gnd:'#191d24',glow:'#ff9a2a',
  waves:[['g','g'],['g','d','g'],['g','g','g'],['d','g','d','g'],['g','g','b']]},
 {name:'The Iron Armory',ch:'Chapter II',theme:'armory',len:7800,sky:['#0f1512','#212c26','#43574b'],planet:'#ffd08a',far:'#1c2620',mid:'#26332b',gnd:'#141b17',glow:'#ff8a3a',
  waves:[['g','d','d'],['g','g','b'],['d','d','g','g'],['b','g','d','g'],['b','b','d','d']]},
 {name:'Orbital Dock Aeris',ch:'Chapter III',theme:'station',len:8400,sky:['#0c1222','#203256','#5a78a6'],planet:'#cfeaff',far:'#2a3856',mid:'#354564',gnd:'#262c38',glow:'#ff9a2a',
  waves:[['d','d','g'],['b','d','d'],['g','g','g','d','d'],['b','b','d'],['B','d','d']]},
 {name:'The Amber Foundry',ch:'Chapter IV',theme:'cargo',len:8400,sky:['#18120a','#3a2a16','#86643a'],planet:'#ffd27a',far:'#2a2013',mid:'#382a17',gnd:'#1c160e',glow:'#ffb347',
  waves:[['c','g','g'],['b','c','d'],['g','g','c','c'],['b','b','c','d'],['c','c','g','g','b']]},
 {name:'Gates of the Null Citadel',ch:'Chapter V',theme:'citadel',len:8800,sky:['#07050f','#1c1238','#4e2f7c'],planet:'#c9a8ff',far:'#160c30',mid:'#201240',gnd:'#0c0718',glow:'#b48cff',
  waves:[['c','c','d','d'],['b','b','g','g','c'],['d','d','d','c','c'],['b','b','b','c'],['B','c','c']]},
 {name:'Throne of the Rift',ch:'Chapter VI',theme:'core',len:7200,sky:['#060406','#1a0a0e','#4a140e'],planet:'#ff4a2a',far:'#140b0c',mid:'#1e1113',gnd:'#0d0909',glow:'#ff4a2a',
  waves:[['c','b','d'],['g','g','c','c','b'],['B','d','d']],boss:true}
];
LV.forEach(L=>{const n=L.waves.length,end=L.boss?L.len-2200:L.len-900;L.trig=L.waves.map((_,i)=>Math.round(900+(end-900)*i/Math.max(1,n-1)))});

const STORY={
 intro:[
  {ey:'The Age of Aether',h:'The Starblood Clan',b:`<p>For a thousand years the kingdom of <b>Ithra</b> ran on the Aether, the living light that flows between the stars.</p><p>Its keepers were the <b>Starblood</b>, a clan of dinosaurs whose claws could hold starlight. They guarded the great reactors, and the reactors kept every city in Ithra bright.</p>`},
  {ey:'The Fall',h:'Malakar Opens the Rift',b:`<p>Then <b>Malakar</b>, the clan's own Egg-Keeper, cracked the reactors open and tore a Rift at the world's core. He fused his followers with machine and shadow and named them the <b>Hollowed</b>.</p><p>He hunted the Starblood until none were left. Ithra went dark.</p>`},
  {ey:'Hatching',h:'The Last Starblood',b:`<p>Thirty years later, in a frozen stasis pod deep inside Hangar Nine, one egg cracks. Out tumbles <b>Tyko</b>: small, green, and very hungry.</p><p>Wrapped around the shell is a glowing collar, and inside it lives <b>Lyra</b>, the star-spirit who kept the egg warm all those years.</p><p><span class="who">LYRA:</span> "Hello, little one. I'm sorry you woke up in the dark. Let's go and turn the lights back on."</p>`}
 ],
 brief:[
  `<p><span class="who">LYRA:</span> "This is Hangar Nine, where your clan's ships used to launch. The Hollowed patrol it now. Their cores are stolen souls wrapped in iron, and your claws can set them free."</p><p><span class="who">LYRA:</span> "Smash the supply crates. Your clan hid food and Aether in them. And look for the old Starblood shrines. Each one wakes a power you were born with."</p>`,
  `<p><span class="who">LYRA:</span> "The Iron Armory. Malakar builds his green war-drones here and fuels them with Aether stolen from your clan's reactors. Jump to reach them, and grab every Star Fruit you see. You're still growing."</p>`,
  `<p><span class="who">LYRA:</span> "Orbital Dock Aeris. His fleet docks here before every raid, and an <b>Iron Warden</b> guards the gate. When it slams the deck, jump over the shockwave."</p>`,
  `<p><span class="who">LYRA:</span> "The Amber Foundry is where the Hollowed are made. Tyko... I found the clan records. Malakar wasn't just the Egg-Keeper. He kept <i>your</i> egg. He's the one who froze it."</p>`,
  `<p><span class="who">LYRA:</span> "The Null Citadel. Its gates were built to keep the Void <i>in</i>. He turned them inside out. Everything he has left is waiting here, so take every shard you can carry."</p>`,
  `<p><span class="who">MALAKAR:</span> "Little hatchling. I saved you for last. I thought one Starblood should see the end."</p><p><span class="who">LYRA:</span> "Don't listen to him. You're not the last of anything, Tyko. You're the first of what comes next."</p>`
 ],
 clear:[
  'The first souls rise free from their iron shells and drift into the dawn. Tyko watches them go, then sneezes out a tiny spark of starlight.',
  'The armory reactors cool and go dark. No more war-drones will launch from Ithra.',
  'The Iron Warden falls and Malakar\'s flagship burns on its moorings. The fleet will not fly tonight.',
  'The amber furnaces go cold. Deep in the foundry, Tyko finds a shelf of frozen eggs. Lyra marks the spot. "We\'ll come back for them. I promise."',
  'The Citadel gates crack open. Beyond them, the Rift pulses like a red heart.'
 ],
 ending:[
  {ey:'Malakar Falls',h:'The Rift Closes',b:`<p><span class="who">MALAKAR:</span> "I only wanted... to keep the light safe... somewhere no one could waste it..."</p><p>Tyko takes the deepest breath of his short life and roars. Every shard of Aether he gathered pours out of him, brighter than any star, and the wound in the world begins to seal.</p>`},
  {ey:'Epilogue',h:'Dawn Over Ithra',b:`<p>When Tyko wakes, the sky is blue. The reactors hum again, and the freed souls of the Hollowed drift upward like lanterns.</p><p>In the foundry, one by one, the frozen eggs begin to crack.</p><p><span class="who">LYRA:</span> "Well, little one. Looks like you have a lot of brothers and sisters to teach."</p>`}
 ]
};

/* ---------- state ---------- */
const G={state:'menu',lv:0,score:0,paused:false,best:0,lives:3,respawnT:0};
let unlocked=1;try{unlocked=Math.max(1,Math.min(6,+localStorage.getItem('aetherfall_unlock')||1));G.best=+localStorage.getItem('aetherfall_best')||0}catch(e){}
function saveProg(){try{localStorage.setItem('aetherfall_unlock',unlocked);localStorage.setItem('aetherfall_best',Math.max(G.best,G.score))}catch(e){}}
let rings=[],pl,en=[],shots=[],parts=[],picks=[],texts=[],hz=[],spawnQ=[],cam=0,lock=false,waveI=0,shake=0,boss=null,bossDone=false,lvT=0,hitStop=0,banner=null,bg=null,flashT=0,doneT=0;
const dm=()=>1+G.lv*.12;

function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const ebox=e=>({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const pbox=()=>({x:pl.x-42,y:pl.y-168,w:84,h:168});

function newPlayer(){const mh=maxHP();return{x:300,y:GY,vx:0,vy:0,face:1,hp:mh,max:mh,slam:0,dropT:0,sup:GY,maxX:0,en:30,ground:true,jumps:0,atk:0,atkCD:0,combo:0,comboT:0,inv:0,hurtT:0,hitDone:new Set(),run:0,dashT:0,dashCD:0,squash:0,landT:0,dead:0,deadT:0,shield:0,shieldT:0,fury:0,hits:0,hitsT:0,ghostT:0,ghosts:[]}}

const ETYPES={
 g:{w:80,h:165,hp:42,spd:260,dmg:10,score:100},
 b:{w:140,h:270,hp:130,spd:150,dmg:22,score:300,heavy:true},
 d:{w:70,h:70,hp:28,spd:0,dmg:8,score:150,fly:true},
 c:{w:80,h:160,hp:55,spd:0,dmg:9,score:250},
 B:{w:170,h:320,hp:420,spd:125,dmg:24,score:1500,heavy:true}
};
function spawnEnemy(type,side){const T=ETYPES[type],x=side<0?cam-120:cam+W+120;
  const e={type,x,y:T.fly?520+Math.random()*130:GY,w:T.w,h:T.h,hp:T.hp*dm(),max:T.hp*dm(),vx:0,vy:0,face:-side,state:'walk',t:.6+Math.random()*.8,flash:0,seed:Math.random()*10,heavy:T.heavy,fly:T.fly,hy:0,score:T.score};
  e.hy=e.y;if(type==='c'){e.x=side<0?cam+260:cam+W-RSAFE-60;e.y=GY;e.fade=1;e.t=1.2}
  en.push(e);burst(e.x,e.y-e.h/2,'#ff4fd8',14);if(type==='B'){showBanner('Iron Warden','Elite · jump its shockwaves',1.8);S.boom();shake=12}}
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
    dropFrom(e);}}
function hurtPlayer(d,kx){const p=pl;if(p.inv>0||p.dead||G.state!=='play')return;
  if(p.shield>0){p.shield--;p.inv=.6;ring(p.x,p.y-95,'#8fc8ff',170);burst(p.x,p.y-95,'#8fc8ff',14,500);sfx(900,.15,'sine',.06,-400);buzz(15);ftext(p.x,p.y-200,'Blocked','#8fc8ff');return}
  d=Math.round(d);p.hp-=d;p.inv=.9;p.hurtT=.28;p.vx=kx;p.vy=-420;p.ground=false;p.atk=0;
  shake=14;flashT=.18;S.hurt();buzz(45);p.hits=0;ftext(p.x,p.y-170,d,'#ff3d6e');burst(p.x,p.y-80,'#ff3d6e',12);
  if(p.hp<=0){p.hp=0;if(G.lives>0){G.lives--;p.dead=1;p.deadT=0;p.vx=0;p.inv=99;G.respawnT=1.8;buzz([60,40,60]);S.die()}else gameOver()}}

function updPlayer(dt){const p=pl,L=LV[G.lv];
  if(p.dead){p.vy+=3300*dt;p.y=Math.min(GY,p.y+p.vy*dt);if(p.y>=GY)p.vy=0;return}
  p.fury=Math.max(0,p.fury-dt);if(p.shield>0){p.shieldT-=dt;if(p.shieldT<=0)p.shield=0}
  p.inv=Math.max(0,p.inv-dt);p.atkCD-=dt;p.comboT-=dt;p.hurtT-=dt;p.dashCD-=dt;p.squash=Math.max(0,p.squash-dt*5);p.landT-=dt;
  p.hitsT-=dt;if(p.hitsT<=0)p.hits=0;
  for(const g of p.ghosts)g.life-=dt;p.ghosts=p.ghosts.filter(g=>g.life>0);
  let ax=0;if(p.hurtT<=0){if(K.left)ax-=1;if(K.right)ax+=1}
  if(p.atk>0){p.atk-=dt;ax*=.25}
  if(ax&&p.atk<=0)p.face=Math.sign(ax);
  if(p.hurtT<=0){const tgt=ax*640;p.vx+=(tgt-p.vx)*Math.min(1,dt*(p.ground?14:7))}
  p.dropT-=dt;if(P.down&&p.ground&&onPlatform(p)){p.dropT=.28;p.ground=false;p.y+=3}
  if(P.attack&&!p.ground&&K.down&&hasAb('slam')&&!p.slam&&p.hurtT<=0){p.slam=1;p.vy=2600;p.vx*=.3;p.atk=0;delete P.attack;sfx(300,.3,'sawtooth',.06,-200);ring(p.x,p.y-90,'#ffb347',120)}
  if(P.jump&&p.hurtT<=0){if(p.ground){p.vy=-1300;p.ground=false;p.jumps=1;S.jump();dust(p.x,p.y)}
    else if(p.jumps<2&&hasAb('double')){p.vy=-1100;p.jumps=2;S.jump();burst(p.x,p.y-40,'#5ce1ff',12,350)}}
  if(P.attack&&p.atkCD<=0&&p.hurtT<=0){p.combo=p.comboT>0?(p.combo%3)+1:1;p.comboT=.6;p.atk=.22;p.atkCD=p.combo===3?.36:.17;p.hitDone=new Set();S.swing();
    p.vx+=p.face*(p.combo===3?420:160);if(!p.ground)p.vy=Math.min(p.vy,-180)}
  if(P.dash&&hasAb('dash')&&p.dashCD<=0&&p.hurtT<=0){const dir=ax?Math.sign(ax):p.face;p.face=dir;p.dashT=.19;p.dashCD=.75;p.inv=Math.max(p.inv,.26);p.atk=0;
    sfx(520,.16,'sawtooth',.04,-380);buzz(10);dust(p.x,GY);burst(p.x,p.y-80,'#b48cff',10,420)}
  if(p.dashT>0){p.dashT-=dt;p.vx=p.face*1750;p.vy=Math.min(p.vy,0)*.5;p.ghostT-=dt;if(p.ghostT<=0){p.ghostT=.03;p.ghosts.push({x:p.x,y:p.y,face:p.face,life:.22})}}
  if(P.special&&hasAb('roar')&&p.en>=50&&p.hurtT<=0){p.en-=50;shots.push({x:p.x+p.face*70,y:p.y-85,vx:p.face*1600,vy:0,r:70,dmg:48*pdm(),friend:true,life:.85,pierce:true,hit:new Set(),col:'#5ce1ff',wave:true});
    S.special();buzz(30);shake=10;burst(p.x+p.face*60,p.y-85,'#5ce1ff',20,700);ring(p.x+p.face*60,p.y-85,'#5ce1ff',220)}
  const x0=p.x,y0=p.y;if(p.dashT<=0)p.vy+=3300*dt;p.x+=p.vx*dt;geoPushX(p,x0);p.y+=p.vy*dt;
  const sup=geoLand(p,y0);
  if(sup!=null){if(!p.ground){if(p.vy>700){dust(p.x,sup);p.squash=1}p.landT=.15;if(p.slam)slamLand(p,sup)}p.y=sup;p.vy=0;p.ground=true;p.jumps=0}else p.ground=false;
  p.sup=surfaceBelow(p.x,p.y);
  let mn=60,mx=L.len;if(lock){mn=cam+60;mx=cam+W-(touchy?RSAFE-40:60)}
  p.x=Math.max(mn,Math.min(mx,p.x));
  p.run+=Math.abs(p.vx)*dt*.02;
  if(p.atk>0&&p.atk<.18){const reach=p.combo===3?240:180,box={x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190};
    for(const e of allTargets())if(!p.hitDone.has(e)&&overlap(box,ebox(e))){p.hitDone.add(e);
      damage(e,(p.combo===3?26:14)*(1+G.lv*.06)*pdm(),p.face*(p.combo===3?750:260));p.en=Math.min(100,p.en+(p.combo===3?9:6))}
    hitBoxesWith(box,p.hitDone);if(!p.hitDone.has('geo')){p.hitDone.add('geo');clawGeo(box)}}
}
const allTargets=()=>boss&&!boss.dead&&boss.state!=='enter'?en.concat([boss]):en;

function updEnemy(e,dt){const dx=pl.x-e.x,ad=Math.abs(dx);e.flash-=dt;e.t-=dt;
  if(e.type==='d'){e.face=Math.sign(dx)||1;
    let tx=pl.x-e.face*440+Math.sin(lvT*1.3+e.seed)*90;const ty=e.hy+Math.sin(lvT*2.2+e.seed)*45;
    if(lock){if(pl.x-cam>W-RSAFE-300)tx=pl.x-440;tx=Math.max(cam+140,Math.min(cam+W-RSAFE,tx))}
    e.vx+=(tx-e.x)*dt*2.4;e.vx*=Math.pow(.15,dt);e.x+=e.vx*dt;e.y+=(ty-e.y)*Math.min(1,dt*2);
    if(e.t<=0){e.t=Math.max(1.3,2.3-G.lv*.15);const a=Math.atan2(pl.y-80-(e.y-35),pl.x-e.x),v=560+G.lv*30;
      shots.push({x:e.x,y:e.y-35,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:15,dmg:ETYPES.d.dmg*dm(),life:3.2,col:'#ff8a3a'});S.shot()}
    return}
  if(e.type==='c'){e.face=Math.sign(dx)||1;e.fade=Math.max(0,(e.fade||0)-dt*2);e.x+=e.vx*dt;e.vx*=Math.pow(.02,dt);
    if(ad<260&&e.t<.8&&!e.tp){e.tp=.35;burst(e.x,e.y-80,'#b48cff',18)}
    if(e.tp){e.tp-=dt;if(e.tp<=0){e.tp=0;const side=pl.x-cam>W/2?-1:1;e.x=pl.x+side*(520+Math.random()*200);e.x=Math.max(cam+160,Math.min(cam+W-RSAFE-40,e.x));e.fade=1;e.t=1}}
    else if(e.t<=0){e.t=Math.max(1.6,2.8-G.lv*.15);const a0=Math.atan2(pl.y-90-(e.y-120),dx);
      for(let k=-1;k<=1;k++){const a=a0+k*.22;shots.push({x:e.x+e.face*40,y:e.y-120,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:17,dmg:ETYPES.c.dmg*dm(),life:3,col:'#b48cff'})}S.shot()}
    return}
  const T=ETYPES[e.type],hv=e.type==='b'||e.type==='B',range=e.type==='B'?240:hv?200:130;
  if(e.state==='walk'){e.face=Math.sign(dx)||1;
    if(ad>range)e.vx+=(e.face*T.spd*(1+G.lv*.05)-e.vx)*Math.min(1,dt*5);else{e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='wind';e.t=e.type==='B'?.75:hv?.62:.42}}}
  else if(e.state==='wind'){e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='swing';e.t=.2;e.hitP=false;e.vx+=e.face*(hv?120:260);if(hv){shake=Math.max(shake,8);dust(e.x+e.face*120,GY);S.boom()}
      if(e.type==='B'){for(const d of[-1,1])hz.push({kind:'quake',x:e.x+d*90,dir:d,v:820,t:0,act:1.5});shake=16}}}
  else if(e.state==='swing'){if(!e.hitP){const reach=e.type==='B'?270:hv?230:150,box={x:e.face>0?e.x:e.x-reach,y:e.y-e.h,w:reach,h:e.h};
      if(overlap(box,pbox())){e.hitP=true;hurtPlayer(T.dmg*dm(),e.face*(hv?900:450))}}
    if(e.t<=0){e.state='walk';e.t=(e.type==='B'?1.6:hv?1.3:.8)+Math.random()*.7}}
  e.x+=e.vx*dt;if(e.state!=='walk')e.vx*=Math.pow(.05,dt);
  /* once on screen during a wave, ground enemies stay out of the strip under the touch buttons */
  if(lock&&touchy){const lim=cam+W-RSAFE+40;if(e.x<lim)e.in=1;if(e.in&&e.x>lim){e.x=lim;if(e.vx>0)e.vx=0}}
}
</script>
