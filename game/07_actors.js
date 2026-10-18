<script>
"use strict";
/* ---------- actors: Tyko, the robot cast, combat, the boss, shots, hazards, pickups and crates ---------- */
function newPlayer(){const mh=maxHP();return{x:300,y:GY,vx:0,vy:0,face:1,hp:mh,max:mh,slam:0,dropT:0,sup:GY,en:30,ground:true,jumps:0,atk:0,atkCD:0,combo:0,comboT:0,inv:0,hurtT:0,hitDone:new Set(),run:0,dashT:0,dashCD:0,squash:0,landT:0,dead:0,deadT:0,shield:0,shieldT:0,fury:0,hits:0,hitsT:0,ghostT:0}}
const ETYPES={
 g:{w:80,h:165,hp:42,spd:260,dmg:10,score:100},
 b:{w:140,h:270,hp:130,spd:150,dmg:22,score:300,heavy:true},
 d:{w:70,h:70,hp:28,spd:0,dmg:8,score:150,fly:true},
 c:{w:80,h:160,hp:55,spd:0,dmg:9,score:250},
 B:{w:170,h:320,hp:420,spd:125,dmg:24,score:1500,heavy:true},
 h:{w:130,h:100,hp:45,spd:520,dmg:12,score:120},
 t:{w:90,h:90,hp:40,spd:0,dmg:9,score:200,fly:true}
};
const pdm=()=>(pl&&pl.fury>0?2:1)*(hasAb('plasma')?1.3:1)*(1+.1*fangCount())*(hasR('fury')&&pl&&pl.hp<pl.max*.3?1.3:1);
const reachOf=b=>b*(hasR('reach')?1.3:1);
function spawnEnemy(type,side,quiet){const T=ETYPES[type];let x=side<0?cam-120:cam+W+120;
  for(const s of solidRects()){const gx=s.x+s.w/2;if(Math.sign(x-gx)!==Math.sign(pl.x-gx))x=gx+Math.sign(pl.x-gx)*(s.w/2+90)}
  x=clamp(x,80,RW-80);
  const e={type,x,y:T.fly?FY-360+Math.random()*130:FY,w:T.w,h:T.h,hp:T.hp*dm(),max:T.hp*dm(),vx:0,vy:0,face:-side,state:'walk',t:.6+Math.random()*.8,flash:0,seed:Math.random()*10,heavy:T.heavy,fly:T.fly,hy:0,score:T.score};
  e.hy=e.y;if(type==='c'){e.x=side<0?cam+260:cam+W-RSAFE-60;e.y=FY;e.fade=1;e.t=1.2;
    for(const g of solidRects()){const gx=g.x+g.w/2;if(Math.sign(e.x-gx)!==Math.sign(pl.x-gx))e.x=pl.x+(pl.x<gx?-1:1)*Math.max(200,Math.min(520,Math.abs(pl.x-gx)-80))}e.x=clamp(e.x,80,RW-80)}
  if(!T.fly&&type!=='c')eBody(e);
  en.push(e);if(!quiet){burst(e.x,e.y-e.h/2,'#ff4fd8',14);teleFx(e.x,e.y,e.h);sfxEnemy('spawn',e)}
  if(type==='B'){showBanner('Iron Warden','Elite · jump its shockwaves',1.8);sfxEnemy('elite',e);shake=12}return e}
function spawnWave(list){list.forEach((t,i)=>spawnQ.push({t:i*.55,type:t,side:i%2?-1:1}))}

/* ---------- combat ---------- */
function damage(e,d,kb){if(e.dead)return;if(e.guard!=null){d=guardHit(e,d);if(!d)return}d=Math.round(d);e.hp-=d;e.flash=.14;if(!e.isBoss)e.vx+=kb*(e.heavy?.35:1);
  if(pl){pl.hits++;pl.hitsT=1.8}const hy=e.y-e.h*.55;
  ftext(e.x,e.y-e.h-10,d,d>=30?'#ffd27a':'#fff',d>=30);burst(e.x,hy,'#ffd27a',6,500);sparks(e.x,hy,'#fff3c4',9,Math.sign(kb)||1);ring(e.x,hy,'#ffd27a',d>=30?140:90);sfxHit(d,e);buzz(8);hitStop=d>=30?.06:.035;if(d>=30)camKick(.018);
  if(e.hp<=0){if(e.isBoss){if(e.guard!=null)guardianDown(e);else killBoss();return}
    e.dead=true;G.score+=e.score*(1+Math.min(4,Math.floor((pl?pl.hits:0)/10)));addDust(e.type==='B'?10:e.heavy?3:1);if(pl&&hasR('siphon'))pl.hp=Math.min(pl.max,pl.hp+3);burst(e.x,e.y-e.h/2,'#ff4fd8',30,850);ring(e.x,e.y-e.h/2,'#ff4fd8',180);souls(e.x,e.y-e.h/2);sfxEnemyDie(e);buzz(14);shake=Math.max(shake,7);
    explode(e);dropFrom(e)}}
