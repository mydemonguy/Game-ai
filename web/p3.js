<script>
"use strict";
/* ---------- boss: Malakar, the Void Sovereign ---------- */
const arenaCam=()=>Math.max(0,RW-W);
function startBoss(){lock=true;S.boom();sfxBossRoar();musicFor();shake=16;const ac=arenaCam();
  boss={isBoss:true,x:ac+W-RSAFE-160,y:GY,w:190,h:330,hp:3600,max:3600,face:-1,state:'enter',t:2.6,flash:0,vx:0,phase:1,dy:-800,hov:0,last:'',fire:0,left:0};
  showBanner('Malakar','The Void Sovereign',2.6)}
function bclamp(x){return Math.max(cam+220,Math.min(cam+W-RSAFE-110,x))}
function chooseAttack(b){let o=['dash','barrage','rift'];if(b.phase>=2)o.push('beam','beam','summon');
  o=o.filter(a=>a!==b.last);let a=o[Math.floor(Math.random()*o.length)];if(a==='summon'&&en.length>=2)a='barrage';b.last=a;
  const k=b.phase===3?.6:.85;
  if(a==='dash'){b.state='dashWind';b.t=.7*k;b.dash2=false;S.warn()}
  else if(a==='barrage'){b.state='barrage';b.left=b.phase>1?16:10;b.fire=0;b.spin=Math.random()*6}
  else if(a==='rift'){b.state='cast';b.t=.6;const xs=[pl.x,pl.x-300,pl.x+300];if(b.phase===3)xs.push(pl.x-600,pl.x+600);
    xs.forEach((x,i)=>hz.push({kind:'pillar',x:bclamp(x),t:.9+i*.08,act:.45,w:160}));S.warn()}
  else if(a==='beam'){b.state='cast';b.t=1.2;const low=Math.random()<.5;hz.push({kind:'beam',y:low?GY-60:GY-215,low,t:1.05*k+.2,act:.6});S.warn()}
  else if(a==='summon'){b.state='cast';b.t=.9;spawnEnemy('d',-1);spawnEnemy('d',1);if(b.phase===3)spawnEnemy('c',1)}}
function updBoss(b,dt){b.flash-=dt;b.t-=dt;
  const r=b.hp/b.max,ph=r<.25?3:r<.55?2:1;
  if(ph!==b.phase&&b.state!=='enter'){b.phase=ph;showBanner(ph===2?'Malakar Unleashed':'The Void Consumes',ph===2?'He calls the Hollowed to his side':'Final phase',1.8);
    shake=22;S.boom();sfxBossRoar();b.state='idle';b.t=1.2;burst(b.x,b.y-170,'#ff3d6e',40,1000);hz=hz.filter(h=>h.kind!=='beam')}
  if(b.state==='enter'){b.dy+=(0-b.dy)*Math.min(1,dt*2.2);if(b.t<=0){b.state='idle';b.t=1;b.dy=0}return}
  b.hov=Math.sin(lvT*2)*16;
  if(b.state!=='dash')b.face=Math.sign(pl.x-b.x)||-1;
  const k=b.phase===3?.6:.85;
  if(b.state==='idle'){let side=b.x>pl.x?1:-1,tx=bclamp(pl.x+side*520);if(Math.abs(tx-pl.x)<320)tx=bclamp(pl.x-side*520);b.x+=(tx-b.x)*Math.min(1,dt*1.3);if(b.t<=0)chooseAttack(b)}
  else if(b.state==='dashWind'){if(Math.random()<.5)burst(b.x,b.y-160,'#ff3d6e',2,300);if(b.t<=0){b.state='dash';b.t=.95;b.vx=b.face*2000;S.boom();b.hitP=false}}
  else if(b.state==='dash'){b.x+=b.vx*dt;parts.push({x:b.x,y:b.y-150+(Math.random()-.5)*200,vx:-b.vx*.1,vy:0,life:.3,max:.3,col:'#ff3d6e',sz:10,g:0});
    if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(28,b.face*1000)}
    if(b.t<=0||b.x<cam+180||b.x>cam+W-RSAFE-110){b.x=bclamp(b.x);shake=10;
      if(b.phase===3&&!b.dash2){b.dash2=true;b.face*=-1;b.state='dashWind';b.t=.35}else{b.state='idle';b.t=1.1*k}}}
  else if(b.state==='barrage'){b.fire-=dt;if(b.fire<=0){b.fire=.1;b.left--;const a0=Math.atan2(pl.y-90-(b.y-260),pl.x-b.x);
      const a=a0+Math.sin(b.spin+b.left*.7)*.55;shots.push({x:b.x+b.face*60,y:b.y-260+b.hov,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:20,dmg:14,life:3.5,col:'#ff3d6e'});S.shot();
      if(b.left<=0){b.state='idle';b.t=1.2*k}}}
  else if(b.state==='cast'){if(b.t<=0){b.state='idle';b.t=1*k}}
  if(b.state!=='dash'&&b.state!=='idle'&&overlap(ebox(b),pbox()))hurtPlayer(5,(pl.x<b.x?-1:1)*800);
}
function killBoss(){const b=boss;b.dead=true;bossDone=true;G.score+=10000;shake=30;S.boom();hz=[];shots=shots.filter(s=>s.friend);
  en.forEach(e=>{e.dead=true;burst(e.x,e.y-e.h/2,'#ff4fd8',20)});en=[];spawnQ=[];
  for(let i=0;i<6;i++)setTimeout(()=>{burst(b.x+(Math.random()-.5)*220,b.y-Math.random()*330,i%2?'#ff3d6e':'#5ce1ff',40,1100);souls(b.x,b.y-170);S.boom();shake=20},i*280);
  showBanner('Malakar Falls','',3);doneT=3.4;sfxBossDie();musicStop(2.5)}

