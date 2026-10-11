<script>
"use strict";
/* ---------- pickups, supply crates, lives, elite shockwaves ---------- */
const PICK={
 fruit: {name:'Star Fruit',  col:'#7dffb0',txt:'+25 HP'},
 med:   {name:'Med-Pack',    col:'#ff6a7a',txt:'+60 HP'},
 shard: {name:'Aether Shard',col:'#5ce1ff',txt:'+35 Aether'},
 shield:{name:'Shield Bubble',col:'#8fc8ff',txt:'Shield ×3'},
 fang:  {name:'Fury Fang',   col:'#ffb347',txt:'Fury: double damage'},
 coin:  {name:'Stardust',    col:'#ffd27a',txt:'+250'},
 egg:   {name:'Golden Egg',  col:'#ffe08a',txt:'+1 Life'}};
let boxes=[],supplyB=null;
const pdm=()=>pl&&pl.fury>0?2:1;
function rollDrop(r){const v=r();return v<.3?'fruit':v<.54?'shard':v<.7?'coin':v<.8?'fang':v<.9?'shield':'med'}
function populateLevel(L){boxes=[];const r=rng(L.len*17+3),ex=L.boss?L.len-W-200:L.len-320;supplyB=null;
  for(let x=760;x<ex;x+=820+r()*620){if(r()<.55)boxes.push({x,hp:2,flash:0,drop:rollDrop(r),drop2:r()<.35?rollDrop(r):null});
    else for(let k=0;k<5;k++)picks.push({x:x+k*72,y:GY-140-Math.sin(k/4*Math.PI)*170,type:'coin',float:1})}
  picks.push({x:Math.round(L.len*.5),y:GY-470,type:'egg',float:1});
  L.trig.forEach((t,i)=>{if(i>0)picks.push({x:t-260,y:GY-70,type:'fruit',float:1})})}
function dropFrom(e){const r=Math.random,big=e.type==='b'||e.type==='B';
  const pop=t=>picks.push({x:e.x,y:e.y-e.h/2,vx:(r()-.5)*360,vy:-650,type:t,life:12});
  if(e.type==='B'){pop('med');pop('shard');pop(r()<.5?'fang':'shield');return}
  if(big){pop(r()<.7?'fruit':'med');if(r()<.4)pop('shard');return}
  const v=r();if(v<.18)pop('fruit');else if(v<.36)pop('shard');else if(v<.48)pop('coin')}
function applyPick(k){const p=pl,P=PICK[k.type];S.pick();buzz(12);
  if(k.type==='fruit')p.hp=Math.min(p.max,p.hp+25);else if(k.type==='med')p.hp=Math.min(p.max,p.hp+60);
  else if(k.type==='shard')p.en=Math.min(100,p.en+35);else if(k.type==='shield'){p.shield=3;p.shieldT=14}else if(k.type==='fang')p.fury=10;
  else if(k.type==='coin')G.score+=250;else if(k.type==='egg'){G.lives=Math.min(5,G.lives+1);sfx(520,.5,'triangle',.07,520)}
  ftext(p.x,p.y-200,P.txt,P.col,k.type==='egg');ring(k.x,k.y,P.col,90);burst(k.x,k.y,P.col,10,380)}
function updPicks(dt){for(const k of picks){if(!k.float){k.vy+=1800*dt;k.x+=(k.vx||0)*dt;k.vx=(k.vx||0)*Math.pow(.2,dt);k.y+=k.vy*dt;if(k.y>GY-26){k.y=GY-26;k.vy=0}k.life-=dt}
    if(pl&&!pl.dead&&Math.abs(pl.x-k.x)<72&&Math.abs(pl.y-90-k.y)<125){k.life=0;k.got=1;applyPick(k)}}
  picks=picks.filter(k=>k.float?!k.got:k.life>0)}
function boxRect(b){return{x:b.x-56,y:GY-98,w:112,h:98}}
function hitBox(b){if(b.hp<=0)return;b.hp--;b.flash=.12;S.hit();burst(b.x,GY-50,'#ffd27a',8,450);sparks(b.x,GY-50,'#fff3c4',6,Math.sign(b.x-pl.x)||1);
  if(b.hp<=0){shake=Math.max(shake,5);burst(b.x,GY-50,PAL[LV[G.lv].theme].metal,22,700);ring(b.x,GY-50,'#ffd27a',140);sfx(160,.25,'square',.06,-90);G.score+=50;
    for(const t of[b.drop,b.drop2])if(t)picks.push({x:b.x,y:GY-90,vx:(Math.random()-.5)*300,vy:-750,type:t,life:14})}}
