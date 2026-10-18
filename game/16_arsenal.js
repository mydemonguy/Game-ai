<script>
"use strict";
/* ---------- arsenal: Stardust currency, Starblood relics (equip 3 at a save station), Claude's Exchange,
   Guardian Arms (each defeated guardian's weapon as a sub-weapon) and the Boss Rush mode ---------- */
/* ---- Stardust ---- */
function addDust(n,x,y){if(!n)return;n*=hasR('lucky')?2:1;META.dust=(META.dust||0)+n;if(x!=null)ftext(x,y,'◆ '+n,'#ffd27a')}
/* ---- relics: w = world where Claude starts stocking it ---- */
const RELICS=[
 {id:'lode',  name:'Lodestone',     txt:'Pickups fly to you from far away.',              cost:60, w:0,col:'#9ad0ff'},
 {id:'swift', name:'Swift Talons',  txt:'Claw attacks recover 25% faster.',               cost:110,w:0,col:'#ffb08a'},
 {id:'reach', name:'Long Claws',    txt:'Claw reach +30%.',                               cost:90, w:0,col:'#ffe066'},
 {id:'siphon',name:'Soul Siphon',   txt:'Every robot you free heals 3 HP.',               cost:120,w:0,col:'#7dffb0'},
 {id:'stone', name:'Stone Scales',  txt:'Take 20% less damage.',                          cost:140,w:1,col:'#c8c0b0'},
 {id:'battery',name:'Aether Battery',txt:'Aether charges 40% faster; enter rooms half full.',cost:100,w:1,col:'#5ce1ff'},
 {id:'thorn', name:'Thorn Hide',    txt:'When hit, a burst of spines hurts nearby robots.', cost:90, w:2,col:'#ff8a8a'},
 {id:'comet', name:'Comet Tail',    txt:'Dash recharges twice as fast and hurts robots.',  cost:150,w:2,col:'#b48cff'},
 {id:'fury',  name:'Fury Heart',    txt:'Fury lasts twice as long; +30% damage below 30% HP.',cost:120,w:3,col:'#ffb347'},
 {id:'lucky', name:'Lucky Egg',     txt:'Double Stardust from everything.',               cost:160,w:3,col:'#ffe08a'}];
const RSLOTS=3;
const hasR=id=>!!(META.eq&&META.eq.includes(id));
const maxArea=()=>Math.max(0,...Object.keys(META.areas||{}).map(Number));
/* ---- Claude's Exchange: buy and equip relics, plus a couple of consumables ---- */
function exchangeCard(back){back=back||pauseCard;META.relics=META.relics||{};META.eq=META.eq||[];const stock=RELICS.filter(r=>r.w<=maxArea()),d=META.dust||0;
  const row=r=>{const own=META.relics[r.id],on=META.eq.includes(r.id),can=d>=r.cost;
    const btn=own?`<button class="btn ${on?'':'alt'}" data-r="${r.id}">${on?'Equipped':'Equip'}</button>`:`<button class="btn alt" data-b="${r.id}" ${can?'':'disabled style="opacity:.4"'}>◆ ${r.cost}</button>`;
    return`<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid rgba(180,140,255,.18);padding:8px 0">
      <div><b style="color:${r.col}">${own?'◆':'◇'} ${r.name}</b><br><span style="opacity:.8">${r.txt}</span></div>${btn}</div>`};
  const cons=[['heal','Repair kit','Restore all health.',20],['egg','Golden Egg','One extra life (up to 5).',70]].map(([id,n,t,c])=>`<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid rgba(180,140,255,.18);padding:8px 0">
      <div><b style="color:#ffd27a">${n}</b><br><span style="opacity:.8">${t}</span></div><button class="btn alt" data-c="${id}" data-p="${c}" ${d>=c?'':'disabled style="opacity:.4"'}>◆ ${c}</button></div>`).join('');
  showCard({ey:"Claude's Exchange",h:'Relics',tag:`Stardust ◆ ${d} · Relics equipped ${META.eq.length}/${RSLOTS}`,
    b:`<p>${CL} "${stock.length<RELICS.length?'More relics turn up as you reach new worlds. ':''}Equip up to ${RSLOTS}, and swap them at any save station."</p>`,
    extra:`<div>${stock.map(row).join('')}${cons}</div>`,btns:[['Done',back]]});
  card.querySelectorAll('[data-b]').forEach(b=>b.addEventListener('click',()=>{const r=RELICS.find(q=>q.id===b.dataset.b);if((META.dust||0)<r.cost)return;META.dust-=r.cost;META.relics[r.id]=1;
    if(META.eq.length<RSLOTS)META.eq.push(r.id);saveMeta();sfxItemGet();exchangeCard(back)}));
  card.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.r,i=META.eq.indexOf(id);if(i>=0)META.eq.splice(i,1);else{if(META.eq.length>=RSLOTS)META.eq.shift();META.eq.push(id)}
    saveMeta();sfxUI(1);exchangeCard(back)}));
  card.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.p;if((META.dust||0)<c)return;META.dust-=c;if(b.dataset.c==='heal'&&pl)pl.hp=pl.max;else G.lives=Math.min(5,G.lives+1);
    saveMeta();sfxPick(b.dataset.c==='heal'?'med':'egg');exchangeCard(back)}))}