/* ---------- world update ---------- */
const circleBox=(s,b)=>{const cx=Math.max(b.x,Math.min(s.x,b.x+b.w)),cy=Math.max(b.y,Math.min(s.y,b.y+b.h));return(s.x-cx)**2+(s.y-cy)**2<s.r*s.r};
function atkBox(){const p=pl;if(!(p.atk>0))return null;const reach=p.combo===3?240:180;return{x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190}}
function inSolid(x,y){if(!ROOM)return false;for(const s of ROOM.solids)if(x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h)return true;for(const s of solidRects())if(x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h)return true;return false}
function updShots(dt){const ab=atkBox();
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(!s.friend&&ab&&circleBox(s,ab)){s.friend=true;s.vx=pl.face*Math.abs(s.vx)*1.5+pl.face*200;s.vy*=-.4;s.hit=new Set();s.dmg*=2.2;s.col='#5ce1ff';s.life=1.5;sfxDeflect();ftext(s.x,s.y-30,'Deflect','#5ce1ff');pl.en=Math.min(100,pl.en+8);continue}
    if(s.friend){hitBoxesWith({x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2},s.hit);for(const e of allTargets()){if(s.hit.has(e))continue;if(circleBox(s,ebox(e))){s.hit.add(e);damage(e,s.dmg*(1+G.lv*.05),Math.sign(s.vx)*500);if(!s.pierce){s.life=0;break}}}}
    else if(circleBox(s,pbox())){hurtPlayer(s.dmg,Math.sign(s.vx)*380);s.life=0;burst(s.x,s.y,s.col,10)}
    if(!s.wave&&inSolid(s.x,s.y)){s.life=0;burst(s.x,s.y,s.col,6,300);sfxFizz()}
    if(s.x<cam-300||s.x>cam+W+300||s.y<camY-300||s.y>camY+H+300)s.life=0;
    if(Math.random()<.4)parts.push({x:s.x,y:s.y,vx:0,vy:0,life:.25,max:.25,col:s.col,sz:s.wave?14:6,g:0})}
  shots=shots.filter(s=>s.life>0)}
function updHz(dt){for(const h of hz){if(h.kind==='quake'){updQuake(h,dt);continue}if(h.t>0){h.t-=dt;if(h.t<=0){S.boom();shake=Math.max(shake,h.kind==='beam'?14:9);if(h.kind==='pillar')burst(h.x,GY,'#ff3d6e',24,900)}continue}
    h.act-=dt;if(h.hitP)continue;const pb=pbox();
    if(h.kind==='pillar'&&Math.abs(pl.x-h.x)<h.w/2+30){h.hitP=true;hurtPlayer(22,(pl.x<h.x?-1:1)*600)}
    if(h.kind==='beam'&&pb.y<h.y+38&&pb.y+pb.h>h.y-38){h.hitP=true;hurtPlayer(26,(pl.x<cam+W/2?-1:1)*500)}}
  hz=hz.filter(h=>h.t>0||h.act>0)}
function updParts(dt){for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);for(const q of parts){q.life-=dt;q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.pow(.3,dt)}parts=parts.filter(q=>q.life>0);if(parts.length>600)parts.splice(0,parts.length-600);
  for(const t of texts){t.life-=dt;t.y-=90*dt}texts=texts.filter(t=>t.life>0)}

