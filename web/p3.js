<script>
"use strict";
/* ---------- boss: Malakar, the Void Sovereign ---------- */
const arenaCam=()=>LV[G.lv].len-W+120;
function startBoss(){lock=true;S.boom();shake=16;const ac=arenaCam();
  boss={isBoss:true,x:ac+W-RSAFE-60,y:GY,w:190,h:330,hp:2400,max:2400,face:-1,state:'enter',t:2.6,flash:0,vx:0,phase:1,dy:-800,hov:0,last:'',fire:0,left:0};
  showBanner('Malakar','The Void Sovereign',2.6)}
function bclamp(x){return Math.max(cam+220,Math.min(cam+W-RSAFE-20,x))}
function chooseAttack(b){let o=['dash','barrage','rift'];if(b.phase>=2)o.push('beam','beam','summon');
  o=o.filter(a=>a!==b.last);let a=o[Math.floor(Math.random()*o.length)];if(a==='summon'&&en.length>=2)a='barrage';b.last=a;
  const k=b.phase===3?.7:1;
  if(a==='dash'){b.state='dashWind';b.t=.7*k;b.dash2=false;S.warn()}
  else if(a==='barrage'){b.state='barrage';b.left=b.phase>1?16:10;b.fire=0;b.spin=Math.random()*6}
  else if(a==='rift'){b.state='cast';b.t=.6;const xs=[pl.x,pl.x-300,pl.x+300];if(b.phase===3)xs.push(pl.x-600,pl.x+600);
    xs.forEach((x,i)=>hz.push({kind:'pillar',x:bclamp(x),t:.9+i*.08,act:.45,w:160}));S.warn()}
  else if(a==='beam'){b.state='cast';b.t=1.2;const low=Math.random()<.5;hz.push({kind:'beam',y:low?GY-60:GY-215,low,t:1.05*k+.2,act:.6});S.warn()}
  else if(a==='summon'){b.state='cast';b.t=.9;spawnEnemy('d',-1);spawnEnemy('d',1);if(b.phase===3)spawnEnemy('c',1)}}
function updBoss(b,dt){b.flash-=dt;b.t-=dt;
  const r=b.hp/b.max,ph=r<.25?3:r<.55?2:1;
  if(ph!==b.phase&&b.state!=='enter'){b.phase=ph;showBanner(ph===2?'Malakar Unleashed':'The Void Consumes',ph===2?'He calls the Hollowed to his side':'Final phase',1.8);
    shake=22;S.boom();b.state='idle';b.t=1.2;burst(b.x,b.y-170,'#ff3d6e',40,1000);hz=hz.filter(h=>h.kind!=='beam')}
  if(b.state==='enter'){b.dy+=(0-b.dy)*Math.min(1,dt*2.2);if(b.t<=0){b.state='idle';b.t=1;b.dy=0}return}
  b.hov=Math.sin(lvT*2)*16;
  if(b.state!=='dash')b.face=Math.sign(pl.x-b.x)||-1;
  const k=b.phase===3?.7:1;
  if(b.state==='idle'){let side=b.x>pl.x?1:-1,tx=bclamp(pl.x+side*520);if(Math.abs(tx-pl.x)<320)tx=bclamp(pl.x-side*520);b.x+=(tx-b.x)*Math.min(1,dt*1.3);if(b.t<=0)chooseAttack(b)}
  else if(b.state==='dashWind'){if(Math.random()<.5)burst(b.x,b.y-160,'#ff3d6e',2,300);if(b.t<=0){b.state='dash';b.t=.95;b.vx=b.face*2000;S.boom();b.hitP=false}}
  else if(b.state==='dash'){b.x+=b.vx*dt;parts.push({x:b.x,y:b.y-150+(Math.random()-.5)*200,vx:-b.vx*.1,vy:0,life:.3,max:.3,col:'#ff3d6e',sz:10,g:0});
    if(!b.hitP&&overlap(ebox(b),pbox())){b.hitP=true;hurtPlayer(22,b.face*1000)}
    if(b.t<=0||b.x<cam+180||b.x>cam+W-180){b.x=bclamp(b.x);shake=10;
      if(b.phase===3&&!b.dash2){b.dash2=true;b.face*=-1;b.state='dashWind';b.t=.35}else{b.state='idle';b.t=1.1*k}}}
  else if(b.state==='barrage'){b.fire-=dt;if(b.fire<=0){b.fire=.1;b.left--;const a0=Math.atan2(pl.y-90-(b.y-260),pl.x-b.x);
      const a=a0+Math.sin(b.spin+b.left*.7)*.55;shots.push({x:b.x+b.face*60,y:b.y-260+b.hov,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:20,dmg:11,life:3.5,col:'#ff3d6e'});S.shot();
      if(b.left<=0){b.state='idle';b.t=1.2*k}}}
  else if(b.state==='cast'){if(b.t<=0){b.state='idle';b.t=1*k}}
  if(b.state!=='dash'&&b.state!=='idle'&&overlap(ebox(b),pbox()))hurtPlayer(8,(pl.x<b.x?-1:1)*800);
}
function killBoss(){const b=boss;b.dead=true;bossDone=true;G.score+=10000;shake=30;S.boom();hz=[];shots=shots.filter(s=>s.friend);
  en.forEach(e=>{e.dead=true;burst(e.x,e.y-e.h/2,'#ff4fd8',20)});en=[];spawnQ=[];
  for(let i=0;i<6;i++)setTimeout(()=>{burst(b.x+(Math.random()-.5)*220,b.y-Math.random()*330,i%2?'#ff3d6e':'#5ce1ff',40,1100);souls(b.x,b.y-170);S.boom();shake=20},i*280);
  showBanner('Malakar Falls','',3);doneT=3.4}

