<script>
"use strict";
/* ---------- story: pre-fight dialogue for every boss, and Sable of the Ninth Talon, a hero who fights beside Tyko ---------- */
const WHO={tyko:{n:'TYKO',c:'#7dffb0'},lyra:{n:'LYRA',c:'#c9a8ff'},sable:{n:'SABLE',c:'#5ce1d8',art:'sable'},
 krell:{n:'FOREMAN KRELL',c:'#ffa040',art:'krell'},bulwark:{n:'BULWARK',c:'#c4d890',art:'bulwark'},hound:{n:'ALPHA HOUND',c:'#ff8a6a',art:'hound',fr:'howl'},
 crucible:{n:'CRUCIBLE',c:'#ffb040',art:'crucible'},seraph:{n:'NULL SERAPH',c:'#d8b8ff',art:'seraph'},malakar:{n:'MALAKAR',c:'#ff5a7a',art:'malakar'}};
function portrait(key){const W0=WHO[key];if(!W0||!W0.art)return'';const I=bossTex(W0.art);I.urls=I.urls||{};const fr=W0.fr||'idle0';
  if(!I.urls[fr])I.urls[fr]=cropURL(I.frames[I.names.indexOf(fr)]);return`<img src="${I.urls[fr]}" alt="" style="width:150px;max-height:210px;object-fit:contain;image-rendering:pixelated;flex:none">`}
/* trim the transparent margin around a sprite frame so the portrait fills its box */
function cropURL(c){const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<x0)return c.toDataURL();const[o,og]=mkC(x1-x0+5,y1-y0+5);og.drawImage(c,x0-2,y0-2,x1-x0+5,y1-y0+5,0,0,x1-x0+5,y1-y0+5);return o.toDataURL()}
const say=(k,t)=>`<p><span class="who" style="color:${WHO[k].c}">${WHO[k].n}:</span> ${t}</p>`;
/* a short scene: pages of [speaker, line] pairs; the portrait shows the page's main speaker */
function scene(o,done){G.state='card';padShow(false);clearInput();const show=i=>{const pg=o.pages[i],lead=pg.find(l=>WHO[l[0]].art);
    showCard({ey:o.ey,h:o.h,b:`<div style="display:flex;gap:18px;align-items:flex-start">${lead?portrait(lead[0]):''}<div>${pg.map(l=>say(l[0],l[1])).join('')}</div></div>`,
      btns:[[i<o.pages.length-1?'Continue':o.go||'Fight!',()=>{if(i<o.pages.length-1)return show(i+1);G.state='play';hideCard();padShow(true);clearInput();done()}],...(i<o.pages.length-1?[['Skip',()=>{G.state='play';hideCard();padShow(true);clearInput();done()},1]]:[])]})};show(0)}

/* ---- the bosses speak ---- */
const BOSS_TALK=[
 [[['krell',`"Well, well. A hatchling, loose on my hangar floor. Nobody walks out of Hangar Nine without a work order."`],['lyra',`"He was the clan's chief engineer once, Tyko. Malakar welded his heart shut."`]],
  [['krell',`"Engineer? I'm the FOREMAN now. And the shift whistle just blew."`],['tyko','"Rawr!"']]],
 [[['bulwark',`"Halt. The Armory is sealed by order of the Sovereign. I am the wall. Walls do not move."`],['lyra',`"Every wall has a back, little one. Get behind that shield."`]],
  [['bulwark',`"Then come. Break yourself against me."`]]],
 [[['hound','"GRRRRRAAAAH!"'],['lyra',`"It was a hunting companion of the Starblood once. Loyal. Gentle. Malakar bolted thrusters to its spine."`]],
  [['lyra',`"Free it, Tyko. And watch out for the fire it leaves behind."`],['tyko','"...rawr."']]],
 [[['crucible',`"MORE FUEL. THE FURNACE HUNGERS. YOU ARE... SMALL. BUT YOU WILL BURN."`],['lyra',`"That furnace runs too hot for its own good. Wait until it vents, then strike!"`]],
  [['crucible',`"ALL THINGS BECOME ASH. ALL THINGS BECOME... HOLLOW."`]]],
 [[['seraph',`"Little light. Can you hear it? The Void is singing. It sings of quiet. Of no more running."`],['lyra',`"Don't listen, Tyko. That's the Void talking through her."`]],
  [['seraph',`"Lay down your claws, hatchling. Let the dark hold you, as it holds me."`],['tyko','"RAWR!"']]]];
