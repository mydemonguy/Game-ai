<script>
"use strict";
/* ---------- core: stage size, input, world data, shared state, helpers ---------- */
let W=1920;const H=1080,GY=880;
const touchy=matchMedia('(pointer:coarse)').matches||('ontouchstart' in window);
/* stage pixels on the right that the touch buttons cover; enemies are kept out of that strip during lockdowns */
const RSAFE=touchy?500:200;
/* the stage is always 1080 tall; its width follows the screen (1920 on 16:9, 2400 on a 20:9 phone) so there are no black bars */
function calcW(){const w=innerWidth,h=innerHeight;return w>=h?Math.round(Math.min(2560,Math.max(1440,H*w/h))):1920}
W=calcW();
function fit(){const nw=calcW();if(nw!==W){W=nw;if(window.GAME)GAME.scale.setGameSize(Math.round(W*RS),Math.round(H*RS))}
  document.getElementById('rotate').hidden=!(touchy&&innerHeight>innerWidth*1.05)}
addEventListener('resize',fit);

/* ---------- input ---------- */
const K={left:0,right:0,jump:0,attack:0,special:0,dash:0,down:0},P={};
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',KeyJ:'attack',KeyX:'attack',KeyK:'special',KeyC:'special',KeyL:'dash',ShiftLeft:'dash',ShiftRight:'dash',KeyU:'arm',KeyV:'arm',KeyI:'armc',ArrowDown:'down',KeyS:'down'};
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
  waves:[['g','d','d'],['h','h','b'],['d','d','g','g'],['b','g','d','g'],['b','b','d','d']]},
 {name:'Orbital Dock Aeris',ch:'Chapter III',theme:'station',len:8400,sky:['#0c1222','#203256','#5a78a6'],planet:'#cfeaff',far:'#2a3856',mid:'#354564',gnd:'#262c38',glow:'#ff9a2a',
  waves:[['d','g','g'],['b','d','g'],['g','h','h','d'],['b','b','d'],['B','g','d']]},
 {name:'The Amber Foundry',ch:'Chapter IV',theme:'cargo',len:8400,sky:['#18120a','#3a2a16','#86643a'],planet:'#ffd27a',far:'#2a2013',mid:'#382a17',gnd:'#1c160e',glow:'#ffb347',
  waves:[['c','g','g'],['b','c','d'],['g','h','h','c','c'],['b','b','c','d'],['c','c','h','h','B']]},
 {name:'Gates of the Null Citadel',ch:'Chapter V',theme:'citadel',len:8800,sky:['#07050f','#1c1238','#4e2f7c'],planet:'#c9a8ff',far:'#160c30',mid:'#201240',gnd:'#0c0718',glow:'#b48cff',
  waves:[['c','c','d','d'],['b','h','h','h','c'],['d','d','d','c','c'],['b','b','b','c'],['B','c','c']]},
 {name:'Throne of the Rift',ch:'Chapter VI',theme:'core',len:7200,sky:['#060406','#1a0a0e','#4a140e'],planet:'#ff4a2a',far:'#140b0c',mid:'#1e1113',gnd:'#0d0909',glow:'#ff4a2a',
  waves:[['c','b','d'],['h','h','c','c','b'],['B','h','h','d']],boss:true}
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
let pl=null,en=[],shots=[],picks=[],hz=[],spawnQ=[],cam=0,camY=0,lock=false,shake=0,boss=null,bossDone=false,lvT=0,hitStop=0,banner=null,flashT=0,doneT=0;
const dm=()=>(1+G.lv*.12)*(META.hard?1.45:1);   /* enemy damage; Rift Mode hits much harder */

function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const ebox=e=>({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const pbox=()=>({x:pl.x-42,y:pl.y-168,w:84,h:168});

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const R=(a,b)=>a+Math.random()*(b-a);
/* colour helpers */
function hexRGB(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h.slice(0,6),16);return[(n>>16)&255,(n>>8)&255,n&255]}
function shade(h,a){const c=hexRGB(h).map(v=>Math.round(a<0?v*(1+a):v+(255-v)*a));return'#'+c.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')}
function rgba(h,a){const c=hexRGB(h);return`rgba(${c[0]},${c[1]},${c[2]},${a})`}
const hexN=h=>{const c=hexRGB(h);return(c[0]<<16)|(c[1]<<8)|c[2]};
const INK='#130f17';
const PAL={
 hangar:{metal:'#626b78',light:'#a7b1be',dark:'#2c323b',ink:'#14171c',acc:'#ff9a2a',acc2:'#ffd9a0',scr:'#7fd8ff',alt:'#4a525e'},
 armory:{metal:'#5f8a6e',light:'#a2c8ac',dark:'#26372d',ink:'#111813',acc:'#ff8a3a',acc2:'#ffc890',scr:'#9affc8',alt:'#4b535c'},
 station:{metal:'#c3c9d2',light:'#f3f5f8',dark:'#596171',ink:'#1f232a',acc:'#ff9a2a',acc2:'#ffe0b0',scr:'#7fd8ff',alt:'#6c7482'},
 cargo:{metal:'#e09f2c',light:'#ffd47e',dark:'#6a4a1c',ink:'#221709',acc:'#ffb347',acc2:'#fff0c8',scr:'#8fe8ff',alt:'#4c4d54'},
 citadel:{metal:'#4e4a64',light:'#8e88ad',dark:'#221f30',ink:'#0f0d17',acc:'#ff7a2a',acc2:'#e0ccff',scr:'#b48cff',alt:'#3a3650'},
 core:{metal:'#4c4246',light:'#8a7a80',dark:'#1f1a1c',ink:'#0b0909',acc:'#ff4a2a',acc2:'#ffc0a0',scr:'#ff8a6a',alt:'#352d30'}};
</script>