/* ---------- world update ---------- */
const circleBox=(s,b)=>{const cx=Math.max(b.x,Math.min(s.x,b.x+b.w)),cy=Math.max(b.y,Math.min(s.y,b.y+b.h));return(s.x-cx)**2+(s.y-cy)**2<s.r*s.r};
function atkBox(){const p=pl;if(!(p.atk>0))return null;const reach=p.combo===3?240:180;return{x:p.face>0?p.x-10:p.x-reach+10,y:p.y-190,w:reach,h:190}}
function updShots(dt){const ab=atkBox();
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(!s.friend&&ab&&circleBox(s,ab)){s.friend=true;s.vx=pl.face*Math.abs(s.vx)*1.5+pl.face*200;s.vy*=-.4;s.hit=new Set();s.dmg*=2.2;s.col='#5ce1ff';s.life=1.5;S.hit();ftext(s.x,s.y-30,'Deflect','#5ce1ff');pl.en=Math.min(100,pl.en+8);continue}
    if(s.friend){for(const e of allTargets()){if(s.hit.has(e))continue;if(circleBox(s,ebox(e))){s.hit.add(e);damage(e,s.dmg*(1+G.lv*.05),Math.sign(s.vx)*500);if(!s.pierce){s.life=0;break}}}}
    else if(circleBox(s,pbox())){hurtPlayer(s.dmg,Math.sign(s.vx)*380);s.life=0;burst(s.x,s.y,s.col,10)}
    if(s.y>GY){s.life=0;burst(s.x,GY,s.col,6,300)}
    if(s.x<cam-300||s.x>cam+W+300)s.life=0;
    if(Math.random()<.4)parts.push({x:s.x,y:s.y,vx:0,vy:0,life:.25,max:.25,col:s.col,sz:s.wave?14:6,g:0})}
  shots=shots.filter(s=>s.life>0)}
function updHz(dt){for(const h of hz){if(h.t>0){h.t-=dt;if(h.t<=0){S.boom();shake=Math.max(shake,h.kind==='beam'?14:9);if(h.kind==='pillar')burst(h.x,GY,'#ff3d6e',24,900)}continue}
    h.act-=dt;if(h.hitP)continue;const pb=pbox();
    if(h.kind==='pillar'&&Math.abs(pl.x-h.x)<h.w/2+30){h.hitP=true;hurtPlayer(18,(pl.x<h.x?-1:1)*600)}
    if(h.kind==='beam'&&pb.y<h.y+38&&pb.y+pb.h>h.y-38){h.hitP=true;hurtPlayer(20,(pl.x<cam+W/2?-1:1)*500)}}
  hz=hz.filter(h=>h.t>0||h.act>0)}
function updPicks(dt){for(const k of picks){k.vy+=1800*dt;k.y+=k.vy*dt;if(k.y>GY-24){k.y=GY-24;k.vy=0}k.life=(k.life==null?10:k.life)-dt;
    if(Math.abs(pl.x-k.x)<70&&Math.abs(pl.y-80-k.y)<120){k.life=0;S.pick();if(k.type==='hp'){pl.hp=Math.min(pl.max,pl.hp+25);ftext(pl.x,pl.y-180,'+25','#7dffb0')}else{pl.en=Math.min(100,pl.en+35);ftext(pl.x,pl.y-180,'+Aether','#5ce1ff')}}}
  picks=picks.filter(k=>k.life>0)}
