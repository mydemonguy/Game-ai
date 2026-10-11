<script>
"use strict";
/* ---------- atmosphere: light map, ceiling lamps, moving background objects, weather, lightning ---------- */
const AMB={
 hangar: {col:'#040814',a:.5, weather:'rain',heavy:1,lightning:'#dfe8ff',signs:['HANGAR 09','BAY CLOSED','NO SMOKING','LAUNCH TUBE 3']},
 armory: {col:'#05100a',a:.4, weather:'rain',heavy:0,fog:'#cfe8d8',signs:['ARMORY','DRONE LINE 3','AMMO DEPOT','RESTRICTED']},
 station:{col:'#040918',a:.3, weather:'debris',signs:['DOCK A-7','GRAVITY 1.0G','SHUTTLE BAY','AIRLOCK']},
 cargo:  {col:'#120802',a:.34,weather:'ash',heat:1,conveyor:1,signs:['FOUNDRY','HOT METAL','CARGO 12','SMELTER']},
 citadel:{col:'#08031a',a:.48,weather:'snow',search:'#d8c8ff',signs:['NULL GATE','VOID ALERT','SECTOR V']},
 core:   {col:'#120203',a:.52,weather:'ash2',lightning:'#ff8a6a',search:'#ff9a7a',signs:['RIFT CORE','DANGER','NO ENTRY']}};
let LIGHTS=[];
const LM=document.createElement('canvas'),LG=LM.getContext('2d'),LS=4;
const HOLE=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.45,'rgba(0,0,0,.7)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c})();
const lightW=(x,y,r,a)=>{const sx=x-cam;if(sx+r<0||sx-r>W)return;LIGHTS.push(sx,y,r,a)};
const lightS=(x,y,r,a)=>LIGHTS.push(x,y,r,a);
const ATM={flash:0,lt:6,bolt:null,thunder:0};

function addAtmos(B){const L=B.L,A=AMB[L.theme],r=rng(L.len*29+11);B.lamps=[];B.signs=[];B.vents=[];B.traffic=[];B.fogs=[];
  let x=420;while(x<L.len+300){const v=r();B.lamps.push({x,y:150+r()*110,k:v<.2?'alarm':v<.32?'broken':'lamp',s:r()});x+=620+r()*520}
  x=500;while(x<L.len*.62+2900){B.signs.push({x,y:300+r()*220,t:A.signs[Math.floor(r()*A.signs.length)],s:r()});x+=1200+r()*1400}
  x=900;while(x<L.len-300){B.vents.push({x,t:1+r()*4,on:0});x+=1300+r()*1400}
  for(let i=0;i<6;i++)B.traffic.push({x:r()*3000,y:90+r()*360,v:(60+r()*140)*(r()<.5?-1:1),sc:.4+r()*.6,s:r()});
  if(A.fog)for(let i=0;i<7;i++)B.fogs.push({x:r()*3200,y:GY-60-r()*160,w:380+r()*420,v:10+r()*25,a:.06+r()*.05});
  B.wx=[];for(let i=0;i<260;i++)B.wx.push({x:r()*2800,y:r()*1400,d:.55+r()*.9,s:r()});
  ATM.flash=0;ATM.lt=4+r()*6;ATM.bolt=null;return B}

