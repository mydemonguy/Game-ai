<script>
"use strict";
/* ---------- flow: map card, screens, game loop and the Phaser game itself ---------- */
function drawAreaMap(g,a,ox,oy,cs,opt){opt=opt||{};const rooms=AREAS[a];
  for(const o of rooms){const seen=META.map[o.id];if(!seen&&!(META.mapped&&META.mapped[a]))continue;const x=ox+o.gx*cs,y=oy+o.gy*cs,w=o.w*cs,h=o.h*cs;
    if(!seen){g.fillStyle='#24142e';g.fillRect(x+1,y+1,w-2,h-2);g.strokeStyle='#6a4a7a';g.lineWidth=Math.max(2,cs*.05);g.strokeRect(x+1,y+1,w-2,h-2);continue}
    g.fillStyle=o.kind==='save'?'#2a8a5a':o.kind==='boss'?'#8a1a3a':'#a8327a';g.fillRect(x+1,y+1,w-2,h-2);
    g.strokeStyle='rgba(255,200,240,.35)';g.lineWidth=1;for(let i=1;i<o.w;i++){g.beginPath();g.moveTo(x+i*cs,y+2);g.lineTo(x+i*cs,y+h-2);g.stroke()}for(let i=1;i<o.h;i++){g.beginPath();g.moveTo(x+2,y+i*cs);g.lineTo(x+w-2,y+i*cs);g.stroke()}
    g.strokeStyle='#ffd0f0';g.lineWidth=Math.max(2,cs*.07);g.strokeRect(x+1,y+1,w-2,h-2);
    for(const d of o.doors){const dy=y+d.row*cs+cs*.55;g.fillStyle='#ffe08a';g.fillRect(d.side==='L'?x-2:x+w-3,dy-cs*.14,5,cs*.28)}
    const ic=(t,col,ix)=>{g.fillStyle=col;g.font=`700 ${Math.round(cs*.5)}px ${FU}`;g.textAlign='center';g.fillText(t,x+(ix||w/2),y+cs*.68)};
    if(o.kind==='save')ic('S','#c8ffe0');if(o.lift)ic(o.lift.dir>0?'▼':'▲','#bff0ff');if(o.kind==='boss')ic('☠','#ffd0dc');
    if(o.shrine&&o.shrine.ab&&!hasAb(o.shrine.ab))ic(gDone(o.a)?'★':'☠',gDone(o.a)?'#ffe08a':'#ff9aa8');
    genRoom(o);for(const it of o.items){if(!it.id||(it.type==='tank'?META.tanks[it.id]:META.items[it.id]))continue;g.fillStyle=it.type==='tank'?'#ff9ae8':'#ffe08a';g.beginPath();g.arc(x+it.x/o.RW*w,y+cs*.3,Math.max(2.5,cs*.1),0,7);g.fill()}}
  if(opt.me&&ROOM&&ROOM.a===a){const o=ROOM,px=ox+o.gx*cs+pl.x/o.RW*o.w*cs,py=oy+o.gy*cs+Math.min(o.h-.2,pl.y/H)*cs;{g.fillStyle='#ffffff';g.beginPath();g.arc(px,py-cs*.15,Math.max(3,cs*.13),0,7);g.fill()}}}
function mapCardHTML(){return`<canvas id="mapc" width="1100" height="520" style="width:auto;height:auto;max-width:100%;max-height:min(44vh,300px);background:#0a0814;border:1px solid rgba(180,140,255,.35)"></canvas>`}
function paintMapCard(){const c=document.getElementById('mapc');if(!c)return;const g=c.getContext('2d'),a=G.lv,rooms=AREAS[a];let mw=0,mh=0;for(const o of rooms){mw=Math.max(mw,o.gx+o.w);mh=Math.max(mh,o.gy+o.h)}
  const cs=Math.min((c.width-80)/mw,(c.height-90)/mh),ox=(c.width-mw*cs)/2,oy=60;g.fillStyle='#0a0814';g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(120,200,255,.1)';g.lineWidth=1;for(let i=0;i<=mw;i++){g.beginPath();g.moveTo(ox+i*cs,oy);g.lineTo(ox+i*cs,oy+mh*cs);g.stroke()}for(let i=0;i<=mh;i++){g.beginPath();g.moveTo(ox,oy+i*cs);g.lineTo(ox+mw*cs,oy+i*cs);g.stroke()}
  drawAreaMap(g,a,ox,oy,cs,{me:1});g.fillStyle='#ece7ff';g.font=`700 30px ${FD}`;g.textAlign='left';g.fillText(LV[a].name.toUpperCase(),24,40);
  const t=[0,1].filter(k=>META.tanks[a+'-'+k]).length;g.textAlign='right';g.font=`600 22px ${FU}`;g.fillStyle='#ff9ae8';g.fillText(`Energy Tanks ${t}/2`,c.width-24,40)}
