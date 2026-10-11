<script>
"use strict";
/* ---------- world, part 2: rooms at runtime, collision, doors, elevators, arenas, saves ---------- */
let ROOM=null,RW=CW,RH=H,FY=GY,camY=0,lockPlugs=[],hintT=0,platB=null;
const TRANS={on:0,t:0,phase:0,act:null};
const getMach=(k,v)=>bg.mach[k+v]||(bg.mach[k+v]=bakeMachine(k,PAL[bg.L.theme],bg.L.len+k.length*31+v*977));
function solidRects(){const o=[];if(ROOM)for(const g of ROOM.gates)if(!g.broken)o.push({x:g.x-g.w/2,y:g.top,w:g.w,h:GY-g.top,g});return o}
function roomSolids(){const s=ROOM?ROOM.solids:[];const g=solidRects();return g.length||lockPlugs.length?s.concat(g,lockPlugs):s}
function geoPushX(p,x0){for(const s of roomSolids()){if(s.y>=p.y-6||s.y+s.h<=p.y-160)continue;if(p.x+40>s.x&&p.x-40<s.x+s.w){p.x=x0<=s.x+s.w/2?s.x-40:s.x+s.w+40;if(!(p.dashT>0))p.vx=0;
    if(s.g&&hintT<=0&&!(s.g.kind==='crack'&&p.dashT>0)){hintT=3;ftext(p.x,p.y-210,GATEHINT[s.g.kind],'#ffd27a')}}}}
function geoLand(p,y0){if(p.vy<0){for(const s of roomSolids()){const b=s.y+s.h;if(p.x>s.x-30&&p.x<s.x+s.w+30&&y0-168>=b-2&&p.y-168<b){p.y=b+168;p.vy=0;break}}return null}
  let best=null;for(const s of roomSolids()){if(p.x>s.x-26&&p.x<s.x+s.w+26&&y0<=s.y+2&&p.y>=s.y&&(best==null||s.y<best))best=s.y}
  if(!(p.dropT>0))for(const s of ROOM.plats){if(p.x>s.x-26&&p.x<s.x+s.w+26&&y0<=s.y+2&&p.y>=s.y&&(best==null||s.y<best))best=s.y}
  return best}
function surfaceBelow(x,y){let best=RH+400;if(!ROOM)return GY;for(const s of roomSolids())if(x>s.x-10&&x<s.x+s.w+10&&s.y>=y-2&&s.y<best)best=s.y;
  for(const s of ROOM.plats)if(x>s.x-10&&x<s.x+s.w+10&&s.y>=y-2&&s.y<best)best=s.y;return best}
const onPlatform=p=>p.ground&&ROOM&&ROOM.plats.some(s=>Math.abs(p.y-s.y)<3&&p.x>s.x-26&&p.x<s.x+s.w+26);