function updParts(dt){for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);for(const q of parts){q.life-=dt;q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.pow(.3,dt)}parts=parts.filter(q=>q.life>0);if(parts.length>600)parts.splice(0,parts.length-600);
  for(const t of texts){t.life-=dt;t.y-=90*dt}texts=texts.filter(t=>t.life>0)}

function update(dt){updParts(dt);if(banner){banner.life-=dt;if(banner.life<=0)banner=null}
  if(hitStop>0){hitStop-=dt;return}
  lvT+=dt;shake*=Math.pow(.015,dt);if(shake<.4)shake=0;flashT-=dt;
  const L=LV[G.lv];
  updPlayer(dt);if(G.state!=='play')return;
  for(const q of spawnQ)q.t-=dt;while(spawnQ.length&&spawnQ[0].t<=0){const q=spawnQ.shift();spawnEnemy(q.type,q.side)}
  for(const e of en)updEnemy(e,dt);en=en.filter(e=>!e.dead);
  for(let i=0;i<en.length;i++)for(let j=i+1;j<en.length;j++){const a=en[i],b=en[j];if(a.fly!==b.fly)continue;const d=b.x-a.x,m=(a.w+b.w)*.45;if(Math.abs(d)<m){const push=(m-Math.abs(d))*.5*(d<0?-1:1);a.x-=push;b.x+=push}}
  if(boss&&!boss.dead)updBoss(boss,dt);
  updShots(dt);updHz(dt);updPicks(dt);
  if(!lock&&waveI<L.waves.length&&pl.x>L.trig[waveI]){lock=true;spawnWave(L.waves[waveI]);showBanner('Hostiles','Wave '+(waveI+1)+' of '+L.waves.length,1.4);S.warn()}
  if(lock&&!boss&&!spawnQ.length&&!en.length){lock=false;waveI++;G.score+=250;showBanner(waveI>=L.waves.length?(L.boss?'The Throne Awaits':'Path Clear'):'Go','',1.3)}
  if(L.boss&&waveI>=L.waves.length&&!boss&&!bossDone&&pl.x>L.len-W+200)startBoss();
  if(!L.boss&&waveI>=L.waves.length&&pl.x>L.len-230){levelComplete();return}
  if(bossDone&&doneT>0){doneT-=dt;if(doneT<=0){victory();return}}
  if(!lock){const tgt=Math.max(0,Math.min(arenaCam(),pl.x-W*.38));cam+=(tgt-cam)*Math.min(1,dt*6)}
  else if(boss&&boss.state==='enter')cam+=(arenaCam()-cam)*Math.min(1,dt*3);
  for(const k in P)delete P[k]}

/* ---------- screens ---------- */
const scr=document.getElementById('scr'),card=document.getElementById('card'),pad=document.getElementById('pad');
function padShow(v){pad.hidden=!(v&&touchy)}
function hideCard(){scr.hidden=true}
function showCard(o){card.innerHTML=(o.ey?`<p class="eyebrow">${o.ey}</p>`:'')+(o.big?`<h1>${o.h}</h1>`:`<h2>${o.h}</h2>`)+(o.tag?`<p class="tag">${o.tag}</p>`:'')+
  (o.b?`<div class="body">${o.b}</div>`:'')+(o.extra||'')+`<div class="row"></div>`;
  const row=card.querySelector('.row');(o.btns||[]).forEach(([label,fn,alt])=>{const b=document.createElement('button');b.className='btn'+(alt?' alt':'');b.textContent=label;
    b.addEventListener('click',()=>{initAudio();sfx(520,.08,'triangle',.05,200);fn()});row.appendChild(b)});
  scr.hidden=false;card.scrollTop=0;const f=row.querySelector('button');if(f&&!touchy)setTimeout(()=>f.focus(),30)}
function story(pages,i,done){const p=pages[i];showCard({ey:p.ey,h:p.h,b:p.b,btns:[[i<pages.length-1?'Continue':'Onward',()=>i<pages.length-1?story(pages,i+1,done):done()],...(i<pages.length-1?[['Skip',done,1]]:[])]})}
function toTitle(){G.state='menu';G.paused=false;padShow(false);menuBG();
  showCard({ey:'A Starblade Saga · Six Chapters',h:'Aetherfall',big:1,tag:'The last knight. The last blade. The last light before the Rift.',
    b:G.best?`<p>Best score ${G.best.toLocaleString()}</p>`:'',
    btns:[['Begin the Saga',()=>{goFull();G.score=0;story(STORY.intro,0,()=>briefing(0))}],['Chapters',chapters,1],['Controls',controls,1]]})}
