<script>
"use strict";
/* ---------- effects: GPU particles, rings, floating numbers, light map, weather, lightning, post-processing ---------- */
const D={sky:0,stars:1,skyfx:2,far:3,fog:4,mid:5,walls:6,signs:7,back:8,props:9,lamps:10,vents:11,solids:12,plats:13,fixtures:14,doors:15,crates:16,picks:17,hz:18,
  shadows:19,enemies:20,boss:21,player:22,drones:23,shots:24,parts:25,rings:26,light:30,fg:31,weather:32,flash:33,texts:34};
const FX={em:{},rings:[],texts:[],ri:0,ti:0,holes:[],lights:[],quality:'balanced',kz:0};
/* quality tiers: the game always thinks in a 1080-tall stage, but draws it into a smaller canvas (render scale) that the screen stretches up.
   Fill rate is the bottleneck on phone GPUs, so this is the big lever: Balanced draws 56% of the pixels, Fast 36%. */
const QUAL={high:{rs:1,part:1,name:'High'},balanced:{rs:.75,part:1,name:'Balanced'},fast:{rs:.6,part:.5,name:'Fast'}};
try{const q=localStorage.getItem('aetherfall_q2');if(QUAL[q])FX.quality=q}catch(e){}
let RS=QUAL[FX.quality].rs;
const PQ=()=>QUAL[FX.quality].part;
const hexC=c=>typeof c==='number'?c:c.startsWith('rgba')?(()=>{const m=c.match(/[\d.]+/g);return(+m[0]<<16)|(+m[1]<<8)|+m[2]})():hexN(c);
const alphaOf=c=>typeof c==='string'&&c.startsWith('rgba')?+c.match(/[\d.]+/g)[3]:1;

function fxInit(s){
  const mk=(tex,blend,depth,extra)=>s.add.particles(0,0,tex,Object.assign({emitting:false,lifespan:500,speed:0,alpha:{start:1,end:0},blendMode:blend,maxParticles:900},extra||{})).setDepth(depth);
  FX.em.add=mk('dot','ADD',D.parts);
  FX.em.norm=mk('puff','NORMAL',D.parts-.5,{alpha:{start:.5,end:0}});
  FX.em.glow=mk('glow','ADD',D.parts);
  FX.em.streak=mk('streak','ADD',D.parts);
  FX.em.chunk=mk('px','NORMAL',D.parts-.4,{alpha:{start:1,end:.6}});
  for(let i=0;i<28;i++){const r=s.add.image(0,0,'ring').setBlendMode('ADD').setDepth(D.rings).setVisible(false);FX.rings.push(r)}
  for(let i=0;i<34;i++){const t=s.add.text(0,0,'',{fontFamily:FU,fontStyle:'700',fontSize:'44px',color:'#ffffff',stroke:'rgba(0,0,0,.75)',strokeThickness:7}).setOrigin(.5,1).setDepth(D.texts).setVisible(false);FX.texts.push(t)}
  /* light map: a quarter-resolution darkness layer with soft holes punched at every light */
  FX.LS=4;FX.rt=s.add.renderTexture(0,0,Math.ceil(W/4),Math.ceil(H/4)).setOrigin(0).setScrollFactor(0).setScale(4).setDepth(D.light);
  FX.dimg=s.make.image({x:0,y:0,key:'dgrad',add:false}).setOrigin(0);
  for(let i=0;i<90;i++)FX.holes.push(s.make.image({x:0,y:0,key:'hole',add:false}));
  FX.flash=s.add.rectangle(0,0,W,H,0xffffff,0).setOrigin(0).setScrollFactor(0).setDepth(D.flash).setVisible(false);
  FX.bolt=s.add.graphics().setScrollFactor(0).setDepth(D.weather).setBlendMode('ADD')}
function fxResize(){if(!FX.rt)return;FX.rt.resize(Math.ceil(W/4),Math.ceil(H/4));FX.flash.setSize(W,H)}
/* no full-screen post-processing passes: on a 2400x1080 phone each one costs as much as drawing the whole scene again.
   Changing quality only changes the render scale (and particle density). */
function setQuality(q){if(!QUAL[q])return;FX.quality=q;try{localStorage.setItem('aetherfall_q2',q)}catch(e){}setRenderScale(QUAL[q].rs);if(V.bgA>=0)V.bgW=-1}
function setRenderScale(rs){RS=rs;if(window.GAME)GAME.scale.setGameSize(Math.round(W*RS),Math.round(H*RS))}
function gradeFor(){}
/* ---- particles: one generic call; every other effect is built from it ---- */
const PSC={add:14,norm:64,glow:60,streak:14,chunk:8};
function part(x,y,vx,vy,life,col,sz,g,kind){kind=kind||(typeof col==='string'&&col.startsWith('rgba')?'norm':'add');const em=FX.em[kind];if(!em)return;const p=em.emitParticle(1,x,y);if(!p)return;
  p.velocityX=vx;p.velocityY=vy;p.accelerationY=g||0;p.life=p.lifeCurrent=Math.max(30,life*1000);p.tint=hexC(col);p.scaleX=p.scaleY=sz/PSC[kind];return p}