function guardianIntro(a){if(G.rush||(META.talk&&META.talk[a]))return startGuardian(a);META.talk=META.talk||{};META.talk[a]=1;saveMeta();bossTex(GUARD[a].art);
  scene({ey:LV[a].ch+' · Shrine guardian',h:GUARD[a].name,pages:BOSS_TALK[a]},()=>startGuardian(a))}
function malakarIntro(){if(G.rush||(META.talk&&META.talk.m))return startBoss();META.talk=META.talk||{};META.talk.m=1;saveMeta();bossTex('malakar');
  const pages=[[['malakar',`"So. The last egg I ever kept hatches at my feet. I wondered what you would grow into."`],['lyra',`"Someone you could never be, Malakar. Someone who gives the light back."`]],
    [['malakar',`"The light is wasted on the living. I will keep it safe. I will keep it FOREVER."`]]];
  if(META.sable)pages.push([['sable',`"You kept me too, Egg-Keeper. Remember? Iron in my chest and a leash on my mind."`],['malakar',`"Sable. My finest Hollowed. Kneel."`],['sable',`"Not this time. Not ever again."`]]);
  pages[pages.length-1].push(['tyko','"RAAAWR!"']);
  scene({ey:'Throne of the Rift',h:'Malakar, the Void Sovereign',pages},startBoss)}

/* ---- Sable of the Ninth Talon ---- */
const SABLE_BIO=`<p><b style="color:#5ce1d8">Sable of the Ninth Talon</b> was captain of the Talon Guard, the Starblood's raptor knights. During the Fall, Malakar captured her and made her one of his Hollowed. For thirty years she hunted her own clan with iron in her chest and his leash on her mind.</p>
  <p>Tyko's first roar in Hangar Nine cracked that leash. Half machine now, she follows the last Starblood through the dark with a plasma glaive, and steps in when the fighting gets thick. She can't undo what she did, but she means to try.</p>`;
const SLINE={join:['Need a talon, little one?','Talon Guard, reporting!','Thought you could use a hand. Well, a claw.','Stay close. I have your back.'],
  hit:['One more soul set free.','Stay behind me!','Too slow, tin can.','For the Starblood!','Ha! Did you see that?'],
  leave:["Room's clear. I'll be watching from the shadows.",'Good fight, little one. Until next time.','Go on. I will catch up.']};
let ally=null;
const pick=a=>a[Math.floor(Math.random()*a.length)];
function allyJoin(mode,quiet){if(ally||!pl)return;bossTex('sable');const side=pl.x-cam>W/2?-1:1;
  ally={x:clamp(pl.x+side*320,cam+140,cam+W-RSAFE-60),y:FY,oy:-900,vy:0,vx:0,face:-side,state:'drop',t:0,atkCD:.6,mode,line:quiet?'':pick(SLINE.join),lt:3,hit:new Set(),w:90,h:200,seed:Math.random()*9,leaveT:0};
  if(!quiet)showBanner('Sable joins the fight!','Talon Knight of the Starblood',1.8)}
function allyMeet(){META.sable=1;saveMeta();bossTex('sable');
  scene({ey:'An unexpected ally',h:'Sable of the Ninth Talon',go:'Fight together!',pages:[
    [['sable',`"Stay low, little one. These tin cans bite. Sable of the Ninth Talon, at your side."`],['lyra',`"Sable?! You were captain of the Talon Guard! We thought the Hollowed took you."`]],
    [['sable',`"They did. Iron in my chest, a leash on my mind. For years I hunted my own clan."`],['sable',`"Then this little one roared in Hangar Nine, and something in me cracked. The leash snapped. I've been following you ever since."`]],
    [['sable',`"I can't undo what I did. But I can fight beside the last Starblood. Let's clear this room."`],['tyko','"Rawr!"']]]},()=>{allyJoin('arena',1);ally.line=pick(SLINE.join);ally.lt=3})}