function chapters(){const g=LV.map((L,i)=>`<button data-i="${i}" ${i>=unlocked?'disabled':''}><span>${L.ch}</span><b>${L.name}</b></button>`).join('');
  showCard({ey:'Choose a chapter',h:'The Road to the Rift',extra:`<div class="lvgrid">${g}</div>`,btns:[['Back',toTitle,1]]});
  card.querySelectorAll('.lvgrid button').forEach(b=>b.addEventListener('click',()=>{initAudio();goFull();G.score=0;briefing(+b.dataset.i)}))}
function controls(){showCard({ey:'How to fight',h:'Controls',extra:`<div class="keys">
  <kbd>Thumbstick / A D</kbd><span>Move. Touch anywhere on the left side of the screen and slide</span><kbd>▲ / W / Space</kbd><span>Jump. Tap again in the air to double jump</span>
  <kbd>⚔ / J / X</kbd><span>Starblade strike. Tap three times for a combo. Slash enemy orbs to send them back</span>
  <kbd>✦ / K / C</kbd><span>Starburst wave. Costs half your Aether bar, which fills as you land hits</span>
  <kbd>» / L / Shift</kbd><span>Dash. You can't be hit while dashing, so dash through attacks</span>
  <kbd>II / Esc / P</kbd><span>Pause</span></div>`,b:`<p>Clear each wave to move on. Reach the gate at the end of each chapter. In Chapter VI, Malakar's beams come high or low: jump the low ones, stay grounded under the high ones.</p>`,btns:[['Back',toTitle]]})}
function briefing(i){G.state='card';padShow(false);showCard({ey:LV[i].ch,h:LV[i].name,b:STORY.brief[i],btns:[['Fight',()=>startLevel(i)]]})}
function startLevel(i){G.lv=i;G.chapterStart=G.score;pl=newPlayer();en=[];rings=[];shots=[];parts=[];picks=[];texts=[];hz=[];spawnQ=[];cam=0;lock=false;waveI=0;boss=null;bossDone=false;lvT=0;doneT=0;hitStop=0;shake=0;
  bg=buildBG(LV[i]);G.state='play';G.paused=false;hideCard();padShow(true);clearInput();showBanner(LV[i].ch,LV[i].name,2.6)}
function levelComplete(){G.state='card';G.score+=Math.round(pl.hp*20);G.best=Math.max(G.best,G.score);unlocked=Math.max(unlocked,G.lv+2);saveProg();padShow(false);clearInput();
  showCard({ey:LV[G.lv].ch+' complete',h:LV[G.lv].name,b:`<p>${STORY.clear[G.lv]}</p><p>Score ${G.score.toLocaleString()}</p>`,btns:[['Continue',()=>briefing(G.lv+1)],['Title',toTitle,1]]})}
function gameOver(){G.state='over';G.best=Math.max(G.best,G.score);saveProg();padShow(false);clearInput();setTimeout(()=>showCard({ey:'Kael has fallen',h:'The Light Fades',
  b:`<p><span class="who">LYRA:</span> "Not yet. Get up, Kael. I won't let the dark have you."</p>`,btns:[['Retry chapter',()=>{G.score=G.chapterStart;startLevel(G.lv)}],['Title',toTitle,1]]}),900)}
function victory(){G.state='card';padShow(false);clearInput();G.score+=Math.round(pl.hp*50);unlocked=6;saveProg();G.best=Math.max(G.best,G.score);
  story(STORY.ending,0,()=>showCard({ey:'The saga is complete',h:'Ithra Is Free',big:0,b:`<p>Final score <b>${G.score.toLocaleString()}</b></p><p>Thank you for playing Aetherfall.</p>`,btns:[['Play again',()=>{G.score=0;briefing(0)}],['Title',toTitle,1]]}))}
function togglePause(){if(G.state!=='play')return;G.paused=!G.paused;clearInput();
  if(G.paused){padShow(false);showCard({ey:LV[G.lv].ch,h:'Paused',btns:[['Resume',togglePause],['Restart chapter',()=>{G.score=G.chapterStart;startLevel(G.lv)},1],['Quit to title',toTitle,1]]})}
  else{hideCard();padShow(true)}}
document.getElementById('pauseBtn').addEventListener('pointerdown',e=>{e.preventDefault();togglePause()});
function goFull(){try{const d=document.documentElement;if(touchy&&!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(_){}}).catch(()=>{})}catch(e){}}
addEventListener('blur',()=>{if(G.state==='play'&&!G.paused)togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play'&&!G.paused)togglePause()});
</script>