/* ---- sky layer: traffic, searchlights, lightning bolt ---- */
function drawSkyLife(){const B=bg,L=B.L,A=AMB[L.theme];
  for(const t of B.traffic){const span=W+900,x=((t.x+lvT*t.v-cam*.06)%span+span)%span-450,y=t.y+Math.sin(lvT*.7+t.s*9)*10,sc=t.sc,d=Math.sign(t.v);
    X.save();X.translate(x,y);X.scale(d*sc,sc);X.fillStyle=L.far;X.beginPath();X.moveTo(-90,0);X.quadraticCurveTo(-20,22,90,6);X.lineTo(60,-12);X.lineTo(-60,-14);X.closePath();X.fill();
    X.fillRect(-30,-34,46,22);X.restore();glow(x-d*92*sc,y+2*sc,40*sc,L.glow,.7,16*sc);
    X.strokeStyle=rgba(L.glow,.25);X.lineWidth=3*sc;X.beginPath();X.moveTo(x-d*95*sc,y+2*sc);X.lineTo(x-d*260*sc,y+2*sc);X.stroke();
    if(Math.sin(lvT*5+t.s*20)>.6){glow(x+d*80*sc,y,12,'#ff4040',.9);glow(x-d*50*sc,y-14*sc,10,'#40ff70',.9)}}
  if(A.search){X.save();X.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const bx=W*(.2+i*.3)-((cam*.12)%W)*.0,a=-1.57+Math.sin(lvT*.35+i*2.1)*.55,len=GY*1.25;
      const g=X.createLinearGradient(bx,GY,bx+Math.cos(a)*len,GY+Math.sin(a)*len);g.addColorStop(0,rgba(A.search,.16));g.addColorStop(1,rgba(A.search,0));X.fillStyle=g;X.beginPath();
      X.moveTo(bx,GY-40);X.lineTo(bx+Math.cos(a-.06)*len,GY+Math.sin(a-.06)*len);X.lineTo(bx+Math.cos(a+.06)*len,GY+Math.sin(a+.06)*len);X.closePath();X.fill()}X.restore()}
  if(ATM.bolt&&ATM.bolt.t>0){const b=ATM.bolt;X.save();X.globalCompositeOperation='lighter';X.strokeStyle=A.lightning;X.lineCap='round';
    for(const[lw,al]of[[14,.25],[5,.9]]){X.globalAlpha=al*Math.min(1,b.t*8);X.lineWidth=lw;X.beginPath();b.pts.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.stroke()}X.restore();X.globalAlpha=1}}
function drawSkyShimmer(B){const sx=-60-Math.min(260,cam*.02),c=B.skyC;for(let y=0;y<c.height;y+=20){const off=Math.sin(lvT*2.2+y*.045)*(y>c.height*.55?4:1.5);X.drawImage(c,0,y,c.width,20,sx+off,y-60,c.width,20)}}

/* ---- near layer: holo signs ---- */
function drawSigns(){const B=bg,L=B.L,P=PAL[L.theme];X.textAlign='center';X.font=`700 30px ${FU}`;
  for(const s of B.signs){const x=s.x-cam*.62;if(x<-260||x>W+260)continue;const tw=X.measureText(s.t).width+44,on=Math.sin(lvT*13+s.s*50)>-.92||Math.sin(lvT*.7+s.s*9)>.2;
    X.fillStyle='rgba(5,6,12,.75)';X.fillRect(x-tw/2,s.y-30,tw,50);X.strokeStyle=rgba(P.scr,on?.8:.25);X.lineWidth=3;X.strokeRect(x-tw/2,s.y-30,tw,50);
    X.fillStyle=on?P.scr:rgba(P.scr,.25);X.fillText(s.t,x,s.y+5);if(on){glow(x,s.y-5,tw*.6,P.scr,.25,40);lightS(x,s.y,tw,.35)}
    X.fillStyle='rgba(255,255,255,.06)';for(let yy=s.y-26;yy<s.y+20;yy+=5)X.fillRect(x-tw/2+3,yy+((lvT*20)%5),tw-6,1)}}