function hurtPlayer(d,kx){const p=pl;if(p.inv>0||p.dead||G.state!=='play')return;
  if(p.shield>0){p.shield--;p.inv=.6;ring(p.x,p.y-95,'#8fc8ff',170);burst(p.x,p.y-95,'#8fc8ff',14,500);sfxBlock();buzz(15);ftext(p.x,p.y-200,'Blocked','#8fc8ff');return}
  if(hasR('stone'))d*=.8;d=Math.round(d);p.hp-=d;p.inv=.9;if(hasR('thorn')){ring(p.x,p.y-90,'#ff8a8a',260);for(const e of allTargets())if(Math.abs(e.x-p.x)<260&&Math.abs(e.y-p.y)<300)damage(e,40,Math.sign(e.x-p.x)*600)}p.hurtT=.28;p.vx=kx;p.vy=-420;p.ground=false;p.atk=0;
  shake=14;flashT=.18;sfxHurt(d);buzz(45);p.hits=0;ftext(p.x,p.y-170,d,'#ff3d6e');burst(p.x,p.y-80,'#ff3d6e',12);
  if(p.hp<=0){p.hp=0;if(G.lives>0){G.lives--;p.dead=1;p.deadT=0;p.vx=0;p.inv=99;G.respawnT=1.8;buzz([60,40,60]);sfxPlayerDown()}else gameOver()}}

/* input and intent; the physics step then moves the body */
function updPlayerPre(dt){const p=pl;p._wg=p.ground;
  if(p.dead){p.vx=0;p.deadT+=0;return}
  p.fury=Math.max(0,p.fury-dt);if(p.shield>0){p.shieldT-=dt;if(p.shieldT<=0)p.shield=0}
  p.inv=Math.max(0,p.inv-dt);p.atkCD-=dt;p.armCD=(p.armCD||0)-dt;p.aegis=Math.max(0,(p.aegis||0)-dt);if(P.armc)cycleArm();if(P.arm&&p.armCD<=0&&p.hurtT<=0)fireArm(p);p.comboT-=dt;p.hurtT-=dt;p.dashCD-=dt;p.squash=Math.max(0,p.squash-dt*5);p.landT-=dt;
  p.hitsT-=dt;if(p.hitsT<=0)p.hits=0;
  let ax=0;if(p.hurtT<=0){if(K.left)ax-=1;if(K.right)ax+=1}
  if(p.atk>0){p.atk-=dt;ax*=.25}
  if(ax&&p.atk<=0)p.face=Math.sign(ax);
  if(p.hurtT<=0){const tgt=ax*640;p.vx+=(tgt-p.vx)*Math.min(1,dt*(p.ground?14:7))}
  p.dropT-=dt;if(P.down&&p.ground&&onPlatform(p)){p.dropT=.28;p.ground=false;p.vy=120}
  if(P.attack&&!p.ground&&K.down&&hasAb('slam')&&!p.slam&&p.hurtT<=0){p.slam=1;p.vy=2600;p.vx*=.3;p.atk=0;delete P.attack;sfxSlamStart();ring(p.x,p.y-90,'#ffb347',120)}
  if(P.jump&&p.hurtT<=0){if(p.ground){p.vy=-1300;p.ground=false;p.jumps=1;sfxJump(1);dust(p.x,p.y)}
    else if(p.jumps<2&&hasAb('double')){p.vy=-1100;p.jumps=2;sfxJump(2);burst(p.x,p.y-40,'#5ce1ff',12,350);ring(p.x,p.y-20,'#5ce1ff',90)}}
  if(P.attack&&p.atkCD<=0&&p.hurtT<=0){p.combo=p.comboT>0?(p.combo%3)+1:1;p.comboT=.6;p.atk=.22;p.atkCD=(p.combo===3?.36:.17)*(hasR('swift')?.75:1);p.hitDone=new Set();sfxSwing(p.combo);
    p.vx+=p.face*(p.combo===3?420:160);if(!p.ground)p.vy=Math.min(p.vy,-180)}
  if(P.dash&&hasAb('dash')&&p.dashCD<=0&&p.hurtT<=0){const dir=ax?Math.sign(ax):p.face;p.face=dir;p.dashT=.19;p.dashCD=hasR('comet')?.38:.75;p.dashHit=new Set();p.inv=Math.max(p.inv,.26);p.atk=0;
    sfxDash();buzz(10);if(p.ground)dust(p.x,p.y);burst(p.x,p.y-80,'#b48cff',10,420)}
  if(p.dashT>0){p.dashT-=dt;p.vx=p.face*(p.thr?2000:1750);p.vy=Math.min(p.vy,0)*.5;p.ghostT-=dt;if(p.ghostT<=0){p.ghostT=.03;ghost(p)}if(p.thr)part(p.x-p.face*40,p.y-80+(Math.random()-.5)*80,-p.face*300,-80,.35,'#ff9638',18,0,'glow');if(p.dashT<=0)p.thr=0}
  if(P.special&&hasAb('roar')&&p.en>=50&&p.hurtT<=0){p.en-=50;shots.push({x:p.x+p.face*70,y:p.y-85,vx:p.face*1600,vy:0,r:70,dmg:48*pdm(),friend:true,life:.85,pierce:true,hit:new Set(),col:'#5ce1ff',wave:true});
    sfxRoar();buzz(30);shake=10;burst(p.x+p.face*60,p.y-85,'#5ce1ff',20,700);ring(p.x+p.face*60,p.y-85,'#5ce1ff',220)}
  p._vy=p.vy}
