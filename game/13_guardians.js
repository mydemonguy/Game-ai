<script>
"use strict";
/* ---------- guardians: a boss in each ability shrine (worlds I–V), each with its own weapon and fighting style,
   drawn as baked pixel-art sprite sheets (14_bossart) ---------- */
const GUARD=[
 {name:'Foreman Krell',sub:'Guardian of Hangar Nine',art:'krell',k:3.3,glow:'#ff9a2a',hp:700,w:150,h:330,range:360,
  atk:['claw','drill','rivets'],atk2:['call','drill'],tip:'He telegraphs every move. When his claw opens wide, step back. When he lowers the drill, jump it: if he rams the wall he gets stuck, and stuck means free hits.'},
 {name:'Bulwark',sub:'Guardian of the Iron Armory',art:'bulwark',k:3.4,glow:'#ffcc4a',hp:900,w:230,h:400,range:320,
  atk:['guard','bash','pound'],atk2:['pound','guard'],tip:'His shield blocks everything from the front. Jump over him or slip behind him while he hammers the floor.'},
 {name:'Alpha Hound',sub:'Guardian of Orbital Dock Aeris',art:'hound',k:3.2,glow:'#ff5a3a',hp:1250,w:260,h:190,range:520,
  atk:['pounce','spin','thrust'],atk2:['howl','thrust'],tip:'Its thrusters leave burning trails. Stay off the fire, and strike back after a pounce combo.'},
 {name:'Crucible',sub:'Guardian of the Amber Foundry',art:'crucible',k:3.2,glow:'#ff7a2a',hp:1600,w:240,h:460,range:600,
  atk:['mortar','breath','stomp'],atk2:['mortar'],tip:'Its furnace overheats after it breathes fire. While it vents steam, every hit does double damage.'},
 {name:'Null Seraph',sub:'Guardian of the Null Citadel',art:'seraph',k:2.8,glow:'#b48cff',hp:2000,w:150,h:320,range:640,fly:1,
  atk:['thrust','feathers','snipe','rift'],atk2:['halo'],tip:'When it vanishes it reappears beside you and swoops low with its lance. Jump the thrust, then hit back.'}];
let camLock=null;
const gDone=a=>a>=5||!!(META.guards&&META.guards[a]);
const gClamp=x=>clamp(x,cam+180,cam+W-RSAFE-120);

/* ---- baked boss sprite sheets: one canvas per boss, frames named after poses, sampled with nearest filtering ---- */
const BTX={};
function bossTex(key){const tk='bs_'+key;if(BTX[key]&&TX.exists(tk))return BTX[key];
  const BIG=['krell','bulwark','hound','crucible','seraph','malakar'];if(BIG.includes(key))for(const k in BTX)if(k!==key&&BIG.includes(k)&&TX.exists('bs_'+k)){TX.remove('bs_'+k);delete BTX[k]}   /* keep GPU memory to one boss at a time (Claude and Sable stay) */
  const b=bakeBoss(key),n=b.frames.length,cols=Math.min(n,4),rows=Math.ceil(n/cols),[c,g]=mkC(cols*b.fw,rows*b.fh);
  b.frames.forEach((f,i)=>g.drawImage(f,(i%cols)*b.fw,Math.floor(i/cols)*b.fh));if(TX.exists(tk))TX.remove(tk);TX.addCanvas(tk,c);const T=TX.get(tk);
  b.names.forEach((nm,i)=>T.add(nm,0,(i%cols)*b.fw,Math.floor(i/cols)*b.fh,b.fw,b.fh));T.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return BTX[key]={fw:b.fw,fh:b.fh,ay:b.ay,px:b.px,names:b.names,frames:b.frames}}

function startGuardian(a){const D0=GUARD[a];lock=true;camLock=0;clearEnemies();spawnQ=[];bossTex(D0.art);
  const hp=D0.hp*(META.hard?1.5:1);
  boss={isBoss:true,guard:a,name:D0.name,x:clamp(Math.min(W*.33,pl.x-520),300,W-RSAFE-200),y:FY,oy:-950,vy:0,w:D0.w,h:D0.h,hp,max:hp,face:1,state:'enter',t:1.4,
    flash:0,vx:0,phase:1,fr:'leap',seed:Math.random()*10,last:'',n:0,fadeT:0,guarding:0,weak:0,heat:0,spin:0};
  showBanner(D0.name,D0.sub,2.4);sfxBossRoar();shake=12;sfxAlarm();musicFor()}