function hitBoxesWith(box,done){for(const b of boxes)if(b.hp>0&&!done.has(b)&&overlap(box,boxRect(b))){done.add(b);hitBox(b)}}
function updBoxes(dt){for(const b of boxes)b.flash-=dt;boxes=boxes.filter(b=>b.hp>0)}
function bakeSupply(){const P=PAL[LV[G.lv].theme],c=document.createElement('canvas');c.width=120;c.height=104;const g=c.getContext('2d');
  plate(g,4,4,112,96,P,{c:16,rivets:1,seams:1,m:{light:shade(P.light,-.1),metal:shade(P.alt,.1),dark:P.ink}});hazard(g,14,70,92,12);
  g.fillStyle=P.ink;g.beginPath();g.arc(60,40,20,0,7);g.fill();g.strokeStyle='#5ce1ff';g.lineWidth=4;g.beginPath();g.moveTo(60,24);g.lineTo(60,56);g.moveTo(44,40);g.lineTo(76,40);g.stroke();
  supplyB={c}}
function drawBoxes(){if(!boxes.length)return;if(!supplyB)bakeSupply();for(const b of boxes){if(b.x<cam-120||b.x>cam+W+120)continue;
    X.drawImage(supplyB.c,b.x-60,GY-102);glow(b.x,GY-62,30,'#5ce1ff',.45+.2*Math.sin(lvT*3+b.x));if(b.hp<2){X.strokeStyle='rgba(0,0,0,.6)';X.lineWidth=3;X.beginPath();X.moveTo(b.x-30,GY-90);X.lineTo(b.x-6,GY-60);X.lineTo(b.x-20,GY-30);X.stroke()}
    if(b.flash>0)glow(b.x,GY-50,80,'#ffffff',b.flash*5)}}
function drawPickIcon(k){const P=PICK[k.type],x=k.x,y=k.y+(k.float?Math.sin(lvT*3+k.x*.01)*8:0),blink=!k.float&&k.life<3&&Math.floor(k.life*8)%2;
  if(blink)return;glow(x,y,k.type==='egg'?80:52,P.col,k.type==='coin'?.45:.7);
  if(k.type!=='coin'&&k.life!==99){const pr=34+Math.sin(lvT*4+k.x)*4;X.strokeStyle='rgba(255,255,255,.55)';X.lineWidth=2.5;X.beginPath();X.arc(x,y,pr,0,7);X.stroke()}
  X.save();X.translate(x,y);
  switch(k.type){
  case'fruit':X.fillStyle='#2ea86a';X.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?12:19;X.lineTo(Math.cos(a)*r,Math.sin(a)*r)}X.closePath();X.fill();
    X.fillStyle='#9dffc8';X.beginPath();X.arc(-5,-6,6,0,7);X.fill();X.fillStyle='#1f6a3e';X.beginPath();X.ellipse(6,-21,8,4,-.5,0,7);X.fill();break;
  case'med':plate(X,-22,-18,44,36,PAL.station,{c:7});X.fillStyle='#e8344a';X.fillRect(-5,-12,10,24);X.fillRect(-12,-5,24,10);break;
  case'shard':X.fillStyle='#bff6ff';X.beginPath();X.moveTo(0,-24);X.lineTo(13,-4);X.lineTo(0,24);X.lineTo(-13,-4);X.closePath();X.fill();X.fillStyle='#5ce1ff';X.beginPath();X.moveTo(0,-24);X.lineTo(13,-4);X.lineTo(0,24);X.fill();break;
  case'shield':X.strokeStyle='#cfe8ff';X.lineWidth=5;X.beginPath();X.arc(0,0,20,0,7);X.stroke();X.fillStyle='rgba(143,200,255,.35)';X.fill();X.fillStyle='#ffffff';X.beginPath();X.ellipse(-7,-8,6,3,-.6,0,7);X.fill();break;
  case'fang':X.fillStyle='#fff3e0';X.beginPath();X.moveTo(-12,-18);X.quadraticCurveTo(14,-14,10,22);X.quadraticCurveTo(0,0,-12,-18);X.fill();X.strokeStyle='#ffb347';X.lineWidth=3;X.stroke();break;
  case'coin':{const sx=Math.abs(Math.cos(lvT*4+k.x));X.scale(Math.max(.15,sx),1);X.fillStyle='#e8a92e';X.beginPath();X.arc(0,0,16,0,7);X.fill();X.fillStyle='#ffd27a';X.beginPath();X.arc(0,0,12,0,7);X.fill();
    X.fillStyle='#b8741a';X.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?3.5:8;X.lineTo(Math.cos(a)*r,Math.sin(a)*r)}X.fill()}break;
  case'egg':{const eg=X.createLinearGradient(-20,-28,20,28);eg.addColorStop(0,'#fff6c8');eg.addColorStop(.5,'#ffd24a');eg.addColorStop(1,'#c88a1a');X.fillStyle=eg;X.beginPath();X.ellipse(0,0,22,29,0,0,7);X.fill();
    X.fillStyle='rgba(120,70,10,.35)';X.beginPath();X.arc(-7,6,4,0,7);X.arc(8,-4,3,0,7);X.arc(4,14,3,0,7);X.fill();glow(-8,-12,14,'#ffffff',.6+.4*Math.sin(lvT*5))}break}
  X.restore()}