/* ---- world: ceiling lamps with cones and floor pools, steam vents, conveyor ---- */
function drawLamps(){const B=bg,L=B.L,P=PAL[L.theme],ink=P.ink;
  for(const l of B.lamps){if(l.x<cam-300||l.x>cam+W+300)continue;let on=1,col=P.acc2;
    if(l.k==='broken'){on=Math.sin(lvT*23+l.s*40)*Math.sin(lvT*7.3+l.s*9)>-.15?1:.08;if(on<.5&&Math.random()<.25)parts.push({x:l.x+(Math.random()-.5)*30,y:l.y+26,vx:(Math.random()-.5)*260,vy:Math.random()*120,life:.5,max:.5,col:'#ffd27a',sz:3,g:1500,streak:1})}
    if(l.k==='alarm'){col='#ff3d2a';on=lock?1:.0}
    X.strokeStyle=ink;X.lineWidth=4;X.beginPath();X.moveTo(l.x,0);X.lineTo(l.x,l.y);X.stroke();
    X.fillStyle=ink;X.fillRect(l.x-38,l.y,76,26);X.fillStyle=shade(P.metal,-.3);X.fillRect(l.x-34,l.y+3,68,8);
    if(l.k==='alarm'){X.fillStyle=lock?'#ff5a3a':'#5a1a14';X.beginPath();X.arc(l.x,l.y+30,12,0,7);X.fill();
      if(lock){const a=lvT*5+l.s*6,dx=Math.cos(a);X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(l.x,l.y+30,l.x+dx*420,GY);g.addColorStop(0,'rgba(255,60,40,.35)');g.addColorStop(1,'rgba(255,60,40,0)');
        X.fillStyle=g;X.beginPath();X.moveTo(l.x,l.y+30);X.lineTo(l.x+dx*420-90,GY);X.lineTo(l.x+dx*420+90,GY);X.closePath();X.fill();X.restore();
        glow(l.x,l.y+30,60,'#ff3d2a',.9);lightW(l.x+dx*300,GY-120,320,.7);lightW(l.x,l.y+30,160,.8)}continue}
    X.fillStyle=on>.5?'#fff6dc':'#4a4436';X.fillRect(l.x-28,l.y+26,56,6);if(on<.5)continue;
    X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(0,l.y+30,0,GY);g.addColorStop(0,rgba(col,.22));g.addColorStop(1,rgba(col,.02));X.fillStyle=g;
    X.beginPath();X.moveTo(l.x-28,l.y+30);X.lineTo(l.x+28,l.y+30);X.lineTo(l.x+190,GY);X.lineTo(l.x-190,GY);X.closePath();X.fill();X.restore();
    glow(l.x,l.y+30,70,col,.8);glow(l.x,GY+6,210,col,.35,26);
    if(AMB[L.theme].weather==='rain')glow(l.x,GY+60,40,col,.25,120);
    lightW(l.x,l.y+40,300,.9);lightW(l.x,GY-40,330,.75)}}
function drawVents(){const B=bg,P=PAL[B.L.theme];for(const v of B.vents){if(v.x<cam-100||v.x>cam+W+100)continue;X.fillStyle=P.ink;X.fillRect(v.x-40,GY-6,80,8);
  for(let i=0;i<6;i++){X.fillStyle='rgba(255,255,255,.12)';X.fillRect(v.x-34+i*12,GY-5,6,5)}if(v.on>0)lightW(v.x,GY-80,160,.25)}}
function drawConveyor(){const L=bg.L;if(!AMB[L.theme].conveyor)return;const off=((lvT*120-cam)%48+48)%48;X.save();X.beginPath();X.rect(-60,GY,W+120,12);X.clip();X.fillStyle='#1b1a16';X.fillRect(-60,GY,W+120,12);
  X.fillStyle='#e8b23a';for(let x=-96+off;x<W+96;x+=48){X.beginPath();X.moveTo(x,GY+12);X.lineTo(x+14,GY+12);X.lineTo(x+26,GY);X.lineTo(x+12,GY);X.fill()}X.restore()}

/* ---- update: vents, lightning ---- */
function updAtmos(dt){const B=bg;if(!B||!B.vents)return;const A=AMB[B.L.theme];
  for(const v of B.vents){v.t-=dt;if(v.on>0){v.on-=dt;if(Math.random()<.7)parts.push({x:v.x+(Math.random()-.5)*50,y:GY-8,vx:(Math.random()-.5)*60,vy:-260-Math.random()*160,life:1,max:1,col:'rgba(200,215,235,.22)',sz:22+Math.random()*20,g:-60})}
    else if(v.t<=0){v.on=.8;v.t=3+Math.random()*4;if(Math.abs(v.x-pl.x)<900)sfx(180,.5,'sawtooth',.012,-120)}}
  ATM.flash*=Math.pow(.015,dt);if(ATM.bolt)ATM.bolt.t-=dt;
  if(A.lightning){ATM.lt-=dt;if(ATM.lt<=0){ATM.lt=6+Math.random()*9;ATM.flash=1;const pts=[];let x=W*(.15+Math.random()*.7),y=-20;
      while(y<GY*.7){pts.push([x,y]);x+=(Math.random()-.5)*90;y+=40+Math.random()*50}ATM.bolt={pts,t:.22};ATM.thunder=.35+Math.random()*.4}}
  if(ATM.thunder>0){ATM.thunder-=dt;if(ATM.thunder<=0)thunder()}}