function update(dt){updParts(dt);if(banner){banner.life-=dt;if(banner.life<=0)banner=null}
  if(TRANS.on){updTrans(dt);for(const k in P)delete P[k];return}
  if(hitStop>0){hitStop-=dt;return}
  lvT+=dt;shake*=Math.pow(.015,dt);if(shake<.4)shake=0;flashT-=dt;
  updPlayer(dt);if(G.state!=='play')return;
  for(const q of spawnQ)q.t-=dt;while(spawnQ.length&&spawnQ[0].t<=0){const q=spawnQ.shift();spawnEnemy(q.type,q.side)}
  for(const e of en)updEnemy(e,dt);en=en.filter(e=>!e.dead);
  for(let i=0;i<en.length;i++)for(let j=i+1;j<en.length;j++){const a=en[i],b=en[j];if(a.fly!==b.fly||Math.abs(a.y-b.y)>200)continue;const d=b.x-a.x,m=(a.w+b.w)*.45;if(Math.abs(d)<m){const push=(m-Math.abs(d))*.5*(d<0?-1:1);a.x-=push;b.x+=push}}
  if(boss&&!boss.dead)updBoss(boss,dt);
  updShots(dt);updHz(dt);updPicks(dt);updBoxes(dt);updAtmos(dt);updWorld(dt);if(G.state!=='play'||TRANS.on){for(const k in P)delete P[k];return}
  if(pl.dead&&G.respawnT>0){G.respawnT-=dt;pl.deadT+=dt;if(G.respawnT<=0){const e=ROOM.entry;pl.dead=0;pl.x=e.x;pl.y=e.y;pl.vx=pl.vy=0;pl.hp=pl.max;pl.inv=2.5;pl.en=Math.max(pl.en,50);pl.hits=0;
    showBanner('Back on your feet','Lives left: '+G.lives,1.6);ring(pl.x,pl.y-90,'#ffe08a',220);burst(pl.x,pl.y-90,'#ffe08a',30,700);sfxRevive()}}
  if(boss&&boss.state==='enter'){cam+=(arenaCam()-cam)*Math.min(1,dt*3);camY+=(Math.max(0,RH-H)-camY)*Math.min(1,dt*3)}else updCamera(dt);
  for(const k in P)delete P[k]}

/* ---------- screens ---------- */
const scr=document.getElementById('scr'),card=document.getElementById('card'),pad=document.getElementById('pad');
function padShow(v){pad.hidden=!(v&&touchy)}
function hideCard(){scr.hidden=true}
function showCard(o){card.innerHTML=(o.ey?`<p class="eyebrow">${o.ey}</p>`:'')+(o.big?`<h1>${o.h}</h1>`:`<h2>${o.h}</h2>`)+(o.tag?`<p class="tag">${o.tag}</p>`:'')+
  (o.b?`<div class="body">${o.b}</div>`:'')+(o.extra||'')+`<div class="row"></div>`;
  const row=card.querySelector('.row');(o.btns||[]).forEach(([label,fn,alt])=>{const b=document.createElement('button');b.className='btn'+(alt?' alt':'');b.textContent=label;
    b.addEventListener('click',()=>{initAudio();sfxUI(alt?0:1);fn()});row.appendChild(b)});
  scr.hidden=false;card.scrollTop=0;const f=row.querySelector('button');if(f&&!touchy)setTimeout(()=>f.focus(),30)}
function story(pages,i,done){const p=pages[i];showCard({ey:p.ey,h:p.h,b:p.b,btns:[[i<pages.length-1?'Continue':'Onward',()=>i<pages.length-1?story(pages,i+1,done):done()],...(i<pages.length-1?[['Skip',done,1]]:[])]})}
function beginSaga(){goFull();story(STORY.intro,0,()=>{G.state='card';showCard({ey:LV[0].ch,h:LV[0].name,b:STORY.brief[0],btns:[['Fight',newRun]]})})}
function toTitle(){G.state='menu';G.paused=false;TRANS.on=0;padShow(false);menuBG();musicFor();
  const sv=META.save,found=Object.keys(META.map).length,tot=Object.keys(ROOMS).length;
  showCard({ey:'A Starblood Saga · Six Worlds',h:'Aetherfall',big:1,tag:'One small dino. One stolen sky. One very big Rift.',
    b:(sv?`<p>Save: ${LV[ROOMS[sv.room].a].name} · Map ${Math.round(found/tot*100)}% · Tanks ${tankCount()}/12</p>`:'')+(G.best?`<p>Best score ${G.best.toLocaleString()}</p>`:''),
    btns:[...(sv?[['Continue',()=>{goFull();continueGame()}]]:[]),[sv?'New game':'Begin the Saga',sv?confirmNew:beginSaga,!!sv],['Controls',controls,1],['Sound',soundCard,1]]})}