function gWind(b,t,next,fr){b.state='wind';b.t=t;b.next=next;b.fr=fr||'wind';S.warn()}
function gPick(b){const D0=GUARD[b.guard];let o=D0.atk.slice();if(b.phase===2)o=o.concat(D0.atk2);o=o.filter(x=>x!==b.last);if(!o.length)o=D0.atk.slice();
  let a=o[Math.floor(Math.random()*o.length)];if((a==='call'||a==='howl')&&en.length>=2)a=D0.atk[0];if(b.guard===3&&b.heat>=2)a='breath';
  b.last=a;const k=b.phase===2?.72:1;b.n=0;b.hitP=false;
  if(a==='claw')gWind(b,.55*k,'clunge');
  else if(a==='drill')gWind(b,.7*k,'ddash');
  else if(a==='rivets'){b.state='spray';b.fr='spray';b.t=.3;b.n=b.phase===2?4:3;b.fire=0}
  else if(a==='call'){b.state='cast';b.fr='spray';b.t=.8;spawnEnemy('d',-1);spawnEnemy('d',1)}
  else if(a==='guard'){b.state='guard';b.fr='guard';b.t=1.7;b.guarding=1;sfxBlock()}
  else if(a==='bash'){gWind(b,.5*k,'bash','guard');b.guarding=1}
  else if(a==='pound')gWind(b,.8*k,'pound','pwind');
  else if(a==='pounce'){gWind(b,.35*k,'xjump');b.n=b.phase===2?3:2}
  else if(a==='spin')gWind(b,.4*k,'spin');
  else if(a==='thrust'&&D0.fly){b.state='blink';b.fr='cast';b.t=.35;b.fadeT=.35}
  else if(a==='thrust')gWind(b,.45*k,'run');
  else if(a==='howl'){b.state='cast';b.fr='howl';b.t=.9;spawnEnemy('h',-1);spawnEnemy('h',1);sfxBossRoar()}
  else if(a==='mortar'){b.state='mortar';b.fr='aim';b.t=.45;b.n=b.phase===2?4:3;b.fire=0}
  else if(a==='breath'){b.state='breath';b.fr='breath';b.t=1.35;const low=Math.random()<.5;hz.push({kind:'beam',y:low?GY-60:GY-215,low,t:1.05*k+.2,act:.6});S.warn()}
  else if(a==='stomp'){gWind(b,.8*k,'pound');b.heat++}
  else if(a==='feathers'){b.state='feathers';b.fr='nova';b.t=.55*k}
  else if(a==='snipe'){b.state='aim';b.fr='cast';b.t=1*k}
  else if(a==='rift'){b.state='cast';b.fr='nova';b.t=1;const xs=[pl.x,pl.x-320,pl.x+320];if(b.phase===2)xs.push(pl.x-640,pl.x+640);
    xs.forEach((x,i)=>hz.push({kind:'pillar',x:gClamp(x),t:.9+i*.08,act:.45,w:160}));S.warn()}
  else if(a==='halo'){b.state='halo';b.fr='nova';b.t=.7}}