/* ---- Guardian Arms: beat a guardian, take its weapon. ◈ fires, tapping the label switches ---- */
const ARMS=[
 {name:'Rivet Spray',    g:0,cost:15,col:'#ffe066',how:'Lobs a spread of hot rivets.'},
 {name:'Aegis Shield',   g:1,cost:30,col:'#ffcc4a',how:'A shield in front of you eats enemy shots for 3 seconds.'},
 {name:'Thruster Dash',  g:2,cost:20,col:'#ff9638',how:'A blazing dash that burns through robots.'},
 {name:'Slag Mortar',    g:3,cost:25,col:'#ff6418',how:'A molten shell that bursts where it lands.'},
 {name:'Crystal Feathers',g:4,cost:20,col:'#a8f0ff',how:'A fan of piercing crystal feathers.'}];
const ownArm=i=>i>=0&&!!(META.guards&&META.guards[ARMS[i].g]);
function cycleArm(){const own=ARMS.map((_,i)=>i).filter(ownArm);if(!own.length)return;const i=own.indexOf(META.arm);META.arm=own[(i+1)%own.length];padArms();if(!smp('weapon_change',{v:.5}))sfxUI(1);
  if(pl)ftext(pl.x,pl.y-220,ARMS[META.arm].name,ARMS[META.arm].col)}
function fireArm(p){const i=META.arm;if(!ownArm(i))return;const A=ARMS[i];if(p.en<A.cost){if(hintT<=0){hintT=1;ftext(p.x,p.y-210,'Not enough Aether','#9d97bd')}return}
  p.en-=A.cost;p.armCD=.35;if(i!==1)smp('blaster',{v:.32,rate:[1.25,1,.8,.7,1.4][i]});const x=p.x+p.face*60,y=p.y-100,f=p.face,dmg=pdm();muzzle(x,y,A.col);buzz(15);
  if(i===0){for(let k=0;k<3;k++)shots.push({x,y,vx:f*(620+k*230),vy:-520-k*60,g:1500,r:14,dmg:12*dmg,friend:true,life:1.6,col:A.col,hit:new Set()});sfxEnemy('shot',{x,y,type:'d'})}
  else if(i===1){p.aegis=3;sfxBlock();ring(p.x+f*110,p.y-95,A.col,150)}
  else if(i===2){p.dashT=.32;p.thr=1;p.thrHit=new Set();p.inv=Math.max(p.inv,.4);p.atk=0;sfxDash();shake=6}
  else if(i===3){shots.push({x,y:y-20,vx:f*820,vy:-760,g:1500,r:22,dmg:20*dmg,friend:true,life:2.4,col:A.col,hit:new Set(),boom:1});sfxEnemy('smash',{x,y})}
  else{for(let k=-2;k<=2;k++){const a=k*.13;shots.push({x,y,vx:f*Math.cos(a)*1300,vy:Math.sin(a)*1300,r:14,dmg:14*dmg,friend:true,life:.75,pierce:true,hit:new Set(),col:A.col})}sfxEnemy('shot',{x,y,type:'c'})}}