/* ---- entering a room ---- */
function setArea(a){if(G.lv===a&&bg&&bg.L===LV[a])return;G.lv=a;bg=buildBG(LV[a]);bg.mach={};platB=null;supplyB=null}
function enterRoom(id,how){const o=genRoom(ROOMS[id]);setArea(o.a);ROOM=o;RW=o.RW;RH=o.RH;FY=o.FY;
  en=[];shots=[];hz=[];spawnQ=[];picks=[];boxes=[];rings=[];texts=[];lock=false;lockPlugs=[];boss=null;bossDone=!!META.boss;o.arena=null;o.bossT=1.4;
  o.gates.forEach((g,i)=>{g.broken=META.gates[o.id+':g'+i]?1:0});o.cages.forEach((c,i)=>{c.broken=META.gates[o.id+':c'+i]?1:0;c.hp=c.kind==='plasma'?3:1});
  for(const it of o.items){if(it.id&&(it.type==='tank'?META.tanks[it.id]:META.items[it.id]))continue;picks.push({x:it.x,y:it.y,type:it.type,id:it.id,float:1,cage:it.cage})}
  const r=rng(hstr(o.id)+((lvT*1000)|0));
  for(const x of o.crates)boxes.push({x,hp:2,flash:0,drop:rollDrop(r),drop2:r()<.35?rollDrop(r):null});
  for(const x of o.coins)for(let k=0;k<5;k++)picks.push({x:x+k*72-144,y:FY-140-Math.sin(k/4*Math.PI)*170,type:'coin',float:1});
  if(o.waves&&!META.cleared[o.id])o.arena={i:-1};
  if(how.side){const d=o.doors.find(dd=>dd.side===how.side&&dd.row===how.row)||o.doors.find(dd=>dd.side===how.side)||o.doors[0];
    pl.x=d.side==='L'?150:RW-150;pl.y=d.row*H+GY;pl.face=d.side==='L'?1:-1}else{pl.x=how.x;pl.y=how.y}
  if(o.lift)o.lift.armed=0;o.lift&&(o.lift.hold=0);pl.vx=0;pl.vy=0;pl.ground=true;pl.dashT=0;pl.slam=0;pl.sup=pl.y;o.entry={x:pl.x,y:pl.y};
  for(const s of o.spawns){if(o.waves)break;if(Math.abs(s.x-pl.x)<700&&Math.abs(s.y-pl.y)<400)continue;spawnEnemy(s.t,1);const e=en[en.length-1];e.x=s.x;e.y=s.y;e.hy=s.y;e.fade=s.t==='c'?1:0}
  META.map[o.id]=1;META.areas[o.a]=1;saveMeta();
  cam=Math.max(0,Math.min(RW-W,pl.x-W*.4));camY=Math.max(0,Math.min(RH-H,pl.y-H*.66));C._dirty=1;padAbilities();musicFor()}

/* ---- per-frame world logic ---- */
function startTrans(act){if(TRANS.on)return;TRANS.on=1;TRANS.t=0;TRANS.phase=0;TRANS.act=act;clearInput();if(act.lift)sfxLift(act.lift.dir);else sfxDoor()}
function updTrans(dt){TRANS.t+=dt;const dur=TRANS.act.lift?.7:.22;
  if(TRANS.phase===0&&TRANS.t>=dur){TRANS.phase=1;TRANS.t=0;const a=TRANS.act;
    if(a.lift){const to=ROOMS[a.lift.to],first=!META.areas[to.a],prev=G.lv;genRoom(to);enterRoom(to.id,{x:to.lift?to.lift.x:300,y:GY});if(first){META.save={room:to.id,x:(to.lift?to.lift.x:300)+170,score:G.score};saveMeta();areaIntro(prev,to.a)}else musicFor()}
    else{const tgt=ROOMS[a.door.to],pd=partnerDoor(ROOM,a.door);enterRoom(tgt.id,{side:pd?pd.side:(a.door.side==='L'?'R':'L'),row:pd?pd.row:0})}}
  else if(TRANS.phase===1&&TRANS.t>=.25){TRANS.on=0}}