function thunder(){if(!AC)return;try{const n=AC.currentTime,len=AC.sampleRate*1.6,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,2.2)*(t<.05?t/.05:1)}
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=buf;f.type='lowpass';f.frequency.value=380;g.gain.value=.5;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(n)}catch(e){}buzz(30)}

/* ---- weather, drawn in front of everything but the HUD ---- */
function drawWeather(){const B=bg;if(!B||!B.wx)return;const A=AMB[B.L.theme],w=A.weather,span=W+240;
  if(w==='rain'){const n=A.heavy?230:120,wind=A.heavy?-260:-120;X.strokeStyle=A.heavy?'rgba(190,210,255,.32)':'rgba(190,220,210,.24)';X.lineWidth=2;X.beginPath();
    for(let i=0;i<n;i++){const p=B.wx[i],x=((p.x-cam*p.d+lvT*wind*p.d)%span+span)%span-120,y=((p.y+lvT*1500*p.d)%(H+200)+H+200)%(H+200)-100,ln=34*p.d;X.moveTo(x,y);X.lineTo(x+wind*.03*p.d,y+ln)}X.stroke();
    X.strokeStyle='rgba(200,220,255,.35)';X.lineWidth=2;for(let j=0;j<(A.heavy?26:12);j++){const ph=(lvT*2.4+j*.618)%1,seed=Math.floor(lvT*2.4+j*.618)*97+j*13,sx=((seed*7919)%W+W)%W;
      X.globalAlpha=1-ph;X.beginPath();X.ellipse(sx,GY+4+(j%3)*30,6+ph*26,2+ph*6,0,0,7);X.stroke()}X.globalAlpha=1}
  else if(w==='snow'||w==='ash'||w==='ash2'){const n=w==='snow'?200:140,col=w==='snow'?'rgba(230,220,255,.75)':w==='ash'?'rgba(120,110,100,.7)':'rgba(90,60,60,.75)',gust=w==='snow'?(-160-Math.max(0,Math.sin(lvT*.4))*360):-40;
    X.fillStyle=col;for(let i=0;i<n;i++){const p=B.wx[i],x=((p.x-cam*p.d+lvT*gust*p.d+Math.sin(lvT*1.3+p.s*9)*30)%span+span)%span-120,y=((p.y+lvT*(w==='snow'?150:90)*p.d)%(H+200)+H+200)%(H+200)-100,sz=(w==='snow'?5:4)*p.d;X.fillRect(x,y,sz,sz)}
    if(w!=='snow'){X.save();X.globalCompositeOperation='lighter';X.fillStyle=w==='ash'?'#ff9a3a':'#ff4a2a';for(let i=0;i<40;i++){const p=B.wx[200+i%60],x=((p.x*1.3-cam*p.d+Math.sin(lvT+p.s*7)*40)%span+span)%span-120,
      y=(((p.y-lvT*110*p.d)%(H+200))+H+200)%(H+200)-100;X.globalAlpha=.5+.5*Math.sin(lvT*4+p.s*20);X.fillRect(x,y,3,3)}X.restore();X.globalAlpha=1}}
  else if(w==='debris'){X.fillStyle='rgba(200,215,240,.5)';for(let i=0;i<60;i++){const p=B.wx[i],x=((p.x-cam*p.d*.8-lvT*30*p.d)%span+span)%span-120,y=(p.y*.75)%H;X.save();X.translate(x,y);X.rotate(lvT*p.d+p.s*6);X.fillRect(-4*p.d,-2*p.d,8*p.d,4*p.d);X.restore()}
    const ph=(lvT*.25)%1;if(ph<.25){const t=ph/.25,mx=W*(1-t*1.3),my=80+t*260;X.save();X.globalCompositeOperation='lighter';X.strokeStyle='rgba(255,230,190,.8)';X.lineWidth=3;X.beginPath();X.moveTo(mx,my);X.lineTo(mx+160,my-50);X.stroke();X.restore();glow(mx,my,20,'#ffe8c0',.9)}}
  for(const f of B.fogs){const x=((f.x-cam*.9-lvT*f.v)%3400+3400)%3400-500;glow(x,f.y,f.w,A.fog,f.a,f.w*.2)}
  if(ATM.flash>.02){X.fillStyle=rgba(A.lightning||'#ffffff',ATM.flash*.28);X.fillRect(0,0,W,H)}}

