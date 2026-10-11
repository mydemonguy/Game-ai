<script>
"use strict";
/* ---------- world + HUD rendering ---------- */
const FD='"Cinzel", Georgia, serif',FU='"Chakra Petch", "Segoe UI", sans-serif';
function drawHz(){for(const h of hz){if(h.kind==='quake'){drawQuake(h);continue}if(h.kind==='pillar'){if(h.t>0){X.fillStyle='#ff3d6e';X.globalAlpha=.25+.25*Math.sin(lvT*30);X.beginPath();X.ellipse(h.x,GY+6,h.w/2,18,0,0,7);X.fill();X.globalAlpha=1}
      else{X.save();X.globalCompositeOperation='lighter';const a=Math.min(1,h.act/.2);X.globalAlpha=a;const g=X.createLinearGradient(h.x-h.w/2,0,h.x+h.w/2,0);
        g.addColorStop(0,'rgba(255,61,110,0)');g.addColorStop(.5,'#ffd0dc');g.addColorStop(1,'rgba(255,61,110,0)');X.fillStyle=g;X.fillRect(h.x-h.w/2,0,h.w,GY);X.restore()}}
    else{const x0=cam-50,x1=cam+W+50;if(h.t>0){X.strokeStyle='#ff3d6e';X.globalAlpha=.35+.3*Math.sin(lvT*24);X.lineWidth=4;X.setLineDash([30,20]);X.beginPath();X.moveTo(x0,h.y);X.lineTo(x1,h.y);X.stroke();X.setLineDash([]);
        X.fillStyle='#ffd0dc';X.font=`700 34px ${FU}`;X.textAlign='center';X.fillText(h.low?'▲ JUMP':'▼ STAY LOW',cam+W/2,h.y-50);X.globalAlpha=1}
      else{X.save();X.globalCompositeOperation='lighter';X.globalAlpha=Math.min(1,h.act/.2);X.fillStyle='#ff3d6e';X.fillRect(x0,h.y-38,x1-x0,76);X.fillStyle='#fff';X.fillRect(x0,h.y-10,x1-x0,20);X.restore()}}}}
function drawShots(){for(const s of shots){if(s.wave){const a=Math.min(1,s.life*2),d=Math.sign(s.vx);X.save();X.globalCompositeOperation='lighter';X.globalAlpha=a*.5;X.strokeStyle=s.col;X.lineWidth=44;
      X.beginPath();X.arc(s.x-d*40,s.y,s.r+30,d>0?-1.1:Math.PI-1.1,d>0?1.1:Math.PI+1.1);X.stroke();X.globalAlpha=a;X.lineWidth=8;X.strokeStyle='#fff';X.beginPath();X.arc(s.x-d*40,s.y,s.r+30,d>0?-.9:Math.PI-.9,d>0?.9:Math.PI+.9);X.stroke();X.restore();
      glow(s.x,s.y,150,s.col,a*.6,120);continue}
    glow(s.x,s.y,s.r*3.2,s.col,.9);X.fillStyle='#ffffff';X.beginPath();X.arc(s.x,s.y,s.r*.6,0,7);X.fill()}}
function drawParts(){X.save();X.globalCompositeOperation='lighter';
  for(const r of rings){const t=1-r.life/r.max;X.globalAlpha=(1-t)*.8;X.strokeStyle=r.col;X.lineWidth=10*(1-t)+2;X.beginPath();X.arc(r.x,r.y,r.r*(.3+t*.9),0,7);X.stroke()}
  for(const q of parts){X.globalAlpha=Math.max(0,q.life/q.max);if(q.streak){X.strokeStyle=q.col;X.lineWidth=3;X.beginPath();X.moveTo(q.x,q.y);X.lineTo(q.x-q.vx*.035,q.y-q.vy*.035);X.stroke()}
    else{X.fillStyle=q.col;X.fillRect(q.x-q.sz/2,q.y-q.sz/2,q.sz,q.sz)}}X.restore();X.globalAlpha=1}