/* explosion of a slag shell (friendly) */
function slagBoom(s){burst(s.x,FY-30,'#ff6418',26,800);ring(s.x,FY-40,'#ffb040',190);shake=Math.max(shake,8);S.boom();
  for(const e of allTargets())if(Math.abs(e.x-s.x)<180+e.w/2&&e.y-e.h<FY&&Math.abs(e.y-FY)<e.h+120)damage(e,40*pdm(),Math.sign(e.x-s.x)*500);hitBoxesWith({x:s.x-180,y:FY-200,w:360,h:200},new Set())}
const ARMSVG=['M5 18l4-4M9 18l4-4M13 18l4-4M6 9a6 6 0 0 1 12 0','M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6Z','M4 12h10M10 7l6 5-6 5M3 7h5M3 17h5','M12 4c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10Z','M4 18L18 6M8 18l10-8M12 18l6-4'];
function padArms(){const b=document.querySelector('.act.arm'),c=document.querySelector('.armc'),own=ARMS.some((_,i)=>ownArm(i));if(!b)return;
  if(own&&!ownArm(META.arm))META.arm=ARMS.findIndex((_,i)=>ownArm(i));b.hidden=!own;c.hidden=!own;if(!own)return;const A=ARMS[META.arm];
  b.style.setProperty('--glow',A.col);b.style.borderColor=A.col;b.style.color=A.col;b.querySelector('path').setAttribute('d',ARMSVG[META.arm]);c.textContent=A.name+' · '+A.cost;c.style.borderColor=A.col;c.style.color=A.col}
document.querySelector('.armc').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();cycleArm()});

/* ---- Boss Rush: every guardian then Malakar, back to back, on a temporary save ---- */
const RUSH=['0-4','1-4','2-4','3-4','4-4','5-8'];
function rushBest(){try{return+localStorage.getItem('aetherfall_rush')||0}catch(e){return 0}}
const fmtT=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}.${Math.floor(t*10%10)}`;
function startRush(){goFull();const real=META;G.realMeta=real;const m=freshMeta();for(const A of ABIL)m.ab[A.id]=1;for(let a=0;a<6;a++){m.tanks[a+'-0']=1;m.tanks[a+'-1']=1}
  m.relics=Object.assign({},real.relics);m.eq=(real.eq||[]).slice();m.items=Object.assign({},real.items);m.guards={};m.areas={0:1,1:1,2:1,3:1,4:1,5:1};m.met={0:1,1:1,2:1,3:1,4:1,5:1};m.arm=-1;META=m;
  G.rush={i:0,t:0,next:0};G.score=0;G.lives=3;startGame(RUSH[0],{x:W*.72,y:GY});showBanner('Boss Rush','Fight 1 of 6',2)}
function rushEnd(){if(G.rush&&G.realMeta){META=G.realMeta;G.realMeta=null}G.rush=null}
function rushTick(dt){const R=G.rush;if(!R)return;R.t+=dt;if(R.next>0){R.next-=dt;if(R.next<=0&&R.i<RUSH.length-1){R.i++;startTrans({rush:R.i})}}}
function rushDone(){const t=G.rush.t,best=rushBest(),nb=!best||t<best;if(nb)try{localStorage.setItem('aetherfall_rush',t.toFixed(1))}catch(e){}rushEnd();G.state='card';padShow(false);clearInput();musicPlay('victory');
  showCard({ey:'Boss Rush complete',h:fmtT(t),b:`<p>${nb?'<b style="color:#ffd27a">New best time!</b>':'Best time '+fmtT(best)}</p><p>Every guardian and the Void Sovereign, back to back. The Starblood would be proud.</p>`,btns:[['Again',startRush],['Title',toTitle,1]]})}
function rushFail(){const R=G.rush;rushEnd();setTimeout(()=>showCard({ey:'Boss Rush',h:'Tyko is down',b:`<p>You reached fight ${R.i+1} of 6 in ${fmtT(R.t)}.</p>`,btns:[['Try again',startRush],['Title',toTitle,1]]}),900)}
</script>