function abilitiesHTML(){return `<div class="keys">${ABIL.map(a=>`<kbd style="color:${hasAb(a.id)?a.col:'#55507a'}">${hasAb(a.id)?'◆':'◇'} ${a.name}</kbd><span>${hasAb(a.id)?a.how:'Not found yet'}</span>`).join('')}
  <kbd style="color:#ff5ad8">Energy Tanks</kbd><span>${tankCount()} of 12 found · max health ${maxHP()}</span>
  <kbd style="color:#7fe9ff">Aether Cores</kbd><span>${coreCount()} of 5 · beat the shrine guardians · Aether charges ${Math.round((AG()-1)*100)}% faster</span></div>`}
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
function toTitle(){G.state='menu';if(G.paused&&SC)SC.scene.resume();G.paused=false;TRANS.on=0;padShow(false);menuBG();musicFor();
  const sv=META.save,found=Object.keys(META.map).length,tot=Object.keys(ROOMS).length;
  showCard({ey:'A Starblood Saga · Six Worlds',h:'Aetherfall',big:1,tag:'One small dino. One stolen sky. One very big Rift.',
    b:(sv?`<p>Save: ${LV[ROOMS[sv.room].a].name} · Map ${Math.round(found/tot*100)}% · Items ${completion()}%</p>`:'')+(G.best?`<p>Best score ${G.best.toLocaleString()}</p>`:''),
    btns:[...(sv?[['Continue',()=>{goFull();continueGame()}]]:[]),[sv?'New game':'Begin the Saga',sv?confirmNew:beginSaga,!!sv],['Controls',controls,1],['Settings',soundCard,1]]})}
function confirmNew(){showCard({ey:'New game',h:'Start over?',b:'<p>This erases your map, abilities and energy tanks.</p>',btns:[['Start over',beginSaga],['Back',toTitle,1]]})}
function soundCard(back){back=typeof back==='function'?back:toTitle;const sl=(id,lab,v)=>`<label class="vol"><span>${lab}</span><input type="range" id="${id}" min="0" max="100" value="${Math.round(v*100)}"></label>`;
  const gq=`<label class="vol"><span>Graphics</span><span class="gq">${['high','balanced','fast'].map(q=>`<button class="btn ${FX.quality===q?'':'alt'}" data-q="${q}">${QUAL[q].name}</button>`).join(' ')}</span></label>`;
  showCard({ey:'Settings',h:'Sound & graphics',extra:`<div class="vols">${sl('vMus','Music',VOL.music)}${sl('vSfx','Effects',VOL.sfx)}${gq}</div>`,b:'<p>High draws at full screen resolution. Balanced and Fast draw fewer pixels and stretch them up, for a steadier frame rate. The game steps down by itself if it starts to stutter.</p>',btns:[['Done',back]]});
  card.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{setQuality(b.dataset.q);PERF.drops=2;sfxUI(1);soundCard(back)}));
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
  b:`<p><span class="who">LYRA:</span> "Not yet, little one. Get up. I won't let the dark have you."</p>`,btns:[...(META.save?[['Continue from save',()=>continueGame()]]:[]),['Retry this room',()=>{G.lives=3;startGame(rid,ent)},1],['Title',toTitle,1]]}),900)}
function victory(){G.state='card';padShow(false);clearInput();G.score+=Math.round(pl.hp*50);unlocked=6;saveProg();G.best=Math.max(G.best,G.score);musicPlay('victory');
  const found=Object.keys(META.map).length,tot=Object.keys(ROOMS).length;
  story(STORY.ending,0,()=>showCard({ey:'The saga is complete',h:'Ithra Is Free',big:0,b:`<p>Final score <b>${G.score.toLocaleString()}</b></p><p>Items collected <b>${completion()}%</b> · Map explored ${Math.round(found/tot*100)}%</p><p>Energy tanks ${tankCount()}/12 · Eggs ${[0,1,2,3,4,5].filter(a=>META.items['egg'+a]).length}/6 · Aether cores ${coreCount()}/5 · Guardians ${[0,1,2,3,4].filter(a=>gDone(a)).length}/5</p><p>Thank you for playing Aetherfall.</p>`,btns:[['Play again',beginSaga],['Title',toTitle,1]]}))}