function gLand(b,dt){b.vy+=3000*dt;b.oy+=b.vy*dt;if(b.oy>=0){const v=b.vy;b.oy=0;b.vy=0;return v||1}return 0}
function gQuake(b,n){for(let i=0;i<n;i++)for(const d of[-1,1])hz.push({kind:'quake',x:b.x+d*(90+i*10),dir:d,v:820+i*120,t:0,act:1.6});shake=18;camKick(.03);dust(b.x,FY);dust(b.x+80,FY);dust(b.x-80,FY);sfxEnemy('smash',b)}
function gShoot(b,x,y,a,v,o){shots.push(Object.assign({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:18,dmg:12*dm(),life:3.2,col:GUARD[b.guard].glow},o||{}));sfxEnemy('shot',{x,y,type:GUARD[b.guard].fly?'c':'d'});muzzle(x,y,GUARD[b.guard].glow)}
/* a lobbed shot that lands on the floor near tx after T seconds */
function gLob(b,x0,y0,tx,T,o){const g=1500;shots.push(Object.assign({x:x0,y:y0,vx:(tx-x0)/T,vy:(FY-30-y0)/T-.5*g*T,g,r:22,dmg:14*dm(),life:T+.4,col:GUARD[b.guard].glow},o||{}))}
const gRec=(b,t)=>{b.state='rec';b.fr=null;b.t=t;b.guarding=0};
function gHit(b,box,d,kx){if(!b.hitP&&overlap(box,pbox())){b.hitP=true;hurtPlayer(d*dm(),kx)}}
function updGuardian(b,dt){const D0=GUARD[b.guard];b.flash-=dt;b.t-=dt;b.fadeT=Math.max(0,b.fadeT-dt);const dx=pl.x-b.x,ad=Math.abs(dx),k=b.phase===2?.72:1;
  if(b.phase===1&&b.hp<b.max*.5&&b.state!=='enter'){b.phase=2;showBanner(D0.name+' enraged','',1.4);sfxBossRoar();shake=16;ring(b.x,b.y-b.h/2,'#ff3d6e',360);camKick(.04)}
  const hover=D0.fly?-200+Math.sin(lvT*2+b.seed)*14:0,fwd=(w,h)=>({x:b.face>0?b.x:b.x-w,y:b.y-h,w,h}),edge=()=>b.x<cam+180||b.x>cam+W-RSAFE-120;
  if(b.state==='enter'){if(D0.fly){b.oy+=(hover-b.oy)*Math.min(1,dt*2.4);if(b.t<=0){b.state='idle';b.t=1;b.fr=null}}
    else if(gLand(b,dt)){shake=18;camKick(.03);dust(b.x,FY);dust(b.x+90,FY);dust(b.x-90,FY);S.boom();b.state='idle';b.t=1.1;b.fr=null}b.y=FY+b.oy;return}
  const st=b.state,moving=st==='clunge'||st==='ddash'||st==='bash'||st==='xjump'||st==='run'||st==='lance'||st==='spin';
  if(!moving&&st!=='stuck')b.face=Math.sign(dx)||1;
  if(st==='idle'){b.fr=null;const want=ad>D0.range+60?1:ad<D0.range-120?-1:0,sp=D0.fly?300:b.guard===2?420:210;b.vx+=(want*Math.sign(dx)*sp-b.vx)*Math.min(1,dt*4);b.x=gClamp(b.x+b.vx*dt);
    if(D0.fly)b.oy+=(hover-b.oy)*Math.min(1,dt*3);if(b.t<=0)gPick(b)}
  else if(st==='wind'){b.vx*=Math.pow(.01,dt);if(D0.fly&&b.next==='lance')b.oy+=(-40-b.oy)*Math.min(1,dt*8);
    if(b.t<=0){const n=b.next;b.state=n;b.hitP=false;
      if(n==='clunge'){b.fr='swing';b.t=.32;b.vx=b.face*1250;sfxEnemy('swipe',b)}
      else if(n==='ddash'){b.fr='drill';b.t=.85;b.vx=b.face*1500;S.boom()}
      else if(n==='bash'){b.fr='bash';b.t=.6;b.vx=b.face*1250;S.boom()}
      else if(n==='pound'){b.fr=b.guard===1?'pound':'swing';b.t=.7*k;gQuake(b,b.phase===2?2:1);if(b.guard===1&&b.phase===2)for(let i=0;i<3;i++)hz.push({kind:'rock',x:clamp(pl.x+(Math.random()-.5)*1100,cam+120,cam+W-RSAFE),t:.9+i*.15,act:.2})}
      else if(n==='xjump'){b.fr='leap';b.vy=-1050;b.vx=clamp((pl.x-b.x)/.7,-1300,1300);sfxEnemy('leap',b)}
      else if(n==='spin'){b.fr='spin';b.t=.95;b.spin=0;sfxEnemy('swipe',b)}
      else if(n==='run'){b.fr=null;b.t=.95;b.vx=b.face*1550;b.trail=b.x;S.boom()}
      else if(n==='lance'){b.fr='thrust';b.t=.42;b.vx=b.face*1700;S.boom()}}}
  else if(st==='clunge'){b.x+=b.vx*dt;b.vx*=Math.pow(.05,dt);gHit(b,fwd(b.w/2+190,b.h*.8),18,b.face*800);if(b.t<=0||edge()){b.x=gClamp(b.x);gRec(b,.6*k)}}
  else if(st==='ddash'){b.x+=b.vx*dt;if(Math.random()<.7)part(b.x+b.face*120,b.y-b.h*.45,-b.vx*.2+(Math.random()-.5)*300,-Math.random()*300,.3,'#ffe066',5,1600);
    gHit(b,fwd(b.w/2+150,b.h*.7),20,b.face*900);
    if(edge()){b.x=gClamp(b.x);b.vx=0;shake=14;camKick(.03);S.boom();b.state='stuck';b.fr='drill';b.t=1.1;b.weak=1.5;ftext(b.x,b.y-b.h-30,'Stuck!','#ffd27a',1);sparks(b.x+b.face*130,b.y-b.h*.45,'#ffe066',16,-b.face)}
    else if(b.t<=0)gRec(b,.5)}
  else if(st==='stuck'){if(Math.random()<.3)part(b.x+b.face*130,b.y-b.h*.45,(Math.random()-.5)*200,-200,.3,'#ffe066',5,1200);if(b.t<=0){b.weak=0;gRec(b,.3)}}
  else if(st==='spray'){b.fire-=dt;if(b.fire<=0&&b.t<=0){b.fire=.32;b.n--;const x0=b.x+b.face*90,y0=b.y-b.h*.85;
      for(let i=0;i<4;i++)gLob(b,x0,y0,pl.x+(i-1.5)*150+(Math.random()-.5)*60,.75+i*.07,{r:12,dmg:9*dm(),col:'#ffe066'});sfxEnemy('shot',b);muzzle(x0,y0,'#ffe066');if(b.n<=0)gRec(b,.8*k)}}
  else if(st==='guard'){b.x=gClamp(b.x+b.face*120*dt);if(b.t<=0){if(Math.random()<.5&&ad<900){gWind(b,.35,'bash','guard');b.guarding=1}else gRec(b,.6)}}
  else if(st==='bash'){b.x+=b.vx*dt;b.vx*=Math.pow(.3,dt);if(Math.random()<.5)dust(b.x-b.face*60,FY);gHit(b,fwd(b.w/2+90,b.h),18,b.face*1100);if(b.t<=0||edge()){b.x=gClamp(b.x);shake=10;gRec(b,.75*k)}}
  else if(st==='pound'){if(b.t<=0)gRec(b,.5)}
  else if(st==='xjump'){b.x=gClamp(b.x+b.vx*dt);gHit(b,ebox(b),16,Math.sign(b.vx||1)*650);
    if(gLand(b,dt)){dust(b.x,FY);shake=6;b.vx=0;b.n--;if(b.n>0)gWind(b,.45*k,'xjump');else gRec(b,1)}}
  else if(st==='spin'){b.vx+=(Math.sign(dx)*560-b.vx)*Math.min(1,dt*3);b.x=gClamp(b.x+b.vx*dt);b.spin+=dt;
    if(!b.hitP&&Math.hypot(pl.x-b.x,pl.y-90-(b.y-70))<180){b.hitP=true;hurtPlayer(14*dm(),Math.sign(pl.x-b.x)*800)}if(Math.random()<.6)sparks(b.x,b.y-60,'#ff9638',3,Math.random()<.5?1:-1);if(b.t<=0)gRec(b,.7*k)}
  else if(st==='run'){b.x+=b.vx*dt;part(b.x-b.face*90,b.y-60,-b.vx*.15,-60,.35,'#ff9638',14,0);
    if(Math.abs(b.x-b.trail)>110){b.trail=b.x;hz.push({kind:'fire',x:b.x-b.face*60,t:0,act:2.4,w:120})}
    gHit(b,ebox(b),14,b.face*700);if(b.t<=0||edge()){b.x=gClamp(b.x);b.vx=0;gRec(b,.8*k)}}
  else if(st==='mortar'){b.fire-=dt;if(b.fire<=0&&b.t<=0){b.fire=.28;b.n--;const x0=b.x+b.face*120,y0=b.y-b.h*.88;
      gLob(b,x0,y0,clamp(pl.x+(Math.random()-.5)*420,cam+140,cam+W-RSAFE-60),1.05,{r:24,dmg:14*dm(),puddle:1});sfxEnemy('smash',b);muzzle(x0,y0,'#ff6418');if(b.n<=0){b.heat++;gRec(b,.8*k)}}}
  else if(st==='breath'){if(b.t<.9&&Math.random()<.8)part(b.x+b.face*40,b.y-b.h*.62,b.face*(500+Math.random()*400),(Math.random()-.5)*200,.4,'#ffb040',16,0,'glow');
    if(b.t<=0){b.state='vent';b.fr='vent';b.t=2.3;b.weak=2;b.heat=0;ftext(b.x,b.y-b.h-30,'Overheated!','#ffb040',1);sfxVent(b.x)}}
  else if(st==='vent'){if(Math.random()<.7)part(b.x+(Math.random()-.5)*b.w,b.y-b.h*(.5+Math.random()*.4),(Math.random()-.5)*80,-240-Math.random()*160,1,'rgba(220,225,235,.35)',34,-60,'norm');
    if(b.t<=0){b.weak=0;gRec(b,.4)}}
  else if(st==='blink'){if(b.t<=0&&b.fadeT<=0){const side=pl.x-cam>W/2?-1:1;b.x=gClamp(pl.x+side*480);b.face=-side;teleFx(b.x,b.y,b.h);b.fadeT=.3;gWind(b,.5*k,'lance')}}
  else if(st==='lance'){b.x+=b.vx*dt;part(b.x-b.face*60,b.y-b.h*.5,-b.vx*.1,0,.25,'#a8f0ff',10,0);gHit(b,fwd(b.w/2+200,b.h*.6),20,b.face*900);
    if(b.t<=0||edge()){b.x=gClamp(b.x);b.vx=0;gRec(b,.8*k)}}
  else if(st==='feathers'){if(b.t<=0){const n=b.phase===2?9:7,x0=b.x-b.face*20,y0=b.y-b.h*.8,a0=Math.atan2(pl.y-90-y0,pl.x-x0);
      for(let i=0;i<n;i++)gShoot(b,x0,y0,a0+(i-(n-1)/2)*.17,560,{col:'#a8f0ff'});gRec(b,.9*k)}}
  else if(st==='aim'){const x0=b.x+b.face*140,y0=b.y-b.h*.55;if(b.t>.25){b.ax=pl.x;b.ay=pl.y-90}OV.lines.push([x0,y0,b.ax,b.ay,b.t>.25?.45:.95]);
    if(b.t<=0){gShoot(b,x0,y0,Math.atan2(b.ay-y0,b.ax-x0),1500,{r:16,dmg:22*dm(),col:'#ff4a6a'});gRec(b,.7*k)}}
  else if(st==='halo'){if(b.t<=0){const x0=b.x,y0=b.y-b.h*.6;for(let i=0;i<14;i++)gShoot(b,x0,y0,i/14*Math.PI*2+lvT,420,{col:'#e030c0',r:16});ring(x0,y0,'#e030c0',300);gRec(b,1)}}
  else if(st==='cast'){if(b.t<=0)gRec(b,.9*k)}
  else if(st==='rec'){b.vx*=Math.pow(.02,dt);if(D0.fly)b.oy+=(hover-b.oy)*Math.min(1,dt*3);if(b.t<=0){b.state='idle';b.t=(D0.fly?.8:1)*k;b.fr=null;b.guarding=0}}
  if(st!=='xjump'&&!D0.fly&&b.oy<0)gLand(b,dt);
  b.y=FY+b.oy;
  if(!moving&&!b.fadeT&&overlap(ebox(b),pbox()))hurtPlayer(6*dm(),(pl.x<b.x?-1:1)*700)}