/* after the physics step: landing, slam, camera clamps, claw hits */
function updPlayerPost(dt){const p=pl;
  if(p.ground&&!p._wg&&!p.dead){if(p._vy>700){dust(p.x,p.y);p.squash=1}if(!p.slam)sfxLand(p._vy);p.landT=.15;p.jumps=0;if(p.slam)slamLand(p,p.y)}
  if(p.ground)p.jumps=0;
  p.sup=surfaceBelow(p.x,p.y);
  let mn=-120,mx=RW+120;if(lock){mn=cam+60;mx=cam+W-(touchy?RSAFE+80:60)}
  if(p.x<mn||p.x>mx){const nx=clamp(p.x,mn,mx);PHY.pb.x=nx-42;p.x=nx;PHY.pb.velocity.x=0;p.vx=0}
  p.run+=Math.abs(p.vx)*dt*.02;
  if(p.dead)return;
  if(p.dashT>0&&(p.thr||hasR('comet'))){const bx={x:p.x-90,y:p.y-170,w:180,h:170},hs=p.thr?p.thrHit:p.dashHit;if(hs)for(const e of allTargets())if(!hs.has(e)&&overlap(bx,ebox(e))){hs.add(e);damage(e,(p.thr?30:18)*pdm(),p.face*500)}}
  if(p.atk>0&&p.atk<.18){const reach=reachOf(p.combo===3?240:180),box={x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190};
    for(const e of allTargets())if(!p.hitDone.has(e)&&overlap(box,ebox(e))){p.hitDone.add(e);
      damage(e,(p.combo===3?26:14)*(1+G.lv*.06)*pdm(),p.face*(p.combo===3?750:260));p.en=Math.min(100,p.en+(p.combo===3?9:6)*AG())}
    hitBoxesWith(box,p.hitDone);if(!p.hitDone.has('geo')){p.hitDone.add('geo');clawGeo(box)}}}
const allTargets=()=>boss&&!boss.dead&&boss.state!=='enter'?en.concat([boss]):en;