function drawTexts(){X.textAlign='center';for(const t of texts){X.globalAlpha=Math.min(1,t.life*2);X.font=`700 ${t.big?52:typeof t.s==='number'?38:30}px ${FU}`;X.lineWidth=6;X.strokeStyle='rgba(0,0,0,.7)';X.strokeText(t.s,t.x,t.y);X.fillStyle=t.col;X.fillText(t.s,t.x,t.y)}X.globalAlpha=1}
function drawWorld(){if(ROOM){drawRoomBack();drawProps();drawVents();drawLamps();drawSolids();drawConveyor(FY,cam,0)}else{drawProps();drawVents();drawLamps()}drawGeo();drawBoxes();drawHz();drawPicks();
  for(const e of en)if(!e.fly)e.type==='c'?drawCaster(e):drawHollow(e);
  if(boss&&!boss.dead)drawBoss(boss);
  if(pl){drawKnight(pl);drawShieldBubble(pl)}
  for(const e of en)if(e.fly)drawDrone(e);
  drawShots();drawParts();drawTexts()}
function hudBar(x,y,w,h,v,c1,c2){X.fillStyle='rgba(5,4,12,.7)';X.fillRect(x-3,y-3,w+6,h+6);const g=X.createLinearGradient(x,0,x+w,0);g.addColorStop(0,c1);g.addColorStop(1,c2);X.fillStyle=g;X.fillRect(x,y,w*Math.max(0,Math.min(1,v)),h);
  X.strokeStyle='rgba(236,231,255,.35)';X.lineWidth=2;X.strokeRect(x-3,y-3,w+6,h+6)}
function drawHUD(){const L=bg.L,p=pl;if(!p)return;X.textBaseline='alphabetic';
  X.textAlign='left';X.font=`700 30px ${FD}`;X.fillStyle='#ece7ff';X.fillText('TYKO',48,62);
  hudBar(48,80,480,24,p.hp/p.max,'#ff3d6e','#ff8a4c');X.font=`600 20px ${FU}`;X.fillStyle='#fff';X.fillText(Math.ceil(p.hp)+' / '+p.max,58,99);
  hudBar(48,116,480,14,p.en/100,'#3a7cff','#5ce1ff');X.fillStyle='rgba(236,231,255,.8)';X.fillRect(48+240-1,113,2,20);
  X.font=`700 20px ${FU}`;X.fillStyle=p.en>=50?'#5ce1ff':'#9d97bd';X.fillText(p.en>=50?'✦ STARBURST READY':'AETHER',48,160);
  X.textAlign='center';X.font=`600 18px ${FU}`;X.fillStyle='#9d97bd';X.fillText(L.ch.toUpperCase()+'  ·  '+L.name.toUpperCase(),W/2,46);
  drawMinimap();
  X.textAlign='right';X.font=`700 34px ${FU}`;X.fillStyle='#ece7ff';X.fillText(G.score.toLocaleString(),W-(touchy?210:48),66);X.font=`600 16px ${FU}`;X.fillStyle='#9d97bd';X.fillText('SCORE',W-(touchy?210:48),90);
  drawHUDExtra();
  if(p.hits>=3){const m=1+Math.min(4,Math.floor(p.hits/10)),pop=Math.min(1,(1.8-p.hitsT)*8);X.textAlign='right';X.globalAlpha=Math.min(1,p.hitsT*2);
    X.font=`900 ${Math.round(64+(1-pop)*16)}px ${FD}`;X.fillStyle='#ffd27a';X.fillText(p.hits,W-60,330);X.font=`700 24px ${FU}`;X.fillStyle='#ece7ff';X.fillText('HIT COMBO',W-60,362);
    if(m>1){X.fillStyle='#5ce1ff';X.fillText('×'+m+' SCORE',W-60,392)}X.globalAlpha=1}
  if(boss&&!boss.dead&&boss.state!=='enter'){const bw=900,bx=W/2-bw/2;X.textAlign='center';X.font=`700 30px ${FD}`;X.fillStyle='#ffd0dc';X.fillText('MALAKAR, THE VOID SOVEREIGN',W/2,150);
    hudBar(bx,164,bw,20,boss.hp/boss.max,'#7a0a2a','#ff3d6e');[.55,.25].forEach(m=>{X.fillStyle='rgba(255,255,255,.6)';X.fillRect(bx+bw*m-1,161,2,26)})}
  if(lock&&ROOM&&ROOM.arena&&!boss&&Math.floor(lvT*2)%2){X.textAlign='center';X.font=`700 26px ${FU}`;X.fillStyle='#ff6a5a';X.fillText('◆ HATCHES SEALED ◆',W/2,H-60)}
  if(G.lv===0&&lvT<10&&touchy){X.textAlign='center';X.font=`600 26px ${FU}`;X.fillStyle='rgba(236,231,255,.85)';X.fillText(['Slide on the left side to move','▲ jump','⚔ strike','walk into hatches to explore','II map'].join('   ·   '),W/2,H-36)}
  if(G.lv===0&&lvT<9&&!touchy){X.textAlign='center';X.font=`600 24px ${FU}`;X.fillStyle='rgba(236,231,255,.8)';X.fillText('A / D move   ·   W jump   ·   J strike   ·   S drop   ·   walk into hatches to explore   ·   Esc map',W/2,H-50)}
  if(banner){const a=Math.min(1,banner.life*2,(banner.max-banner.life)*4);X.globalAlpha=a;X.textAlign='center';X.fillStyle='rgba(5,4,12,.45)';X.fillRect(0,H/2-130,W,banner.sub?190:150);
    X.font=`900 96px ${FD}`;X.fillStyle='#ece7ff';glowOn(L.glow,30);X.fillText(banner.t.toUpperCase(),W/2,H/2-30);glowOff();
    if(banner.sub){X.font=`600 34px ${FU}`;X.fillStyle=L.glow;X.fillText(banner.sub.toUpperCase(),W/2,H/2+30)}X.globalAlpha=1}
  if(flashT>0){X.fillStyle=`rgba(255,40,80,${flashT*1.4})`;X.fillRect(0,0,W,H)}
  if(p.hp<30){const v=X.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H);v.addColorStop(0,'rgba(255,0,60,0)');v.addColorStop(1,`rgba(255,0,60,${.25+Math.sin(lvT*5)*.1})`);X.fillStyle=v;X.fillRect(0,0,W,H)}
  if(G.state==='over'){X.fillStyle='rgba(5,4,12,.5)';X.fillRect(0,0,W,H)}}