function drawPicks(){for(const k of picks)drawPickIcon(k)}
/* elite shockwaves travel along the floor; jump over them */
function updQuake(h,dt){h.x+=h.dir*h.v*dt;h.act-=dt;if(Math.random()<.6)parts.push({x:h.x,y:GY-4,vx:(Math.random()-.5)*120,vy:-200-Math.random()*200,life:.4,max:.4,col:'#ffb347',sz:6,g:900});
  if(!h.hitP&&pl&&!pl.dead&&pl.y>GY-60&&Math.abs(pl.x-h.x)<55){h.hitP=1;hurtPlayer(15*dm(),h.dir*650)}}
function drawQuake(h){const a=Math.min(1,h.act*2);glow(h.x,GY-20,70,'#ffb347',.7*a,40);X.fillStyle='#fff0c8';X.globalAlpha=a;X.beginPath();X.moveTo(h.x-34,GY);
  for(let i=0;i<5;i++)X.lineTo(h.x-34+i*17,GY-(i%2?46:18));X.lineTo(h.x+34,GY);X.fill();X.globalAlpha=1}
/* lives + power-ups in the HUD */
function drawHUDExtra(){const p=pl;if(!p)return;
  X.font=`700 30px ${FD}`;const nx=48+X.measureText('TYKO').width+30;for(let i=0;i<G.lives;i++){const ex=nx+i*34,ey=51;X.fillStyle='#ffd24a';X.beginPath();X.ellipse(ex,ey,11,14,0,0,7);X.fill();X.fillStyle='rgba(120,70,10,.4)';X.beginPath();X.arc(ex-3,ey+3,2.5,0,7);X.fill()}
  const buffs=[];if(p.shield>0)buffs.push(['shield',`${p.shield}× · ${Math.ceil(p.shieldT)}s`]);if(p.fury>0)buffs.push(['fang',`${Math.ceil(p.fury)}s`]);
  buffs.forEach(([t,lab],i)=>{const bx=72+i*170,by=208;drawPickIcon({type:t,x:bx,y:by,float:0,life:99});X.textAlign='left';X.font=`700 22px ${FU}`;X.fillStyle=PICK[t].col;X.fillText(lab,bx+30,by+8)});
  if(p.shield>0&&!p.dead){X.save();X.translate(-Math.round(cam),0);X.restore()}}
function drawShieldBubble(p){if(!(p.shield>0)||p.dead)return;const r=118+Math.sin(lvT*6)*4;X.save();X.globalCompositeOperation='lighter';X.strokeStyle='#8fc8ff';X.globalAlpha=.55;X.lineWidth=5;
  X.beginPath();X.arc(p.x,p.y-95,r,0,7);X.stroke();X.globalAlpha=.12;X.fillStyle='#8fc8ff';X.fill();X.restore();X.globalAlpha=1}
</script>