function burst(x,y,col,n,sp){sp=sp||600;n=Math.ceil(n*(PQ()<1?.6:1));for(let i=0;i<n;i++){const a=Math.random()*6.283,v=sp*(.3+Math.random()*.7);part(x,y,Math.cos(a)*v,Math.sin(a)*v-120,.35+Math.random()*.45,col,4+Math.random()*6,900)}}
function sparks(x,y,col,n,dir){for(let i=0;i<n;i++){const a=(dir>0?0:Math.PI)+(Math.random()-.5)*1.6,v=700+Math.random()*900,p=part(x,y,Math.cos(a)*v,Math.sin(a)*v,.12+Math.random()*.16,col,10,600,'streak');if(p){p.angle=a*57.3-90;p.scaleX=.6;p.scaleY=.5+Math.random()*.4}}}
function dust(x,y){for(let i=0;i<8;i++)part(x+(Math.random()-.5)*60,y-6,(Math.random()-.5)*300,-Math.random()*200,.45,'rgba(220,210,255,.45)',18+Math.random()*14,300,'norm')}
function souls(x,y){for(let i=0;i<6;i++)part(x+(Math.random()-.5)*40,y,(Math.random()-.5)*60,-120-Math.random()*160,1.2,'#bff6ff',20,-40,'glow')}
function sparkle(x,y,col){for(let i=0;i<10;i++){const a=i/10*6.283;part(x,y,Math.cos(a)*260,Math.sin(a)*260,.5,col,16,0,'glow')}}
function debris(x,y,kind){const P=PAL[LV[G.lv].theme],cols=kind==='laser'?['#ff6a5a','#ffd0c0']:kind==='crystal'?['#ff5ad8','#2a0c2e']:[P.metal,P.light,P.dark];
  for(let i=0;i<(kind==='crate'?14:26);i++){const p=part(x+(Math.random()-.5)*80,y+Math.random()*(kind==='crate'?40:400),(Math.random()-.5)*900,-300-Math.random()*700,.9+Math.random()*.5,cols[i%cols.length],8+Math.random()*14,2200,'chunk');if(p)p.angle=Math.random()*360}}
function explode(e){const big=e.heavy;burst(e.x,e.y-e.h*.5,'#ffb347',big?22:12,big?900:650);
  for(let i=0;i<(big?10:6);i++)part(e.x+(Math.random()-.5)*e.w,e.y-Math.random()*e.h,(Math.random()-.5)*200,-60-Math.random()*160,.7+Math.random()*.4,'rgba(40,36,48,.55)',50+Math.random()*40,-80,'norm');
  debris(e.x,e.y-e.h*.7,'robot');part(e.x,e.y-e.h*.5,0,0,.25,'#fff0c8',big?380:240,0,'glow')}
function teleFx(x,y,h){for(let i=0;i<14;i++)part(x+(Math.random()-.5)*60,y-Math.random()*h,0,-300-Math.random()*300,.45,'#ff4fd8',10,0,'add');ring(x,y-h/2,'#ff4fd8',120)}
/* a quick zoom punch on the world camera for big moments */
function camKick(z){if(!SC)return;SC.tweens.killTweensOf(FX);FX.kz=z;SC.tweens.add({targets:FX,kz:0,duration:260,ease:'Quad.Out'})}
function muzzle(x,y,col){part(x,y,0,0,.12,col,120,0,'glow')}
function ghost(p){if(V.ghost)V.ghost(p)}
/* expanding ring */
function ring(x,y,col,r){const o=FX.rings[FX.ri++%FX.rings.length];if(!o)return;o.setPosition(x,y).setTint(hexC(col)).setVisible(true).setAlpha(.85).setScale((r||90)*.3/112);
  SC.tweens.killTweensOf(o);SC.tweens.add({targets:o,scale:(r||90)*1.2/112,alpha:0,duration:300,ease:'Quad.Out',onComplete:()=>o.setVisible(false)})}
