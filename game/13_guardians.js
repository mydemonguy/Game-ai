<script>
"use strict";
/* ---------- guardians: a boss in each ability shrine (worlds I–V), built from the robot rigs at a larger scale ---------- */
const GUARD=[
 {name:'Foreman Krell',sub:'Guardian of Hangar Nine',rig:'g',sc:1.3,tint:0xffc090,glow:'#ff9a2a',hp:700,w:110,h:220,range:380,atk:['charge','leap','charge'],atk2:['call']},
 {name:'Bulwark',sub:'Guardian of the Iron Armory',rig:'b',sc:1.25,tint:0xc8e8d0,glow:'#ff8a3a',hp:900,w:180,h:330,range:300,atk:['pound','rocks','charge'],atk2:['rocks']},
 {name:'Alpha Hound',sub:'Guardian of Orbital Dock Aeris',rig:'h',sc:1.6,tint:0xffa080,glow:'#ff5a3a',hp:1250,w:200,h:150,range:520,atk:['pounce','pounce','rocks'],atk2:['howl']},
 {name:'Crucible',sub:'Guardian of the Amber Foundry',rig:'B',sc:1.15,tint:0xffb070,glow:'#ff7a2a',hp:1600,w:210,h:380,range:560,atk:['barrage','stomp','flame'],atk2:['barrage']},
 {name:'Null Seraph',sub:'Guardian of the Null Citadel',rig:'c',sc:1.45,tint:0xd8b8ff,glow:'#b48cff',hp:2000,w:120,h:240,range:600,fly:1,atk:['fan','blink','rift','snipe'],atk2:['fan']}];
let camLock=null;
const gDone=a=>a>=5||!!(META.guards&&META.guards[a]);
const gClamp=x=>clamp(x,cam+180,cam+W-RSAFE-120);
function startGuardian(a){const D0=GUARD[a];lock=true;camLock=0;clearEnemies();spawnQ=[];
  boss={isBoss:true,guard:a,name:D0.name,rig:D0.rig,x:clamp(Math.min(W*.33,pl.x-520),300,W-RSAFE-200),y:FY,oy:-950,vy:0,w:D0.w,h:D0.h,hp:D0.hp,max:D0.hp,face:1,state:'enter',t:1.4,
    flash:0,vx:0,phase:1,anim:'leap',seed:Math.random()*10,last:'',n:0,fadeT:0};
  showBanner(D0.name,D0.sub,2.4);sfxBossRoar();shake=12;sfxAlarm();musicFor()}
function gPick(b){const D0=GUARD[b.guard];let o=D0.atk.slice();if(b.phase===2)o=o.concat(D0.atk2);o=o.filter(x=>x!==b.last);if(!o.length)o=D0.atk.slice();
  let a=o[Math.floor(Math.random()*o.length)];if((a==='call'||a==='howl')&&en.length>=2)a=D0.atk[0];b.last=a;const k=b.phase===2?.72:1;b.n=0;
  if(a==='charge'){b.state='cwind';b.anim='wind';b.t=.65*k;S.warn()}
  else if(a==='leap'){b.state='lwind';b.anim='wind';b.t=.45*k;S.warn()}
  else if(a==='pound'||a==='stomp'){b.state='pwind';b.anim='wind';b.t=.8*k;S.warn()}
  else if(a==='pounce'){b.state='xwind';b.anim='wind';b.t=.35*k;b.n=b.phase===2?3:2}
  else if(a==='call'){b.state='cast';b.anim='wind';b.t=.8;spawnEnemy('d',-1);spawnEnemy('d',1)}
  else if(a==='howl'){b.state='cast';b.anim='wind';b.t=.9;spawnEnemy('h',-1);spawnEnemy('h',1);sfxBossRoar()}
  else if(a==='rocks'){b.state='cast';b.anim='wind';b.t=1;shake=10;const n=b.phase===2?6:4;
    for(let i=0;i<n;i++)hz.push({kind:'rock',x:clamp(pl.x+(i===0?0:(Math.random()-.5)*1400),cam+120,cam+W-RSAFE),t:.9+i*.14,act:.2})}
  else if(a==='barrage'){b.state='barr';b.anim='wind';b.t=.45;b.fire=0;b.n=b.phase===2?7:5}
  else if(a==='flame'){b.state='cast';b.anim='wind';b.t=1.2;const low=Math.random()<.5;hz.push({kind:'beam',y:low?GY-60:GY-215,low,t:1.05*k+.2,act:.6});S.warn()}
  else if(a==='blink'){b.state='blink';b.anim='walk';b.t=.35;b.fadeT=.35}
  else if(a==='fan'){b.state='fan';b.anim='wind';b.t=.55*k}
  else if(a==='rift'){b.state='cast';b.anim='wind';b.t=1;const xs=[pl.x,pl.x-320,pl.x+320];if(b.phase===2)xs.push(pl.x-640,pl.x+640);
    xs.forEach((x,i)=>hz.push({kind:'pillar',x:gClamp(x),t:.9+i*.08,act:.45,w:160}));S.warn()}
  else if(a==='snipe'){b.state='aim';b.anim='wind';b.t=1*k}}