/* ---- light map: darkness with soft holes at every light source ---- */
function gatherLights(){const B=bg;
  for(const o of B.props){const b=o.b,x=o.x-b.w/2,y=GY-b.h+4;if(x>cam+W+200||x+b.w<cam-200)continue;for(const e of b.em)lightW(x+e.x,y+e.y,e.r*2.4+40,Math.min(1,e.a*1.3))}
  if(pl&&!pl.dead)lightW(pl.x,pl.y-100,280,.7);
  for(const e of en)lightW(e.x,e.y-e.h*.6,e.fly?170:130,.55);
  if(boss&&!boss.dead)lightW(boss.x,boss.y+boss.dy-240,420,.95);
  for(const s of shots)lightW(s.x,s.y,s.wave?340:150,.9);
  for(const k of picks)lightW(k.x,k.y,110,.55);
  for(const b of boxes)lightW(b.x,GY-60,110,.35);
  for(const r of rings)lightW(r.x,r.y,r.r*2.6,r.life/r.max);
  for(const h of hz){if(h.kind==='quake')lightW(h.x,GY-20,180,.8);else if(h.kind==='pillar'&&h.t<=0)lightW(h.x,GY-300,420,1);else if(h.kind==='beam'&&h.t<=0)for(let x=0;x<W;x+=300)lightS(x+150,h.y,260,.8)}
  if(!B.L.boss&&waveI>=B.L.waves.length)lightW(B.L.len-150,GY-190,380,.85);
  for(const o of B.walls){const x=o.x-cam*.62;if(x>W+100||x+o.b.w<-100)continue;const y=GY+34-o.b.h;for(const e of o.b.em)lightS(x+e.x,y+e.y,e.r*1.8,e.a)}}
function applyLighting(){const B=bg,A=AMB[B.L.theme];gatherLights();const lw=Math.ceil(W/LS),lh=Math.ceil(H/LS);if(LM.width!==lw||LM.height!==lh){LM.width=lw;LM.height=lh}
  const alarm=lock?.5+.5*Math.sin(lvT*6):0,a=A.a*(1-Math.min(.92,ATM.flash));
  LG.globalCompositeOperation='source-over';LG.clearRect(0,0,lw,lh);const g=LG.createLinearGradient(0,0,0,lh);
  const c1=alarm?mixHex(A.col,'#3a0404',alarm*.6):A.col;g.addColorStop(0,rgba(c1,a*.55));g.addColorStop(.55,rgba(c1,a));g.addColorStop(1,rgba(c1,Math.min(.9,a*1.25)));LG.fillStyle=g;LG.fillRect(0,0,lw,lh);
  LG.globalCompositeOperation='destination-out';for(let i=0;i<LIGHTS.length;i+=4){const r=LIGHTS[i+2]/LS;LG.globalAlpha=Math.min(1,LIGHTS[i+3]);LG.drawImage(HOLE,LIGHTS[i]/LS-r,LIGHTS[i+1]/LS-r,r*2,r*2)}
  LG.globalAlpha=1;LG.globalCompositeOperation='source-over';X.imageSmoothingEnabled=true;X.drawImage(LM,0,0,lw,lh,0,0,lw*LS,lh*LS);LIGHTS=[]}
function mixHex(a,b,t){const A=hexRGB(a),Bc=hexRGB(b);return'#'+A.map((v,i)=>Math.round(v+(Bc[i]-v)*t).toString(16).padStart(2,'0')).join('')}
</script>