/* shields and weak spots: called from damage() before a hit lands */
function guardHit(e,d){if(e.guarding&&pl&&Math.sign(pl.x-e.x)===e.face){if(!e.blkT||e.blkT<lvT){e.blkT=lvT+.25;sfxBlock();sparks(e.x+e.face*110,e.y-e.h*.55,'#ffcc4a',10,e.face);ftext(e.x+e.face*80,e.y-e.h-20,'Blocked','#ffcc4a')}return 0}
  return e.weak?d*e.weak:d}
const ownArmBefore=a=>!!(META.guards&&META.guards[a]);
function guardianDown(b){const a=b.guard,D0=GUARD[a],had=ownArmBefore(a);b.dead=true;boss=null;lock=false;camLock=null;if(!META.guards)META.guards={};saveMeta();G.score+=3000;
  hz=[];shots=shots.filter(s=>s.friend);for(const e of en){e.dead=true;burst(e.x,e.y-e.h/2,'#ff4fd8',16);eKill(e)}en=[];spawnQ=[];
  const x=b.x,y=b.y;shake=26;camKick(.06);S.boom();sfxGateBreak();explode({x,y,w:b.w,h:b.h,heavy:1});
  for(let i=0;i<5;i++)setTimeout(()=>{if(!ROOM||ROOM.kind!=='shrine')return;burst(x+(Math.random()-.5)*b.w*2,y-Math.random()*b.h,i%2?D0.glow:'#ffd27a',30,900);S.boom();shake=14},180+i*220);
  META.guards[a]=1;saveMeta();addDust(40,x,y-b.h-40);const newArm=!had;showBanner(D0.name+' defeated',G.rush?'':'The shrine awakens',2.6);if(G.rush)G.rush.next=3;
  if(newArm){META.arm=a;padArms();setTimeout(()=>{if(G.state==='play')showBanner('Guardian Arm: '+ARMS[a].name,(touchy?'Tap ◈ to fire, tap its label to switch':'U to fire, I to switch')+' · '+ARMS[a].how,3.6)},2900)}
  picks.push({x:gClamp(x),y:FY-130,type:'core',id:'core'+a,float:1},{x:x+80,y:y-b.h/2,vx:160,vy:-600,type:'med',life:14});musicFor()}