function updWorld(dt){const p=pl,o=ROOM;hintT-=dt;if(!p||!o)return;
  if(!p.dead&&!lock&&!TRANS.on){const row=Math.max(0,Math.min(o.h-1,Math.floor((p.y-10)/H)));
    for(const d of o.doors)if(d.row===row&&((d.side==='L'&&p.x<70)||(d.side==='R'&&p.x>RW-70))){startTrans({door:d});break}}
  if(o.lift&&!p.dead&&!TRANS.on&&!lock){const on=p.ground&&Math.abs(p.x-o.lift.x)<95&&p.y>FY-6;if(!on)o.lift.armed=1;o.lift.hold=on&&o.lift.armed?(o.lift.hold||0)+dt:0;if(on&&o.lift.armed&&(o.lift.hold>1.1||P.down))startTrans({lift:o.lift})}
  /* lockdown arena */
  const A=o.arena;if(A){if(A.i<0&&!lock&&p.x>440&&p.x<RW-440){lock=true;A.i=0;spawnWave(o.waves[0]);showBanner('Lockdown','Wave 1 of '+o.waves.length,1.4);S.warn();sfxAlarm()}
    else if(lock&&A.i>=0&&!spawnQ.length&&!en.length){A.i++;if(A.i<o.waves.length){spawnWave(o.waves[A.i]);showBanner('Wave '+(A.i+1)+' of '+o.waves.length,'',1.2);S.warn()}
      else{lock=false;o.arena=null;META.cleared[o.id]=1;saveMeta();G.score+=500;showBanner('Room clear','Doors unlocked',1.6);sfxClear();
        picks.push({x:p.x+120,y:p.y-200,vx:120,vy:-600,type:'fruit',life:14},{x:p.x-120,y:p.y-200,vx:-120,vy:-600,type:'shard',life:14})}}}
  lockPlugs=lock?o.doors.map(d=>({x:d.side==='L'?-10:RW-40,y:d.row*H+GY-310,w:50,h:310,lockdoor:1})):[];
  /* boss chamber */
  if(o.kind==='boss'&&!META.boss&&!boss&&!bossDone){o.bossT-=dt;if(o.bossT<=0)startBoss()}
  if(bossDone&&doneT>0){doneT-=dt;if(doneT<=0){META.boss=1;saveMeta();victory();return}}
  /* abilities, gates, saves */
  if(p.dead)return;p.maxX=Math.max(p.maxX||0,p.x);
  if(p.dashT>0){const b={x:p.x-80,y:p.y-170,w:160,h:170};o.gates.forEach((g,i)=>{if(!g.broken&&g.kind==='crack'&&overlap(b,{x:g.x-g.w/2,y:g.top,w:g.w,h:GY-g.top}))breakGate(g,i)});
    o.cages.forEach((c,i)=>{if(!c.broken&&c.kind==='crack'&&Math.abs(c.x-p.x)<110&&p.y>GY-200)breakCage(c,i)})}
  for(const s of shots)if(s.friend&&s.wave){o.gates.forEach((g,i)=>{if(!g.broken&&g.kind==='laser'&&Math.abs(s.x-g.x)<s.r+40)breakGate(g,i)});o.cages.forEach((c,i)=>{if(!c.broken&&c.kind==='laser'&&Math.abs(s.x-c.x)<s.r+60)breakCage(c,i)})}
  const sh=o.shrine;if(sh&&sh.ab&&!hasAb(sh.ab)&&Math.abs(p.x-sh.x)<90)grantAbility(sh.ab);
  const st=o.station;if(st){st.t-=dt;if(!lock&&st.t<=0&&Math.abs(p.x-st.x)<70&&p.ground)useStation(st)}}
function updCamera(dt){const tx=Math.max(0,Math.min(RW-W,pl.x-W*.4)),ty=Math.max(0,Math.min(RH-H,pl.y-H*.66));cam+=(tx-cam)*Math.min(1,dt*7);camY+=(ty-camY)*Math.min(1,dt*6)}

function breakGate(g,i){g.broken=1;META.gates[ROOM.id+':g'+i]=1;saveMeta();shake=16;S.boom();sfxGateBreak();buzz(40);const cx=g.x,cy=g.top>0?(g.top+GY)/2:GY-400,col=g.kind==='laser'?'#ff3d3d':g.kind==='crystal'?'#ff5ad8':'#ffd27a';
  for(let k=0;k<4;k++)burst(cx,cy-200+k*130,col,18,900);ring(cx,cy,col,260);G.score+=300;ftext(cx,cy-260,'Path open','#7dffb0',1)}
function breakCage(c,i){c.broken=1;META.gates[ROOM.id+':c'+i]=1;saveMeta();shake=8;S.boom();sfxGateBreak();buzz(25);burst(c.x,GY-80,'#ff5ad8',26,800);ring(c.x,GY-80,'#ff5ad8',180)}
function clawGeo(box){const o=ROOM;if(!o)return;o.gates.forEach((g,i)=>{if(!g.broken&&g.kind==='crystal'&&overlap(box,{x:g.x-g.w/2,y:0,w:g.w,h:GY})){if(hasAb('plasma')){g.hp--;burst(g.x,box.y+80,'#ff5ad8',10,500);S.hit();if(g.hp<=0)breakGate(g,i)}else if(hintT<=0){hintT=2.5;ftext(g.x,GY-300,GATEHINT.crystal,'#ffd27a')}}});
  o.cages.forEach((c,i)=>{if(!c.broken&&c.kind==='plasma'&&overlap(box,{x:c.x-70,y:GY-170,w:140,h:170})){if(hasAb('plasma')){c.hp--;S.hit();burst(c.x,GY-90,'#ff5ad8',8,400);if(c.hp<=0)breakCage(c,i)}else if(hintT<=0){hintT=2.5;ftext(c.x,GY-230,'Void crystal. Claws bounce off it.','#ffd27a')}}})}