function updEnemy(e,dt){const dx=pl.x-e.x,ad=Math.abs(dx);e.flash-=dt;e.t-=dt;
  if(e.type==='t')return updTurret(e,dt);
  if(e.type==='d'){e.face=Math.sign(dx)||1;
    let tx=pl.x-e.face*440+Math.sin(lvT*1.3+e.seed)*90;const ty=e.hy+Math.sin(lvT*2.2+e.seed)*45;
    if(lock){if(pl.x-cam>W-RSAFE-300)tx=pl.x-440;tx=Math.max(cam+140,Math.min(cam+W-RSAFE,tx))}
    e.vx+=(tx-e.x)*dt*2.4;e.vx*=Math.pow(.15,dt);e.x+=e.vx*dt;gateClamp(e);e.y+=(ty-e.y)*Math.min(1,dt*2);
    if(e.t<=0&&(ad>1500||Math.abs(pl.y-e.y)>750))e.t=.5;
    if(e.t<=0){e.t=Math.max(1.4,2.8-G.lv*.25);const a=Math.atan2(pl.y-80-(e.y-35),pl.x-e.x),v=560+G.lv*30;
      shots.push({x:e.x,y:e.y-35,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:15,dmg:ETYPES.d.dmg*dm(),life:3.2,col:'#ff8a3a'});sfxEnemy('shot',e);muzzle(e.x,e.y-35,'#ff8a3a')}
    return}
  if(e.type==='c'){e.face=Math.sign(dx)||1;e.fade=Math.max(0,(e.fade||0)-dt*2);e.x+=e.vx*dt;gateClamp(e);e.vx*=Math.pow(.02,dt);
    if(ad<260&&e.t<.8&&!e.tp){e.tp=.35;burst(e.x,e.y-80,'#b48cff',18)}
    if(e.tp){e.tp-=dt;if(e.tp<=0){e.tp=0;const side=pl.x-cam>W/2?-1:1;e.x=pl.x+side*(520+Math.random()*200);e.x=Math.max(cam+160,Math.min(cam+W-RSAFE-40,e.x));for(const g of solidRects()){const gx=g.x+g.w/2;if(Math.sign(e.x-gx)!==Math.sign(pl.x-gx))e.x=pl.x+(pl.x<gx?-1:1)*Math.min(520,Math.abs(pl.x-gx)-60);}gateClamp(e);e.fade=1;e.t=1;teleFx(e.x,e.y,e.h)}}
    else if(e.t<=0&&ad<1500&&Math.abs(pl.y-e.y)<600){e.t=Math.max(1.6,2.8-G.lv*.15);const a0=Math.atan2(pl.y-90-(e.y-120),dx);
      for(let k=-1;k<=1;k++){const a=a0+k*.22;shots.push({x:e.x+e.face*40,y:e.y-120,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:17,dmg:ETYPES.c.dmg*dm(),life:3,col:'#b48cff'})}sfxEnemy('shot',e);muzzle(e.x+e.face*60,e.y-120,'#b48cff')}
    return}
  if(e.type==='h'){if(e.state!=='leap')e.face=Math.sign(dx)||1;
    if(e.state==='walk'){if(ad>280)e.vx+=(e.face*520*(1+G.lv*.04)-e.vx)*Math.min(1,dt*6);else{e.vx*=Math.pow(.02,dt);if(e.t<=0){e.state='wind';e.t=.26+Math.random()*.16}}}
    else if(e.state==='wind'){e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='leap';e.t=.36;e.vx=e.face*1150;e.hitP=false;sfxEnemy('leap',e);if(e.body)e.body.velocity.y=-380}}
    else if(e.state==='leap'){if(!e.hitP&&overlap(ebox(e),pbox())){e.hitP=true;hurtPlayer(ETYPES.h.dmg*dm(),e.face*520)}e.vx*=Math.pow(.25,dt);if(e.t<=0){e.state='walk';e.t=.5+Math.random()*.4}}
    return}
  const T=ETYPES[e.type],hv=e.type==='b'||e.type==='B',range=e.type==='B'?240:hv?200:130;
  if(e.state==='walk'){e.face=Math.sign(dx)||1;
    if(ad>range)e.vx+=(e.face*T.spd*(1+G.lv*.05)-e.vx)*Math.min(1,dt*5);else{e.vx*=Math.pow(.01,dt);if(e.t<=0){e.state='wind';e.t=e.type==='B'?.75:hv?.62:.42}}}
  else if(e.state==='wind'){e.vx*=Math.pow(.01,dt);if(e.t<=0){if(!hv)sfxEnemy('swipe',e);e.state='swing';e.t=.2;e.hitP=false;e.vx+=e.face*(hv?120:260);if(hv){shake=Math.max(shake,8);dust(e.x+e.face*120,e.y);sfxEnemy('smash',e)}
      if(e.type==='B'){for(const d of[-1,1])hz.push({kind:'quake',x:e.x+d*90,dir:d,v:820,t:0,act:1.5});shake=16}}}
  else if(e.state==='swing'){if(!e.hitP){const reach=e.type==='B'?270:hv?230:150,box={x:e.face>0?e.x:e.x-reach,y:e.y-e.h,w:reach,h:e.h};
      if(overlap(box,pbox())){e.hitP=true;hurtPlayer(T.dmg*dm(),e.face*(hv?900:450))}}
    if(e.t<=0){e.state='walk';e.t=(e.type==='B'?1.6:hv?1.3:.8)+Math.random()*.7}}
  if(e.state!=='walk')e.vx*=Math.pow(.05,dt)}