function confirmNew(){showCard({ey:'New game',h:'Start over?',b:'<p>This erases your map, abilities and energy tanks.</p>',btns:[['Start over',beginSaga],['Back',toTitle,1]]})}
function soundCard(back){back=typeof back==='function'?back:toTitle;const sl=(id,lab,v)=>`<label class="vol"><span>${lab}</span><input type="range" id="${id}" min="0" max="100" value="${Math.round(v*100)}"></label>`;
  showCard({ey:'Settings',h:'Sound',extra:`<div class="vols">${sl('vMus','Music',VOL.music)}${sl('vSfx','Effects',VOL.sfx)}</div>`,btns:[['Done',back]]});
  const m=document.getElementById('vMus'),f=document.getElementById('vSfx');
  m.addEventListener('input',()=>{initAudio();setVol('music',m.value/100)});f.addEventListener('input',()=>{initAudio();setVol('sfx',f.value/100)});f.addEventListener('change',()=>sfxPick('coin'))}
function controls(back){back=typeof back==='function'?back:toTitle;showCard({ey:'How to play',h:'Controls',extra:`<div class="keys">
  <kbd>Thumbstick / A D</kbd><span>Move. Touch anywhere on the left side of the screen and slide. Pull down to drop through thin platforms</span><kbd>▲ / W / Space</kbd><span>Jump</span>
  <kbd>⚔ / J / X</kbd><span>Claw strike. Tap three times for a combo; the third hit is a heavy bite. Swipe enemy orbs to send them back</span>
  <kbd>» / L / Shift</kbd><span>Comet Dash (once found). You can't be hit while dashing</span>
  <kbd>✦ / K / C</kbd><span>Starburst roar (once found). Costs half your Aether bar, which fills as you land hits</span>
  <kbd>II / Esc / P</kbd><span>Pause and open the map</span></div>`,b:`<p>Each world is a maze of rooms. Walk through the blue hatches at the edges to move between them; red hatches are sealed until the room is clear. Shrines grant new powers that open blocked paths, so come back to places you could not reach before. Green stations save your game. Stand on an elevator to ride to the next world.</p>`,btns:[['Back',back]]})}
function gameOver(){G.state='over';if(pl){pl.dead=1;pl.deadT=0;pl.vx=0}G.best=Math.max(G.best,G.score);saveProg();padShow(false);clearInput();sfxGameOver();musicStop(1.5);
  const rid=ROOM?ROOM.id:'0-0',ent=ROOM&&ROOM.entry?{x:ROOM.entry.x,y:ROOM.entry.y}:{x:300,y:GY};
  setTimeout(()=>showCard({ey:'Tyko is down',h:'The Light Fades',
  b:`<p><span class="who">LYRA:</span> "Not yet, little one. Get up. I won't let the dark have you."</p>`,btns:[...(META.save?[['Continue from save',()=>continueGame()]]:[]),['Retry this room',()=>{G.lives=3;G.lv=-1;startGame(rid,ent)},1],['Title',toTitle,1]]}),900)}
function victory(){G.state='card';padShow(false);clearInput();G.score+=Math.round(pl.hp*50);unlocked=6;saveProg();G.best=Math.max(G.best,G.score);musicPlay('victory');
  const found=Object.keys(META.map).length,tot=Object.keys(ROOMS).length;
  story(STORY.ending,0,()=>showCard({ey:'The saga is complete',h:'Ithra Is Free',big:0,b:`<p>Final score <b>${G.score.toLocaleString()}</b></p><p>Map explored ${Math.round(found/tot*100)}% · Energy tanks ${tankCount()}/12 · Eggs ${Object.keys(META.items).filter(k=>k.startsWith('egg')).length}/6</p><p>Thank you for playing Aetherfall.</p>`,btns:[['Play again',beginSaga],['Title',toTitle,1]]}))}
function pauseCard(){showCard({ey:LV[G.lv].ch+' · '+LV[G.lv].name,h:'Paused',extra:mapCardHTML()+`<p class="tag" style="margin:.4em 0">Map ${Object.keys(META.map).length}/${Object.keys(ROOMS).length} rooms · Tanks ${tankCount()}/12</p>`+abilitiesHTML(),
  btns:[['Resume',togglePause],['Sound',()=>soundCard(pauseCard),1],['Controls',()=>controls(pauseCard),1],['Quit to title',toTitle,1]]});paintMapCard()}
function togglePause(){if(G.state!=='play')return;G.paused=!G.paused;clearInput();
  if(G.paused){padShow(false);sfxPause(1);musicDuck(1);pauseCard()}
  else{hideCard();padShow(true);sfxPause(0);musicDuck(0)}}
document.getElementById('pauseBtn').addEventListener('pointerdown',e=>{e.preventDefault();togglePause()});
function goFull(){try{const d=document.documentElement;if(touchy&&!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(_){}}).catch(()=>{})}catch(e){}}
addEventListener('blur',()=>{if(G.state==='play'&&!G.paused)togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(G.state==='play'&&!G.paused)togglePause();audioSuspend(1)}else audioSuspend(0)});
</script>