function pauseCard(){showCard({ey:LV[G.lv].ch+' · '+LV[G.lv].name,h:'Paused',extra:mapCardHTML()+`<p class="tag" style="margin:.4em 0">Map ${Object.keys(META.map).length}/${Object.keys(ROOMS).length} rooms · Items ${completion()}%</p>`+abilitiesHTML(),
  btns:[['Resume',togglePause],['Settings',()=>soundCard(pauseCard),1],['Controls',()=>controls(pauseCard),1],['Quit to title',toTitle,1]]});paintMapCard()}
function togglePause(){if(G.state!=='play'||!SC)return;G.paused=!G.paused;clearInput();
  if(G.paused){padShow(false);sfxPause(1);musicDuck(1);SC.scene.pause();pauseCard()}
  else{hideCard();padShow(true);sfxPause(0);musicDuck(0);SC.scene.resume()}}
document.getElementById('pauseBtn').addEventListener('pointerdown',e=>{e.preventDefault();togglePause()});
function goFull(){try{const d=document.documentElement;if(touchy&&!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(_){}}).catch(()=>{})}catch(e){}}
addEventListener('blur',()=>{if(G.state==='play'&&!G.paused)togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(G.state==='play'&&!G.paused)togglePause();audioSuspend(1)}else audioSuspend(0)});
const SPB=document.querySelector('.act.sp'),DSB=document.querySelector('.act.dsh');let padE=-1,padC=-1;
function syncPad(){if(pad.hidden||!pl)return;const e=Math.round(pl.en/5)/20,c=Math.round(Math.max(0,Math.min(1,1-pl.dashCD/.75))*10)/10;
  if(e!==padE){padE=e;SPB.style.setProperty('--e',e);SPB.classList.toggle('ready',pl.en>=50)}
  if(c!==padC){padC=c;DSB.style.setProperty('--c',c)}}

/* ---------- the game loop: input -> AI -> Arcade physics step -> world logic -> camera ---------- */
const clearP=()=>{for(const k in P)delete P[k]};
function gameUpdate(dt){if(banner){banner.life-=dt;if(banner.life<=0)banner=null}
  if(TRANS.on){updTrans(dt);clearP();return}
  if(hitStop>0){hitStop-=dt;return}
  lvT+=dt;shake*=Math.pow(.015,dt);if(shake<.4)shake=0;flashT-=dt;
  updPlayerPre(dt);
  for(const q of spawnQ)q.t-=dt;while(spawnQ.length&&spawnQ[0].t<=0){const q=spawnQ.shift();spawnEnemy(q.type,q.side)}
  for(const e of en){updEnemy(e,dt);ePush(e)}
  if(boss&&!boss.dead)updBoss(boss,dt);
  plPush();physStep(dt);plPull();
  for(const e of en)ePull(e);
  updPlayerPost(dt);if(G.state!=='play')return;
  for(const e of en)if(e.dead)eKill(e);en=en.filter(e=>!e.dead);
  for(let i=0;i<en.length;i++)for(let j=i+1;j<en.length;j++){const a=en[i],b=en[j];if(a.fly!==b.fly||Math.abs(a.y-b.y)>200)continue;const d=b.x-a.x,m=(a.w+b.w)*.45;
    if(Math.abs(d)<m){const push=(m-Math.abs(d))*.5*(d<0?-1:1);a.x-=push;b.x+=push;if(a.body)a.body.x-=push;if(b.body)b.body.x+=push}}
  updShots(dt);updHz(dt);updPicks(dt);updBoxes(dt);updAtmos(dt);updWorld(dt);if(G.state!=='play'||TRANS.on){clearP();return}
  if(pl.dead&&G.respawnT>0){G.respawnT-=dt;pl.deadT+=dt;if(G.respawnT<=0){const e=ROOM.entry;pl.dead=0;plTeleport(e.x,e.y);pl.hp=pl.max;pl.inv=2.5;pl.en=Math.max(pl.en,50);pl.hits=0;
    if(lock){const rx=clamp(pl.x,cam+200,cam+W-RSAFE-200);plTeleport(rx,FY)}showBanner('Back on your feet','Lives left: '+G.lives,1.6);ring(pl.x,pl.y-90,'#ffe08a',220);burst(pl.x,pl.y-90,'#ffe08a',30,700);sfxRevive()}}
  if(boss&&boss.state==='enter'&&boss.guard==null){cam+=(arenaCam()-cam)*Math.min(1,dt*3);camY+=(Math.max(0,RH-H)-camY)*Math.min(1,dt*3)}else updCamera(dt);
  clearP()}