function slamAt(x){const o=ROOM;o.gates.forEach((g,i)=>{if(!g.broken&&g.kind==='blast'&&Math.abs(x-g.plate)<170)breakGate(g,i)});o.cages.forEach((c,i)=>{if(!c.broken&&c.kind==='slam'&&Math.abs(x-c.x)<220)breakCage(c,i)})}
function slamLand(p,y){p.slam=0;shake=Math.max(shake,14);sfxSlam();buzz(35);ring(p.x,y-10,'#ffb347',300);dust(p.x,y);dust(p.x+60,y);dust(p.x-60,y);
  for(let i=0;i<16;i++)parts.push({x:p.x+(Math.random()-.5)*300,y:y-6,vx:(Math.random()-.5)*500,vy:-300-Math.random()*400,life:.6,max:.6,col:'#ffb347',sz:6,g:1500});
  for(const e of en)if(!e.fly&&Math.abs(e.x-p.x)<280&&Math.abs(e.y-y)<60){damage(e,32*pdm(),Math.sign(e.x-p.x)*700);e.state='walk';e.t=1}
  if(boss&&!boss.dead&&Math.abs(boss.x-p.x)<300)damage(boss,40*pdm(),0);slamAt(p.x)}
function grantAbility(id){const A=ABIL.find(a=>a.id===id);META.ab[id]=1;saveMeta();hitStop=.45;shake=10;buzz([40,30,80]);sfxItemGet();
  for(let i=0;i<3;i++)ring(pl.x,pl.y-100,A.col,180+i*90);burst(pl.x,pl.y-100,A.col,40,900);showBanner(A.name+' acquired',A.how,4.2);padAbilities()}
function useStation(st){st.t=8;const p=pl;p.hp=p.max;p.en=Math.max(p.en,50);META.save={room:ROOM.id,x:st.x,score:G.score};saveMeta();sfxSave();
  ring(st.x,GY-110,'#7dffb0',200);showBanner('Progress saved','Health restored',1.6)}
function padAbilities(){const d=document.querySelector('.act.dsh'),s=document.querySelector('.act.sp');if(d)d.hidden=!hasAb('dash');if(s)s.hidden=!hasAb('roar')}
function newRun(){META=freshMeta();META.save={room:'0-0',x:210,score:0};saveMeta();G.score=0;G.lives=3;G.lv=-1;startGame('0-0',{x:300,y:GY})}
function startGame(room,how){pl=newPlayer();lvT=0;hitStop=0;shake=0;doneT=0;G.respawnT=0;TRANS.on=0;enterRoom(room,how);pl.max=maxHP();pl.hp=pl.max;
  G.state='play';G.paused=false;hideCard();padShow(true);clearInput();showBanner(LV[G.lv].ch,LV[G.lv].name,2.4);musicFor()}
function continueGame(){const s=META.save;if(!s)return newRun();G.lives=3;G.score=s.score||0;G.lv=-1;startGame(s.room,{x:s.x+90,y:GY})}
function areaIntro(prev,a){G.state='card';padShow(false);clearInput();const clr=prev>=0&&prev<a&&STORY.clear[prev]?`<p>${STORY.clear[prev]}</p>`:'';
  showCard({ey:LV[a].ch,h:LV[a].name,b:clr+STORY.brief[a],btns:[['Onward',()=>{G.state='play';hideCard();padShow(true);showBanner(LV[a].ch,LV[a].name,2.2);musicFor()}]]})}
</script>