function gLand(b,dt){b.vy+=3000*dt;b.oy+=b.vy*dt;if(b.oy>=0){const v=b.vy;b.oy=0;b.vy=0;return v||1}return 0}
function gQuake(b,n){for(let i=0;i<n;i++)for(const d of[-1,1])hz.push({kind:'quake',x:b.x+d*(90+i*10),dir:d,v:820+i*120,t:0,act:1.6});shake=18;camKick(.03);dust(b.x,FY);dust(b.x+80,FY);dust(b.x-80,FY);sfxEnemy('smash',b)}
function gShoot(b,x,y,a,v,o){shots.push(Object.assign({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:18,dmg:12*dm(),life:3.2,col:GUARD[b.guard].glow},o||{}));sfxEnemy('shot',{x,y,type:b.rig==='c'?'c':'d'});muzzle(x,y,GUARD[b.guard].glow)}
function updGuardian(b,dt){const D0=GUARD[b.guard];b.flash-=dt;b.t-=dt;b.fadeT=Math.max(0,b.fadeT-dt);const dx=pl.x-b.x,ad=Math.abs(dx),k=b.phase===2?.72:1;
  if(b.phase===1&&b.hp<b.max*.5&&b.state!=='enter'){b.phase=2;showBanner(D0.name+' enraged','',1.4);sfxBossRoar();shake=16;ring(b.x,b.y-b.h/2,'#ff3d6e',360);camKick(.04)}
  const hover=D0.fly?-200+Math.sin(lvT*2+b.seed)*14:0;
  if(b.state==='enter'){if(D0.fly){b.oy+=(hover-b.oy)*Math.min(1,dt*2.4);if(b.t<=0){b.state='idle';b.t=1;b.anim='walk'}}
    else if(gLand(b,dt)){shake=18;camKick(.03);dust(b.x,FY);dust(b.x+90,FY);dust(b.x-90,FY);S.boom();b.state='idle';b.t=1.1;b.anim='walk'}b.y=FY+b.oy;return}
  if(b.state!=='cdash'&&b.state!=='ljump'&&b.state!=='xjump')b.face=Math.sign(dx)||1;
  const st=b.state;
  if(st==='idle'){b.anim='walk';const want=ad>D0.range+60?1:ad<D0.range-120?-1:0,sp=D0.fly?300:D0.rig==='h'?420:200;b.vx+=(want*Math.sign(dx)*sp-b.vx)*Math.min(1,dt*4);b.x=gClamp(b.x+b.vx*dt);
    if(D0.fly)b.oy+=(hover-b.oy)*Math.min(1,dt*3);if(b.t<=0)gPick(b)}
  else if(st==='cwind'){b.vx*=Math.pow(.01,dt);if(b.t<=0){b.state='cdash';b.anim='swing';b.t=.75;b.vx=b.face*1500;b.hitP=false;S.boom()}}
  else if(st==='cdash'){b.x+=b.vx*dt;part(b.x,b.y-b.h*.5+(Math.random()-.5)*b.h,-b.vx*.1,0,.25,D0.glow,10,0);
    if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(20*dm(),b.face*900)}
    if(b.t<=0||b.x<cam+180||b.x>cam+W-RSAFE-120){b.x=gClamp(b.x);b.vx=0;shake=8;b.state='rec';b.anim='walk';b.t=.55}}
  else if(st==='lwind'){if(b.t<=0){b.state='ljump';b.anim='leap';b.vy=-1500;b.vx=clamp((pl.x-b.x)/1,-1100,1100);b.hitP=false}}
  else if(st==='ljump'){b.x=gClamp(b.x+b.vx*dt);if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(16*dm(),Math.sign(b.vx||1)*700)}if(gLand(b,dt)){gQuake(b,b.phase===2?2:1);b.state='rec';b.anim='walk';b.t=.6;b.vx=0}}
  else if(st==='pwind'){if(b.t<=0){b.state='rec';b.anim='swing';b.t=.7*k;gQuake(b,b.phase===2?2:1)}}
  else if(st==='xwind'){b.vx*=Math.pow(.01,dt);if(b.t<=0){b.state='xjump';b.anim='leap';b.vy=-1050;b.vx=clamp((pl.x-b.x)/.7,-1300,1300);b.hitP=false;sfxEnemy('leap',b)}}
  else if(st==='xjump'){b.x=gClamp(b.x+b.vx*dt);if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(16*dm(),Math.sign(b.vx||1)*650)}
    if(gLand(b,dt)){dust(b.x,FY);shake=6;b.vx=0;b.n--;if(b.n>0){b.state='xwind';b.anim='wind';b.t=.5*k}else{b.state='rec';b.anim='walk';b.t=1}}}
  else if(st==='barr'){if(b.t<=0){b.anim='swing';b.fire-=dt;if(b.fire<=0){b.fire=.2;b.n--;const x0=b.x+b.face*160,y0=b.y-b.h*.72,tx=pl.x+(Math.random()-.5)*360,T=1.05,g=1400;
        shots.push({x:x0,y:y0,vx:(tx-x0)/T,vy:(FY-30-y0)/T-.5*g*T,g,r:22,dmg:14*dm(),life:3,col:D0.glow});sfxEnemy('shot',b);muzzle(x0,y0,D0.glow);if(b.n<=0){b.state='rec';b.anim='walk';b.t=.8*k}}}}
  else if(st==='blink'){if(b.t<=0&&b.fadeT<=0){const side=pl.x-cam>W/2?-1:1;b.x=gClamp(pl.x+side*560);teleFx(b.x,b.y,b.h);b.fadeT=.35;b.state='rec';b.anim='walk';b.t=.6}}
  else if(st==='fan'){if(b.t<=0){const n=b.phase===2?7:5,x0=b.x+b.face*120,y0=b.y-b.h*.55,a0=Math.atan2(pl.y-90-y0,pl.x-x0);for(let i=0;i<n;i++)gShoot(b,x0,y0,a0+(i-(n-1)/2)*.2,560);b.state='rec';b.anim='walk';b.t=.9*k}}
  else if(st==='aim'){const x0=b.x+b.face*140,y0=b.y-b.h*.55;if(b.t>.25){b.ax=pl.x;b.ay=pl.y-90}OV.lines.push([x0,y0,b.ax,b.ay,b.t>.25?.45:.95]);
    if(b.t<=0){gShoot(b,x0,y0,Math.atan2(b.ay-y0,b.ax-x0),1500,{r:16,dmg:22*dm(),col:'#ff4a6a'});b.state='rec';b.anim='walk';b.t=.7*k}}
  else if(st==='cast'){if(b.t<=0){b.state='idle';b.t=.9*k;b.anim='walk'}}
  else if(st==='rec'){b.vx*=Math.pow(.02,dt);if(D0.fly)b.oy+=(hover-b.oy)*Math.min(1,dt*3);if(b.t<=0){b.state='idle';b.t=(D0.fly?.8:1)*k;b.anim='walk'}}
  if(st!=='ljump'&&st!=='xjump'&&!D0.fly&&b.oy<0)gLand(b,dt);
  b.y=FY+b.oy;
  if(st!=='cdash'&&st!=='ljump'&&st!=='xjump'&&!b.fadeT&&overlap(ebox(b),pbox()))hurtPlayer(6*dm(),(pl.x<b.x?-1:1)*700)}