/* wall turret: swivels toward Tyko, paints him with a laser sight, then fires a three-shot burst. Swipe the shots back at it */
function updTurret(e,dt){if(!e.wall){e.wall=e.x<RW/2?1:-1;e.t=1.4}e.face=e.wall;e.x=e.wall>0?78:RW-78;e.y=e.hy;e.vx=0;
  const px=e.x+e.wall*22,py=e.y-45,tx=pl.x,ty=pl.y-90,ldx=(tx-px)*e.wall,seen=!pl.dead&&ldx>60&&ldx<1800&&Math.abs(ty-py)<760;
  const want=seen?clamp(Math.atan2(ty-py,ldx),-1.25,1.25):.35+Math.sin(lvT*.8+e.seed)*.3;e.la=e.la==null?want:e.la+clamp(want-e.la,-2.6*dt,2.6*dt);
  const wa=e.wall>0?e.la:Math.PI-e.la,c=Math.cos(wa),s=Math.sin(wa),mx=px+c*62,my=py+s*62;
  if(e.n>0){e.fire-=dt;if(e.fire<=0){e.fire=.15;e.n--;const v=640+G.lv*30;shots.push({x:mx,y:my,vx:c*v,vy:s*v,r:13,dmg:ETYPES.t.dmg*dm(),life:3,col:'#ff5a3a'});sfxEnemy('shot',e);muzzle(mx,my,'#ff5a3a');if(e.n<=0)e.t=2.6}return}
  if(!seen){e.t=Math.max(e.t,.9);return}
  if(e.t<.7){if(!e.beep){e.beep=1;sfxEnemy('lock',e)}}else e.beep=0;
  if(e.t<.7)OV.lines.push([mx,my,mx+c*1700,my+s*1700,e.t<.25?.85:.35]);
  if(e.t<=0){e.n=3;e.fire=0}}
/* body robots: hand velocity to physics, read position back */
function ePush(e){if(e.body)e.body.velocity.x=e.vx}
function ePull(e){if(!e.body)return;const b=e.body;e.x=b.x+e.w/2;e.y=b.y+e.h;e.vx=b.velocity.x;
  /* once on screen during a wave, ground robots stay out of the strip under the touch buttons */
  if(lock&&touchy){const lim=cam+W-RSAFE+40;if(e.x<lim)e.in=1;if(e.in&&e.x>lim){e.x=lim;b.x=lim-e.w/2;if(b.velocity.x>0)b.velocity.x=0}}}

/* ---------- boss: Malakar, the Void Sovereign ---------- */
const arenaCam=()=>Math.max(0,RW-W);
function startBoss(){lock=true;S.boom();sfxBossRoar();shake=16;const ac=arenaCam();
  boss={isBoss:true,x:ac+W-RSAFE-160,y:GY,w:200,h:420,hp:META.hard?5000:3600,max:META.hard?5000:3600,seed:0,face:-1,state:'enter',t:2.6,flash:0,vx:0,phase:1,dy:-800,hov:0,last:'',fire:0,left:0};
  showBanner('Malakar','The Void Sovereign',2.6);musicFor()}
function bclamp(x){return Math.max(cam+220,Math.min(cam+W-RSAFE-110,x))}
function chooseAttack(b){let o=['dash','barrage','rift','slash'];if(b.phase>=2)o.push('beam','beam','summon');
  o=o.filter(a=>a!==b.last);let a=o[Math.floor(Math.random()*o.length)];if(a==='summon'&&en.length>=2)a='barrage';b.last=a;
  const k=b.phase===3?.6:.85;
  if(a==='dash'){b.state='dashWind';b.t=.7*k;b.dash2=false;S.warn()}
  else if(a==='barrage'){b.state='barrage';b.left=b.phase>1?16:10;b.fire=0;b.spin=Math.random()*6}
  else if(a==='rift'){b.state='cast';b.t=.6;const xs=[pl.x,pl.x-300,pl.x+300];if(b.phase===3)xs.push(pl.x-600,pl.x+600);
    xs.forEach((x,i)=>hz.push({kind:'pillar',x:bclamp(x),t:.9+i*.08,act:.45,w:160}));S.warn()}
  else if(a==='beam'){b.state='cast';b.t=1.2;const low=Math.random()<.5;hz.push({kind:'beam',y:low?GY-60:GY-215,low,t:1.05*k+.2,act:.6});S.warn()}
  else if(a==='slash'){b.state='slashWind';b.t=.6*k;b.sl2=0;S.warn()}
  else if(a==='summon'){b.state='cast';b.t=.9;spawnEnemy('d',-1);spawnEnemy('d',1);if(b.phase===3)spawnEnemy('c',1)}}