function render(){if(!bg)return;X.save();const sx=shake?(Math.random()-.5)*shake*2:0,sy=shake?(Math.random()-.5)*shake*2:0;X.translate(sx,sy);
  drawBG();X.save();X.translate(-Math.round(cam),-Math.round(camY));drawWorld();X.restore();applyLighting();drawFG();drawWeather();drawAmbient();X.restore();
  if(G.state!=='menu')drawHUD();
  if(TRANS.on){const d=TRANS.act&&TRANS.act.lift?.7:.22,a=TRANS.phase===0?Math.min(1,TRANS.t/d):Math.max(0,1-TRANS.t/.25);X.fillStyle=`rgba(0,0,0,${a})`;X.fillRect(0,0,W,H)}}

/* ---------- loop ---------- */
let last=performance.now();C._dirty=1;
const SPB=document.querySelector('.act.sp'),DSB=document.querySelector('.act.dsh');let padE=-1,padC=-1;
function syncPad(){if(pad.hidden||!pl)return;const e=Math.round(pl.en)/100,c=Math.round(Math.max(0,Math.min(1,1-pl.dashCD/.75))*40)/40;
  if(e!==padE){padE=e;SPB.style.setProperty('--e',e);SPB.classList.toggle('ready',pl.en>=50)}
  if(c!==padC){padC=c;DSB.style.setProperty('--c',c)}}
function frame(now){const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;
  try{if(G.state==='play'&&!G.paused)update(dt);
    else if(G.state==='over'){updParts(dt);lvT+=dt;shake*=.9;if(pl)pl.deadT=(pl.deadT||0)+dt}
    else if(G.state==='menu'){lvT+=dt;cam+=dt*70;if(cam>bg.L.len-W)cam=0}
    musicTick();
    if(G.state==='play'&&!G.paused||G.state==='over'||G.state==='menu'||C._dirty){C._dirty=0;render()}syncPad()}catch(err){console.error(err)}
  requestAnimationFrame(frame)}
toTitle();initAudio();document.addEventListener('pointerdown',()=>initAudio(),true);addEventListener('keydown',()=>initAudio(),true);
if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load(`900 40px ${FD}`),document.fonts.load(`700 20px ${FU}`)]).catch(()=>{})}
requestAnimationFrame(frame);
</script>