function guardianDown(b){const a=b.guard,D0=GUARD[a];b.dead=true;boss=null;lock=false;camLock=null;if(!META.guards)META.guards={};META.guards[a]=1;saveMeta();G.score+=3000;
  hz=[];shots=shots.filter(s=>s.friend);for(const e of en){e.dead=true;burst(e.x,e.y-e.h/2,'#ff4fd8',16);eKill(e)}en=[];spawnQ=[];
  const x=b.x,y=b.y;shake=26;camKick(.06);S.boom();sfxGateBreak();explode({x,y,w:b.w,h:b.h,heavy:1});
  for(let i=0;i<5;i++)setTimeout(()=>{if(!ROOM||ROOM.kind!=='shrine')return;burst(x+(Math.random()-.5)*b.w*2,y-Math.random()*b.h,i%2?D0.glow:'#ffd27a',30,900);S.boom();shake=14},180+i*220);
  showBanner(D0.name+' defeated','The shrine awakens',2.6);
  picks.push({x:gClamp(x),y:FY-130,type:'core',id:'core'+a,float:1},{x:x+80,y:y-b.h/2,vx:160,vy:-600,type:'med',life:14});musicFor()}

/* ---- view: the matching robot rig, scaled up and tinted ---- */
function mkGuardView(b){const D0=GUARD[b.guard],v=RIG[b.rig][0]();v.imgs=imgsOf(v.root);v.tint=D0.tint;for(const im of v.imgs)im.setTint(D0.tint);v.root.setDepth(D.boss);
  v.aura=gI(0,0,b.h*2.2,D0.glow,.22).setDepth(D.boss-.5);v.sh=D0.fly?null:shadowObj();v.objs.push(v.aura);if(v.sh)v.objs.push(v.sh);return v}
function updGuardView(b,v){const D0=GUARD[b.guard],e={state:b.anim,vx:b.anim==='walk'?Math.abs(b.vx)+(b.state==='idle'?0:0):0,seed:b.seed,face:b.face,x:b.x,y:b.y,h:b.h,w:b.w,
    t:b.state==='aim'||b.state==='fan'?.3:1,tp:b.fadeT>0?b.fadeT:0,fade:0,hp:1,max:1};
  RIG[b.rig][1](e,v);v.root.x=b.x;if(b.rig!=='c')v.root.y=b.y;v.root.setScale(b.face*v.sc*D0.sc,v.sc*D0.sc);if(b.rig==='c')v.root.y=b.y-60*D0.sc+Math.sin(lvT*2.5+b.seed)*10;
  v.aura.setPosition(b.x,b.y-b.h*.5).setAlpha(.18+.06*Math.sin(lvT*3)+(b.phase===2?.1:0));if(v.sh)setShadow(v.sh,b.x,b.w*.6,FY);
  flashRig(v,b.flash);if(b.anim==='wind')warnMark(b.x,b.y-b.h-40);lightW(b.x,b.y-b.h*.5,b.h*1.6,.9)}
</script>