function updBoss(b,dt){if(b.guard!=null)return updGuardian(b,dt);b.flash-=dt;b.t-=dt;
  const r=b.hp/b.max,ph=r<.25?3:r<.55?2:1;
  if(ph!==b.phase&&b.state!=='enter'){b.phase=ph;if(ph===2&&META.sable&&!G.rush)setTimeout(()=>{if(boss&&!boss.dead&&G.state==='play'){allyJoin('boss');if(ally){ally.line='Malakar! You owe me a soul.';ally.lt=3}}},1400);showBanner(ph===2?'Malakar Unleashed':'The Void Consumes',ph===2?'He calls the Hollowed to his side':'Final phase',1.8);
    shake=22;S.boom();sfxBossRoar();camKick(.05);b.state='idle';b.t=1.2;burst(b.x,b.y-170,'#ff3d6e',40,1000);ring(b.x,b.y-170,'#ff3d6e',400);hz=hz.filter(h=>h.kind!=='beam')}
  if(b.state==='enter'){b.dy+=(0-b.dy)*Math.min(1,dt*2.2);if(b.t<=0){b.state='idle';b.t=1;b.dy=0}return}
  b.hov=Math.sin(lvT*2)*16;
  if(b.state!=='dash')b.face=Math.sign(pl.x-b.x)||-1;
  const k=b.phase===3?.6:.85;
  b.mv=0;
  if(b.state==='idle'){let side=b.x>pl.x?1:-1,tx=bclamp(pl.x+side*520);if(Math.abs(tx-pl.x)<320)tx=bclamp(pl.x-side*520);const mv=(tx-b.x)*Math.min(1,dt*1.3);b.x+=mv;b.mv=mv/Math.max(dt,1e-3);if(b.t<=0)chooseAttack(b)}
  else if(b.state==='dashWind'){if(Math.random()<.5)burst(b.x,b.y-160,'#ff3d6e',2,300);if(b.t<=0){b.state='dash';b.t=.95;b.vx=b.face*2000;S.boom();b.hitP=false}}
  else if(b.state==='dash'){b.x+=b.vx*dt;part(b.x,b.y-150+(Math.random()-.5)*200,-b.vx*.1,0,.3,'#ff3d6e',10,0);
    if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(28,b.face*1000)}
    if(b.t<=0||b.x<cam+180||b.x>cam+W-RSAFE-110){b.x=bclamp(b.x);shake=10;
      if(b.phase===3&&!b.dash2){b.dash2=true;b.face*=-1;b.state='dashWind';b.t=.35}else{b.state='idle';b.t=1.1*k}}}
  else if(b.state==='barrage'){b.fire-=dt;if(b.fire<=0){b.fire=.1;b.left--;const a0=Math.atan2(pl.y-90-(b.y-260),pl.x-b.x);
      const a=a0+Math.sin(b.spin+b.left*.7)*.55;shots.push({x:b.x+b.face*60,y:b.y-260+b.hov,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:20,dmg:14,life:3.5,col:'#ff3d6e'});S.shot();
      if(b.left<=0){b.state='idle';b.t=1.2*k}}}
  else if(b.state==='cast'){if(b.t<=0){b.state='idle';b.t=1*k}}
  else if(b.state==='slashWind'){if(b.t<=0){b.state='slash';b.t=.55;malSlash(b)}}
  else if(b.state==='slash'){if(b.phase===3&&!b.sl2&&b.t<.25){b.sl2=1;malSlash(b)}if(b.t<=0){b.state='idle';b.t=1.1*k}}
  if(b.state!=='dash'&&b.state!=='idle'&&overlap(ebox(b),pbox()))hurtPlayer(5,(pl.x<b.x?-1:1)*800)}
/* a crescent of void energy that skims the floor: jump it, or swipe it back */
function malSlash(b){shots.push({x:b.x+b.face*130,y:GY-70,vx:b.face*950,vy:0,r:46,dmg:20,life:3,col:'#e030c0',cres:1});S.boom();shake=Math.max(shake,8);sfxEnemy('swipe',b);ring(b.x+b.face*130,GY-90,'#e030c0',160)}
function killBoss(){const b=boss;b.dead=true;bossDone=true;G.score+=10000;shake=30;S.boom();hz=[];shots=shots.filter(s=>s.friend);
  for(const e of en){e.dead=true;burst(e.x,e.y-e.h/2,'#ff4fd8',20);eKill(e)}en=[];spawnQ=[];
  for(let i=0;i<6;i++)setTimeout(()=>{burst(b.x+(Math.random()-.5)*220,b.y-Math.random()*330,i%2?'#ff3d6e':'#5ce1ff',40,1100);souls(b.x,b.y-170);S.boom();shake=20},i*280);
  showBanner('Malakar Falls','',3);doneT=3.4;camKick(.07);sfxBossDie();musicStop(2.5)}