/* title backdrop: a world's gate corridor with the camera drifting along it */
function menuBG(){clearEnemies();killAllViews();pl=null;shots=[];hz=[];picks=[];boxes=[];boss=null;banner=null;shake=0;lock=false;
  const a=Math.min(unlocked,6)-1;enterRoom(a+'-6',{x:300,y:GY});cam=0;camY=0}
function render(dt){const c=SC.cameras.main,sx=shake?(Math.random()-.5)*shake*2:0,sy=shake?(Math.random()-.5)*shake*2:0,k=1+FX.kz;
  /* the camera zoom maps the 1080-tall stage onto the (smaller) canvas; a kick zooms in a little more around the centre */
  if(c.zoom!==RS*k)c.setZoom(RS*k);c.setScroll(Math.round(cam+sx+W/2*(1-1/k)),Math.round(camY+sy+H/2*(1-1/k)));bgUpdate(dt);roomUpdate(dt);actorsUpdate();drawSkyFx();applyLighting()}
/* adaptive quality: if play runs below ~50 fps for a few seconds, step the render scale down (High -> Balanced -> Fast) */
const PERF={t0:0,n:0,warm:0,drops:0};
function perfWatch(dt){if(G.state!=='play'||TRANS.on||FX.quality==='fast'||PERF.drops>=2){PERF.t0=0;return}const now=performance.now();
  if(!PERF.t0){PERF.t0=now;PERF.n=0;return}PERF.n++;const el=(now-PERF.t0)/1000;if(el<4)return;const fps=PERF.n/el;PERF.t0=0;
  if(PERF.warm<1){PERF.warm++;return}
  if(fps<50){PERF.drops++;const q=FX.quality==='high'?'balanced':'fast';setQuality(q);showBanner('Graphics: '+QUAL[q].name,'Adjusted for a smoother frame rate',2)}}

/* ---------- Phaser scenes ---------- */
class BootScene extends Phaser.Scene{
  constructor(){super('boot')}
  preload(){this.load.spritesheet('dino',DINO.src,{frameWidth:DINO.fw,frameHeight:DINO.fh})}
  create(){TX=this.textures;bakeCommon();const go=()=>{this.scene.start('game');this.scene.launch('hud')};
    if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load(`900 40px ${FD}`),document.fonts.load(`700 20px ${FU}`),document.fonts.load(`600 20px ${FU}`)]).then(go,go);else go()}}
class GameScene extends Phaser.Scene{
  constructor(){super('game')}
  create(){physInit(this);fxInit(this);mkPlayerView();ovInit();
    const lay=()=>{this.cameras.main.setSize(this.scale.width,this.scale.height).setOrigin(0,0).setZoom(RS);fxResize()};this.scale.on('resize',lay);lay();
    toTitle();initAudio()}
  update(time,delta){const dt=Math.min(.033,Math.max(0,delta/1000));
    try{if(G.state==='play'&&!G.paused){gameUpdate(dt);perfWatch(dt)}
      else if(G.state==='over'){lvT+=dt;shake*=.9;if(pl)pl.deadT=(pl.deadT||0)+dt;if(pl){plPush();physStep(dt);plPull()}}
      else if(G.state==='menu'||G.state==='card'){lvT+=dt;if(G.state==='menu'){cam+=dt*70;if(cam>Math.max(0,RW-W))cam=0}}
      render(dt)}catch(err){console.error(err)}}}

/* music scheduling and the touch-pad rings run from the HUD scene, which keeps ticking while the game scene is paused */
const _hudUpd=HudScene.prototype.update;HudScene.prototype.update=function(){_hudUpd.call(this);musicTick();syncPad()};

fit();
window.GAME=new Phaser.Game({type:/[?&]canvas/.test(location.search)?Phaser.CANVAS:Phaser.AUTO,parent:'stage',width:Math.round(W*RS),height:Math.round(H*RS),backgroundColor:'#07060f',banner:false,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:3300},debug:false,isPaused:true}},
  render:{antialias:true,antialiasGL:false,powerPreference:'high-performance',batchSize:4096,clearBeforeRender:true},fps:{target:60,limit:95,smoothStep:true},
  input:{keyboard:false,mouse:false,touch:false,gamepad:false},audio:{noAudio:true},
  scene:[BootScene,GameScene,HudScene]});
document.addEventListener('pointerdown',()=>initAudio(),true);addEventListener('keydown',()=>initAudio(),true);
</script>