/* floating damage numbers and labels */
function ftext(x,y,s,col,big){const t=FX.texts[FX.ti++%FX.texts.length];if(!t)return;const num=typeof s==='number';
  /* white text tinted to colour and scaled to size, so only the string ever re-renders the text texture */
  const sc=(big?52:num?38:30)/44;tx(t,s).setPosition(x,y).setTint(hexC(col)).setVisible(true).setAlpha(1).setScale(sc*(num?1.5:1));
  SC.tweens.killTweensOf(t);SC.tweens.add({targets:t,y:y-80,duration:800,ease:'Cubic.Out',onComplete:()=>t.setVisible(false)});
  SC.tweens.add({targets:t,scale:sc,duration:160,ease:'Back.Out'});SC.tweens.add({targets:t,alpha:0,delay:450,duration:350})}

/* ---- light map ---- */
const lightW=(x,y,r,a)=>{const sx=x-cam,sy=y-camY;if(sx+r<0||sx-r>W||sy+r<0||sy-r>H)return;FX.lights.push(sx,sy,r,a)};
const lightS=(x,y,r,a)=>FX.lights.push(x,y,r,a);
const AMB={
 hangar: {col:'#040814',a:.5, weather:'rain',heavy:1,lightning:'#dfe8ff',signs:['HANGAR 09','BAY CLOSED','NO SMOKING','LAUNCH TUBE 3']},
 armory: {col:'#05100a',a:.4, weather:'rain',heavy:0,fog:'#cfe8d8',signs:['ARMORY','DRONE LINE 3','AMMO DEPOT','RESTRICTED']},
 station:{col:'#040918',a:.3, weather:'debris',signs:['DOCK A-7','GRAVITY 1.0G','SHUTTLE BAY','AIRLOCK']},
 cargo:  {col:'#120802',a:.34,weather:'ash',heat:1,conveyor:1,signs:['FOUNDRY','HOT METAL','CARGO 12','SMELTER']},
 citadel:{col:'#08031a',a:.48,weather:'snow',search:'#d8c8ff',signs:['NULL GATE','VOID ALERT','SECTOR V']},
 core:   {col:'#120203',a:.52,weather:'ash2',lightning:'#ff8a6a',search:'#ff9a7a',signs:['RIFT CORE','DANGER','NO ENTRY']}};
const ATM={flash:0,lt:6,bolt:null,thunder:0};
function mixHex(a,b,t){const A=hexRGB(a),Bc=hexRGB(b);return'#'+A.map((v,i)=>Math.round(v+(Bc[i]-v)*t).toString(16).padStart(2,'0')).join('')}
function applyLighting(){const A=AMB[LV[G.lv].theme],rt=FX.rt,LS=FX.LS,lw=rt.width,lh=rt.height;
  const alarm=lock?.5+.5*Math.sin(lvT*6):0,a=A.a*(1-Math.min(.92,ATM.flash));
  rt.clear();const c1=alarm?mixHex(A.col,'#3a0404',alarm*.6):A.col;FX.dimg.setDisplaySize(lw,lh).setTint(hexN(c1)).setAlpha(Math.min(1,a*1.15));rt.draw(FX.dimg,0,0);
  const L=FX.lights,list=[];for(let i=0,k=0;i<L.length&&k<FX.holes.length;i+=4,k++){const r=L[i+2]/LS,h=FX.holes[k];h.setPosition(L[i]/LS,L[i+1]/LS).setScale(r*2/64).setAlpha(Math.min(1,L[i+3]));list.push(h)}
  if(list.length)rt.erase(list);FX.lights=[]}

/* ---- lightning ---- */
function updAtmos(dt){const A=AMB[LV[G.lv].theme];ATM.flash*=Math.pow(.015,dt);if(ATM.bolt)ATM.bolt.t-=dt;
  if(A.lightning&&G.state!=='menu'){ATM.lt-=dt;if(ATM.lt<=0){ATM.lt=6+Math.random()*9;ATM.flash=1;const pts=[];let x=W*(.15+Math.random()*.7),y=-20;
      while(y<GY*.7){pts.push([x,y]);x+=(Math.random()-.5)*90;y+=40+Math.random()*50}ATM.bolt={pts,t:.22};ATM.thunder=.35+Math.random()*.4}}
  if(ATM.thunder>0){ATM.thunder-=dt;if(ATM.thunder<=0){sfxThunder();buzz(30)}}
  if(V.steam)V.steam(dt)}
function drawSkyFx(){const g=FX.bolt;g.clear();const A=AMB[LV[G.lv].theme];if(ATM.bolt&&ATM.bolt.t>0){const b=ATM.bolt,col=hexN(A.lightning);
    for(const[lw,al]of[[14,.25],[5,.9]]){g.lineStyle(lw,col,al*Math.min(1,b.t*8));g.beginPath();b.pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokePath()}}
  const fl=ATM.flash>.02;FX.flash.setVisible(fl);if(fl){FX.flash.fillColor=A.lightning?hexN(A.lightning):0xffffff;FX.flash.fillAlpha=ATM.flash*.28}}
</script>