/* ---------- shots and hazards ---------- */
const circleBox=(s,b)=>{const cx=Math.max(b.x,Math.min(s.x,b.x+b.w)),cy=Math.max(b.y,Math.min(s.y,b.y+b.h));return(s.x-cx)**2+(s.y-cy)**2<s.r*s.r};
function atkBox(){const p=pl;if(!(p.atk>0))return null;const reach=reachOf(p.combo===3?240:180);return{x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190}}
function inSolid(x,y){if(!ROOM)return false;for(const s of ROOM.solids)if(x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h)return true;for(const s of solidRects())if(x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h)return true;return false}
function updShots(dt){const ab=atkBox();
  for(const s of shots){if(s.g)s.vy+=s.g*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(s.boom&&s.vy>0&&s.y>FY-26){s.life=0;slagBoom(s);continue}
    if(!s.friend&&pl&&pl.aegis>0&&Math.abs(s.y-(pl.y-90))<140&&(s.x-pl.x)*pl.face>-20&&(s.x-pl.x)*pl.face<170){s.life=0;sparks(s.x,s.y,'#ffcc4a',8,pl.face);sfxDeflect();continue}
    if(s.g&&!s.friend&&s.vy>0&&s.y>FY-26){s.life=0;if(s.puddle){hz.push({kind:'fire',x:s.x,t:0,act:2.6,w:150});burst(s.x,FY-20,'#ff6418',14,600);sfxCrate(1)}else burst(s.x,FY-10,s.col,6,300);continue}
    if(!s.friend&&ab&&circleBox(s,ab)){s.friend=true;s.vx=pl.face*Math.abs(s.vx)*1.5+pl.face*200;s.vy*=-.4;s.hit=new Set();s.dmg*=2.2;s.col='#5ce1ff';s.life=1.5;sfxDeflect();ftext(s.x,s.y-30,'Deflect','#5ce1ff');ring(s.x,s.y,'#5ce1ff',80);pl.en=Math.min(100,pl.en+8);continue}
    if(s.friend){hitBoxesWith({x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2},s.hit);for(const e of allTargets()){if(s.hit.has(e))continue;if(circleBox(s,ebox(e))){s.hit.add(e);damage(e,s.dmg*(1+G.lv*.05),Math.sign(s.vx)*500);if(!s.pierce){s.life=0;if(s.boom)slagBoom(s);break}}}}
    else if(circleBox(s,pbox())){hurtPlayer(s.dmg,Math.sign(s.vx)*380);s.life=0;burst(s.x,s.y,s.col,10)}
    if(!s.wave&&inSolid(s.x,s.y)){s.life=0;burst(s.x,s.y,s.col,6,300);sfxFizz()}
    if(s.x<cam-300||s.x>cam+W+300||s.y<camY-300||s.y>camY+H+300)s.life=0;
    if(Math.random()<.4)part(s.x,s.y,0,0,.25,s.col,s.wave?14:6,0)}
  shots=shots.filter(s=>s.life>0)}
function updHz(dt){for(const h of hz){if(h.kind==='quake'){updQuake(h,dt);continue}
    if(h.kind==='fire'){h.act-=dt;if(Math.random()<.35)part(h.x+(Math.random()-.5)*h.w,FY-6,(Math.random()-.5)*40,-160-Math.random()*120,.5,'#ff9638',10,-200,'glow');
      h.hitT=(h.hitT||0)-dt;if(h.hitT<=0&&!pl.dead&&pl.ground&&pl.y>FY-10&&Math.abs(pl.x-h.x)<h.w/2+20){h.hitT=.8;hurtPlayer(10*dm(),(pl.x<h.x?-1:1)*300)}continue}if(h.t>0){h.t-=dt;if(h.t<=0){if(h.kind==='rock'){sfxCrate(1);shake=Math.max(shake,7);burst(h.x,FY-20,'#c8b8a0',14,600);debris(h.x,FY-60,'crate');
        if(!pl.dead&&Math.abs(pl.x-h.x)<85)hurtPlayer(16*dm(),(pl.x<h.x?-1:1)*500);continue}S.boom();shake=Math.max(shake,h.kind==='beam'?14:9);if(h.kind==='pillar')burst(h.x,GY,'#ff3d6e',24,900)}continue}
    if(h.kind==='rock'){h.act-=dt;continue}
    h.act-=dt;if(h.hitP)continue;const pb=pbox();
    if(h.kind==='pillar'&&Math.abs(pl.x-h.x)<h.w/2+30){h.hitP=true;hurtPlayer(22,(pl.x<h.x?-1:1)*600)}
    if(h.kind==='beam'&&pb.y<h.y+38&&pb.y+pb.h>h.y-38){h.hitP=true;hurtPlayer(26,(pl.x<cam+W/2?-1:1)*500)}}
  hz=hz.filter(h=>h.t>0||h.act>0)}
/* elite shockwaves travel along the floor; jump over them */
function updQuake(h,dt){h.x+=h.dir*h.v*dt;h.act-=dt;if(Math.random()<.6)part(h.x,FY-4,(Math.random()-.5)*120,-200-Math.random()*200,.4,'#ffb347',6,900);
  if(!h.hitP&&pl&&!pl.dead&&pl.y>FY-60&&Math.abs(pl.x-h.x)<55){h.hitP=1;hurtPlayer(15*dm(),h.dir*650)}}