/* ---- view: the boss's sprite sheet ---- */
function bossSprite(key,k,depth){const I=bossTex(key),spr=SC.add.sprite(0,0,'bs_'+key,'idle0').setOrigin(.5,I.ay).setScale(k*I.px).setDepth(depth);spr.I=I;return spr}
function idleFrame(b,mv){return mv?'walk'+(Math.floor(lvT*9+b.seed)%4):(Math.floor(lvT*2.4+b.seed)%2?'idle1':'idle0')}
function mkGuardView(b){const D0=GUARD[b.guard],spr=bossSprite(D0.art,D0.k,D.boss),aura=gI(0,0,b.h*2.4,D0.glow,.22).setDepth(D.boss-.5),sh=D0.fly?null:shadowObj(),
    shield=gI(0,0,260,'#ffcc4a',0).setDepth(D.boss+.3),objs=[spr,aura,shield];if(sh)objs.push(sh);return{spr,aura,sh,shield,objs}}
function updGuardView(b,v){const D0=GUARD[b.guard],fr=b.fr||idleFrame(b,Math.abs(b.vx)>60||b.state==='run'),spin=fr==='spin',bob=D0.fly?Math.sin(lvT*2.5+b.seed)*8:0,s=v.spr;
  s.setFrame(fr);if(spin){s.setOrigin(.5,.62);s.setPosition(b.x,b.y-s.displayHeight*(s.I.ay-.62)).setRotation(b.face*b.spin*16)}else{s.setOrigin(.5,s.I.ay).setPosition(b.x,b.y+bob).setRotation(0)}
  s.setFlipX(b.face<0).setAlpha(b.fadeT>0?Math.max(.08,1-b.fadeT/.35):1);
  if(b.flash>.06)s.setTintFill(0xffffff);else if(b.weak&&Math.floor(lvT*10)%2)s.setTint(0xffb080);else s.clearTint();
  v.aura.setPosition(b.x,b.y-b.h*.5+bob).setAlpha(.18+.06*Math.sin(lvT*3)+(b.phase===2?.1:0)+(b.weak?.15:0));
  v.shield.setPosition(b.x+b.face*120,b.y-b.h*.55).setDisplaySize(160,b.h*1.1).setAlpha(b.guarding?.28+.1*Math.sin(lvT*20):0);
  if(v.sh)setShadow(v.sh,b.x,b.w*.6,FY);
  if(b.state==='wind'||(b.state==='guard'&&b.t<.4))warnMark(b.x,b.y-b.h-50+bob);lightW(b.x,b.y-b.h*.5,b.h*1.6,.9)}
</script>