/* hooks: lockdown waves and the final battle */
function allyArena(o,i){if(G.rush||o.a<1||ally)return;if(!META.sable){if(i===1)allyMeet()}else if(i===0&&Math.random()<.4)allyJoin('arena')}
function allyTarget(){let best=null,bd=1e9;for(const e of allTargets()){if(e.dead||e.fade>0)continue;const d=Math.abs(e.x-ally.x)+(e.fly?150:0);if(d<bd){bd=d;best=e}}return best}
function allySay(k){if(ally&&ally.lt<=0&&Math.random()<.5){ally.line=pick(SLINE[k]);ally.lt=2.4}}
function updAlly(dt){const a=ally;if(!a)return;a.t-=dt;a.atkCD-=dt;a.lt-=dt;
  if(a.state==='drop'){a.vy+=3000*dt;a.oy+=a.vy*dt;if(a.oy>=0){a.oy=0;a.vy=0;a.state='idle';shake=Math.max(shake,8);dust(a.x,FY);dust(a.x+50,FY);dust(a.x-50,FY);ring(a.x,FY-20,'#5ce1d8',180);sfxLand(1800)}a.y=FY+a.oy;return}
  if(a.state==='leave'){a.t-=0;a.oy-=1400*dt;a.y=FY+a.oy;if(a.oy<-900)ally=null;return}
  /* leave when the fight is over */
  const fighting=lock||(boss&&!boss.dead);if(!fighting){a.leaveT+=dt;if(a.leaveT>1.2&&a.state==='idle'){a.state='leave';a.line=pick(SLINE.leave);a.lt=2.5;teleFx(a.x,a.y,a.h);ring(a.x,a.y-100,'#5ce1d8',200)}}
  const T=allyTarget(),lo=cam+120,hi=cam+W-RSAFE-60;let want=0;
  if(a.state==='idle'||a.state==='run'){if(T){const dx=T.x-a.x;a.face=Math.sign(dx)||a.face;const reach=170+T.w/2;
      if(Math.abs(dx)>reach-20)want=Math.sign(dx);else if(a.atkCD<=0){a.state='wind';a.t=.22;a.hit=new Set()}
      if(T.fly&&Math.abs(dx)<320&&a.oy===0&&a.atkCD<=0&&T.y<FY-220){a.state='leap';a.vy=-1300;a.hit=new Set()}}
    else{const fx=pl.x-pl.face*170,dx=fx-a.x;if(Math.abs(dx)>60)want=Math.sign(dx);a.face=want||Math.sign(pl.x-a.x)||1}
    a.vx+=(want*560-a.vx)*Math.min(1,dt*8);if(a.state==='idle'||a.state==='run')a.state=Math.abs(a.vx)>60?'run':'idle'}
  else a.vx*=Math.pow(.02,dt);
  if(a.state==='wind'&&a.t<=0){a.state='swing';a.t=.24;a.vx=a.face*380;sfxSwing(2)}
  if(a.state==='swing'||a.state==='leap'){const box={x:a.face>0?a.x-10:a.x-230,y:a.y-210,w:240,h:220};
    for(const e of allTargets())if(!a.hit.has(e)&&overlap(box,ebox(e))){a.hit.add(e);const was=e.hp;damage(e,18*(1+G.lv*.1),a.face*420);if(e.dead||e.hp<=0)allySay('hit');else if(was===e.hp&&e.guarding)a.atkCD=.8}
    if(a.state==='swing'&&a.t<=0){a.state='idle';a.atkCD=.55+Math.random()*.3}}
  if(a.state==='leap'){a.vy+=3000*dt;a.oy+=a.vy*dt;if(a.oy>=0){a.oy=0;a.vy=0;a.state='idle';a.atkCD=.6;dust(a.x,FY)}}
  a.x=clamp(a.x+a.vx*dt,lock?lo:80,lock?hi:RW-80);a.y=FY+a.oy}
function mkAllyView(a){const spr=bossSprite('sable',2.9,D.player-.3),sh=shadowObj(),gl=gI(0,0,240,'#5ce1d8',.18).setDepth(D.player-.4),
    bub=SC.add.text(0,0,'',{fontFamily:FU,fontStyle:'600',fontSize:'24px',color:'#e8fffb',backgroundColor:'rgba(8,36,40,.9)',padding:{x:14,y:9},wordWrap:{width:440}}).setOrigin(.5,1).setDepth(D.texts);
  return{spr,sh,gl,bub,objs:[spr,sh,gl,bub]}}
function updAllyView(a,v){const fr=a.state==='wind'?'wind':a.state==='swing'?'swing':a.state==='leap'||a.state==='drop'||a.state==='leave'?'leap':idleFrame(a,a.state==='run');
  v.spr.setFrame(fr).setPosition(a.x,a.y).setFlipX(a.face<0).setAlpha(a.state==='leave'?Math.max(0,1+a.oy/700):1);setShadow(v.sh,a.x,40,FY);v.gl.setPosition(a.x,a.y-110);
  if(a.lt>0&&a.line){tx(v.bub,'SABLE  ·  '+a.line).setVisible(true).setPosition(clamp(a.x,cam+240,cam+W-240),a.y-250).setAlpha(Math.min(1,a.lt*2))}else v.bub.setVisible(false);
  lightW(a.x,a.y-100,240,.6)}
</script>