/* ---------- pickups and supply crates ---------- */
let boxes=[];
function rollDrop(r){const v=r();return v<.3?'fruit':v<.54?'shard':v<.7?'coin':v<.8?'fang':v<.9?'shield':'med'}
function dropFrom(e){const r=Math.random,big=e.type==='b'||e.type==='B';
  const pop=t=>picks.push({x:e.x,y:e.y-e.h/2,vx:(r()-.5)*360,vy:-650,type:t,life:12});
  if(e.type==='B'){pop('med');pop('shard');pop(r()<.5?'fang':'shield');return}
  if(big){pop(r()<.7?'fruit':'med');if(r()<.4)pop('shard');return}
  const v=r();if(v<.18)pop('fruit');else if(v<.36)pop('shard');else if(v<.48)pop('coin')}
function applyPick(k){const p=pl,Pk=PICK[k.type];sfxPick(k.type);buzz(12);
  if(k.type==='fruit')p.hp=Math.min(p.max,p.hp+25);else if(k.type==='med')p.hp=Math.min(p.max,p.hp+60);
  else if(k.type==='shard')p.en=Math.min(100,p.en+35);else if(k.type==='shield'){p.shield=3;p.shieldT=14}else if(k.type==='fang')p.fury=hasR('fury')?20:10;
  else if(k.type==='coin'){G.score+=250;addDust(2)}else if(k.type==='tank'){META.tanks[k.id]=1;saveMeta();p.max=maxHP();p.hp=p.max;buzz([30,30,60]);hitStop=.25}
  else if(k.type==='egg'){G.lives=Math.min(5,G.lives+1);if(k.id){META.items[k.id]=1;saveMeta()}}
  else if(k.type==='core'){if(k.id){META.items[k.id]=1;saveMeta()}hitStop=.3;buzz([30,30,60]);p.en=100}
  else if(k.type==='sfang'){if(k.id){META.items[k.id]=1;saveMeta()}hitStop=.3;buzz([30,30,60]);sfxItemGet();for(let i=0;i<3;i++)ring(p.x,p.y-100,'#ff7a5a',160+i*80)}
  else if(k.type==='lore'){if(k.id){META.items[k.id]=1;saveMeta()}setTimeout(()=>showLore(G.lv),350)}
  ftext(p.x,p.y-200,Pk.txt,Pk.col,k.type==='egg'||k.type==='tank'||k.type==='core'||k.type==='sfang');ring(k.x,k.y,Pk.col,90);burst(k.x,k.y,Pk.col,10,380);if(k.type!=='coin')sparkle(k.x,k.y,Pk.col)}
function updPicks(dt){const mag=pl&&!pl.dead&&hasR('lode');for(const k of picks){if(mag&&!(k.cage&&!k.cage.broken)&&k.type!=='lore'){const dx=pl.x-k.x,dy=pl.y-90-k.y,dd=Math.hypot(dx,dy);if(dd<520&&dd>10){k.x+=dx/dd*Math.min(dd,900*dt);k.y+=dy/dd*Math.min(dd,900*dt)}}if(!k.float){k.vy+=1800*dt;k.x+=(k.vx||0)*dt;k.vx=(k.vx||0)*Math.pow(.2,dt);k.y+=k.vy*dt;k.x=clamp(k.x,80,RW-80);const sf=surfaceBelow(k.x,k.y)-26;if(k.y>sf){k.y=sf;k.vy=0}k.life-=dt}
    if(k.cage&&!k.cage.broken)continue;
    if(pl&&!pl.dead&&Math.abs(pl.x-k.x)<72&&Math.abs(pl.y-90-k.y)<125){k.life=0;k.got=1;applyPick(k)}}
  picks=picks.filter(k=>k.float?!k.got:k.life>0)}
function boxRect(b){return{x:b.x-56,y:FY-98,w:112,h:98}}
function hitBox(b){if(b.hp<=0)return;b.hp--;b.flash=.12;sfxCrate(0);burst(b.x,FY-50,'#ffd27a',8,450);sparks(b.x,FY-50,'#fff3c4',6,Math.sign(b.x-pl.x)||1);
  if(b.hp<=0){shake=Math.max(shake,5);burst(b.x,FY-50,PAL[LV[G.lv].theme].metal,22,700);debris(b.x,FY-90,'crate');ring(b.x,FY-50,'#ffd27a',140);sfxCrate(1);G.score+=50;
    for(const t of[b.drop,b.drop2])if(t)picks.push({x:b.x,y:FY-90,vx:(Math.random()-.5)*300,vy:-750,type:t,life:14})}}
function hitBoxesWith(box,done){for(const b of boxes)if(b.hp>0&&!done.has(b)&&overlap(box,boxRect(b))){done.add(b);hitBox(b)}}
function updBoxes(dt){for(const b of boxes)b.flash-=dt;boxes=boxes.filter(b=>b.hp>0)}
</script>
