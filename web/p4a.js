<script>
"use strict";
/* ---------- colour + glow helpers (pre-rendered glow sprites instead of shadowBlur: much cheaper on phone GPUs) ---------- */
function hexRGB(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h.slice(0,6),16);return[(n>>16)&255,(n>>8)&255,n&255]}
function shade(h,a){const c=hexRGB(h).map(v=>Math.round(a<0?v*(1+a):v+(255-v)*a));return'#'+c.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')}
function rgba(h,a){const c=hexRGB(h);return`rgba(${c[0]},${c[1]},${c[2]},${a})`}
const GLOW={};
function glowSpr(col){if(GLOW[col])return GLOW[col];const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,rgba(col,1));r.addColorStop(.18,rgba(col,.6));r.addColorStop(.45,rgba(col,.2));r.addColorStop(1,rgba(col,0));g.fillStyle=r;g.fillRect(0,0,128,128);return GLOW[col]=c}
function glow(x,y,r,col,a,ry){if(a<=0)return;const o=X.globalCompositeOperation,ga=X.globalAlpha;X.globalCompositeOperation='lighter';X.globalAlpha=Math.min(1,a==null?1:a);
  X.drawImage(glowSpr(col),x-r,y-(ry||r),r*2,(ry||r)*2);X.globalCompositeOperation=o;X.globalAlpha=ga}
function glowOn(c,b){X.shadowColor=c;X.shadowBlur=b}
function glowOff(){X.shadowBlur=0}
function lg(x0,y0,x1,y1,stops){const g=X.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g}

/* ---------- level backdrops ---------- */
const KINDS={hangar:['stack','crane','antenna','stack'],armory:['stack','tower','antenna','tankfar'],station:['ring','stack','antenna','ship'],
  cargo:['tankfar','crane','stack','chimney'],citadel:['spire','stack','ring','tower'],core:['ring','stack','pillar','tankfar']};
const FGK={hangar:'pipes',armory:'rail',station:'rail',cargo:'pipes',citadel:'spikes',core:'pipes'};
const MOTE={hangar:{col:'#ffb066',v:70,n:40},armory:{col:'#d8ffe0',v:-10,n:40},station:{col:'#ffffff',v:0,n:46,wind:1},cargo:{col:'#ffb347',v:-60,n:60},citadel:{col:'#c9a8ff',v:-18,n:60},core:{col:'#ff5a2a',v:40,n:80}};
function groundTile(L){const c=document.createElement('canvas'),w=512,h=H-GY;c.width=w;c.height=h;const g=c.getContext('2d'),r=rng(L.len+3),t=L.theme,P=PAL[t];
  const D={light:shade(P.light,-.25),metal:shade(P.metal,-.3),dark:shade(P.dark,-.35)},A={light:shade(P.light,-.4),metal:shade(P.alt,-.35),dark:P.ink};
  g.fillStyle=P.ink;g.fillRect(0,0,w,h);
  plate(g,0,0,w,30,P,{c:0,m:A});
  if(t==='hangar'||t==='cargo'||t==='core')hazard(g,0,30,w,12);else{g.fillStyle=P.ink;g.fillRect(0,30,w,12);for(let x=16;x<w;x+=64){g.fillStyle=L.glow;g.fillRect(x,34,28,4)}}
  for(let x=0;x<w;x+=128){plate(g,x+2,44,124,70,P,{c:10,m:D,rivets:1},r)}
  for(let x=-64;x<w;x+=128){plate(g,x+2,116,124,84,P,{c:10,m:{light:shade(D.light,-.3),metal:shade(D.metal,-.3),dark:shade(D.dark,-.3)}},r)}
  if(t==='citadel'||t==='core'||t==='armory'){for(let x=40;x<w;x+=256){g.fillStyle=P.ink;g.fillRect(x,58,80,42);for(let k=0;k<8;k++){g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x+6+k*9,62,4,34)}
      const gg=g.createLinearGradient(0,60,0,100);gg.addColorStop(0,rgba(L.glow,.45));gg.addColorStop(1,rgba(L.glow,0));g.fillStyle=gg;g.fillRect(x+4,62,72,36)}}
  const tg=g.createLinearGradient(0,0,0,26);tg.addColorStop(0,rgba(L.glow,.4));tg.addColorStop(1,rgba(L.glow,0));g.fillStyle=tg;g.fillRect(0,0,w,26);
  const sh=g.createLinearGradient(0,40,0,h);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=sh;g.fillRect(0,40,w,h-40);
  return c}
function buildBG(L){const r=rng(L.len*7+L.name.length*97),ks=KINDS[L.theme],far=[],mid=[],near=[],fg=[],stars=[],motes=[],neb=[],rays=[],clouds=[];
  let x=-300;while(x<L.len*.12+2900){const w=110+r()*220;far.push({x,w,h:200+r()*380,k:ks[Math.floor(r()*ks.length)],s:r()});x+=w*(.55+r()*.7)}
  x=-300;while(x<L.len*.35+2900){const w=90+r()*170;mid.push({x,w,h:150+r()*270,k:ks[Math.floor(r()*ks.length)],s:r()});x+=w+160+r()*380}
  x=200;while(x<L.len*.62+2900){const w=140+r()*120;near.push({x,w,h:300+r()*260,k:ks[Math.floor(r()*ks.length)],s:r()});x+=900+r()*900}
  x=0;while(x<L.len*1.25+2900){fg.push({x,w:120+r()*200,h:50+r()*80,s:r()});x+=500+r()*700}
  for(let i=0;i<230;i++)stars.push({x:r()*2600,y:r()*GY*.62,s:r()*2.2+.4,t:r()*6});
  const M=MOTE[L.theme];for(let i=0;i<M.n;i++)motes.push({x:r()*2600,y:r()*H,s:2+r()*4,v:M.v*(.5+r()),t:r()*6,d:.6+r()*.6});
  for(let i=0;i<5;i++)neb.push({x:r()*2600,y:60+r()*420,r:240+r()*260,col:[L.planet,L.glow,L.sky[2]][i%3],a:.06+r()*.07});
  for(let i=0;i<3;i++)rays.push({x:r()*2600,w:80+r()*160,lean:120+r()*200,ph:r()*6,a:.05+r()*.05});
  if(L.theme==='station'||L.theme==='citadel')for(let i=0;i<9;i++)clouds.push({x:r()*3200,y:L.theme==='station'?420+r()*360:200+r()*300,w:260+r()*360,v:8+r()*18,a:.06+r()*.08});
  const sky=X.createLinearGradient(0,0,0,GY);sky.addColorStop(0,L.sky[0]);sky.addColorStop(.62,L.sky[1]);sky.addColorStop(1,L.sky[2]);
  const fog=X.createLinearGradient(0,GY-340,0,GY);fog.addColorStop(0,rgba(L.sky[2],0));fog.addColorStop(1,rgba(L.sky[2],.55));
  const fog2=X.createLinearGradient(0,GY-200,0,GY);fog2.addColorStop(0,rgba(L.sky[1],0));fog2.addColorStop(1,rgba(L.sky[1],.35));
  const ray=X.createLinearGradient(0,0,0,GY);ray.addColorStop(0,rgba(L.planet,.9));ray.addColorStop(.7,rgba(L.planet,.25));ray.addColorStop(1,rgba(L.planet,0));
  const pg=X.createRadialGradient(-60,-60,20,0,0,190);pg.addColorStop(0,'#ffffff');pg.addColorStop(.28,L.planet);pg.addColorStop(.85,shade(L.planet,-.55));pg.addColorStop(1,shade(L.sky[1],-.2));
  return addAtmos(addLayers({L,far,mid,near,fg,stars,motes,neb,rays,clouds,sky,fog,fog2,ray,pg,tile:groundTile(L),skyC:null,skyW:0}))}
/* sky, nebulae and planet barely move, so they are painted once into an offscreen canvas */
function bakeSky(B){const L=B.L,c=document.createElement('canvas');c.width=W+340;c.height=GY+60;const o=X;X=c.getContext('2d',{alpha:false});
  try{X.translate(60,60);X.fillStyle=B.sky;X.fillRect(-60,-60,c.width,c.height);
    for(const n of B.neb)glow(n.x%(W+200),n.y,n.r,n.col,n.a);
    const px=W*.72,py=250;
    if(L.theme==='core'){X.globalCompositeOperation='lighter';X.strokeStyle=L.glow;for(let k=0;k<3;k++){X.globalAlpha=.28-k*.07;X.lineWidth=46-k*14;X.beginPath();
        X.moveTo(px-240,40);X.lineTo(px-120,170);X.lineTo(px-170,260);X.lineTo(px,330);X.lineTo(px-30,440);X.lineTo(px+130,540);X.stroke()}X.globalCompositeOperation='source-over';X.globalAlpha=1;
      glow(px-60,300,320,L.glow,.35)}
    else{glow(px,py,330,L.planet,.35);X.save();X.translate(px,py);X.fillStyle=B.pg;X.beginPath();X.arc(0,0,170,0,7);X.fill();
      X.globalAlpha=.18;X.fillStyle=shade(L.planet,-.4);for(let i=0;i<4;i++){X.beginPath();X.ellipse(-30+i*22,-60+i*40,120-i*18,10,-.2,0,7);X.fill()}X.globalAlpha=1;
      if(L.theme==='station'||L.theme==='citadel'||L.theme==='hangar'||L.theme==='armory'){X.strokeStyle=rgba(L.planet,.55);X.lineWidth=7;X.beginPath();X.ellipse(0,0,310,48,-.25,Math.PI*.03,Math.PI*.97,true);X.stroke();
        X.strokeStyle=rgba(L.planet,.25);X.lineWidth=16;X.beginPath();X.ellipse(0,0,280,40,-.25,Math.PI*.03,Math.PI*.97,true);X.stroke()}X.restore()}}
  finally{X=o}B.skyC=c;B.skyW=W}
function menuBG(){const L=LV[Math.min(unlocked,6)-1];bg=buildBG(L);G.lv=LV.indexOf(L);pl=null;en=[];shots=[];hz=[];picks=[];boss=null;texts=[];rings=[];banner=null;cam=0;shake=0;ROOM=null;camY=0;FY=GY;RW=CW;boxes=[];lock=false;lockPlugs=[]}

function shape(o,ox,base,col,glo,depth){const x=o.x-ox,w=o.w,h=o.h;if(x>W+80||x+w<-80)return;X.fillStyle=col;X.beginPath();
  const lit=depth===0?.75:depth===1?.4:.2;
  switch(o.k){
  case'stack':{const b1=h*.55,b2=h*.3;X.moveTo(x,base);X.lineTo(x,base-b1+14);X.lineTo(x+14,base-b1);X.lineTo(x+w-14,base-b1);X.lineTo(x+w,base-b1+14);X.lineTo(x+w,base);X.fill();
    X.beginPath();X.moveTo(x+w*.15,base-b1);X.lineTo(x+w*.15,base-b1-b2+12);X.lineTo(x+w*.15+12,base-b1-b2);X.lineTo(x+w*.7,base-b1-b2);X.lineTo(x+w*.7+12,base-b1-b2+12);X.lineTo(x+w*.7+12,base-b1);X.fill();
    X.fillRect(x+w*.3,base-h,w*.2,h*.16);X.fillRect(x+w*.38,base-h-60,4,60);X.fillRect(x-14,base-b1*.6,14,b1*.6);
    X.fillStyle=glo;X.globalAlpha=lit*.9;for(let i=0;i<3;i++){X.fillRect(x+w*.12,base-b1*.75+i*b1*.22,w*.3,5);if((o.s*10+i|0)%2)X.fillRect(x+w*.55,base-b1*.75+i*b1*.22,w*.3,5)}
    X.fillRect(x+w*.25,base-b1-b2*.6,w*.35,6);X.globalAlpha=1;glow(x+w*.4,base-h-60,14,'#ff3d3d',lit*(Math.sin(lvT*3+o.s*9)>0?1:.2))}break;
  case'ring':{const cx=x+w,cy=base-h*.62,rr=h*.5;X.strokeStyle=col;X.lineWidth=Math.max(18,w*.25);X.beginPath();for(let i=0;i<=8;i++){const a=i*Math.PI/4+Math.PI/8;X.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}X.stroke();
    X.fillRect(cx-w*.5,cy+rr*.9,w,base-(cy+rr*.9));glow(cx,cy,rr*.9,glo,lit*.22);X.fillStyle=glo;X.globalAlpha=lit;for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;X.fillRect(cx+Math.cos(a)*rr-4,cy+Math.sin(a)*rr-4,8,8)}X.globalAlpha=1}break;
  case'antenna':{X.moveTo(x+w*.3,base);X.lineTo(x+w*.48,base-h*1.1);X.lineTo(x+w*.52,base-h*1.1);X.lineTo(x+w*.7,base);X.fill();X.strokeStyle=col;X.lineWidth=4;X.beginPath();
    for(let i=1;i<6;i++){const t=i/6;X.moveTo(x+w*(.3+.18*t),base-h*1.1*t);X.lineTo(x+w*(.7-.18*t),base-h*1.1*t)}X.stroke();X.fillRect(x+w*.2,base-h*.75,w*.6,6);X.fillRect(x+w*.1,base-h*.5,w*.8,6);
    glow(x+w*.5,base-h*1.1,18,'#ff3d3d',lit*(Math.sin(lvT*2.4+o.s*7)>0?1:.15))}break;
  case'tankfar':{const cx=x+w/2,cy=base-h*.55,rx=w*.55,ry=h*.32;X.fillRect(cx-rx*.8,cy,10,base-cy);X.fillRect(cx+rx*.8-10,cy,10,base-cy);X.fillRect(cx-6,cy,12,base-cy);
    X.beginPath();X.ellipse(cx,cy,rx,ry,0,0,7);X.fill();X.fillStyle=glo;X.globalAlpha=lit*.7;X.fillRect(cx-rx*.6,cy-3,rx*1.2,6);X.globalAlpha=1;X.fillStyle=col;X.fillRect(cx-8,cy-ry-40,16,40)}break;
  case'tower':X.moveTo(x,base);X.lineTo(x,base-h);X.lineTo(x+w*.25,base-h-30*o.s);X.lineTo(x+w*.45,base-h+20);X.lineTo(x+w*.7,base-h-15);X.lineTo(x+w,base-h*.82);X.lineTo(x+w,base);X.fill();
    X.fillStyle=rgba(glo,.12*lit);X.fillRect(x+w-6,base-h*.82,6,h*.82);
    if(o.s>.3){X.fillStyle=glo;X.globalAlpha=lit*.8;for(let i=0;i<5;i++){const wy=base-h*.2-i*h*.15;if(((o.s*10+i)|0)%3!==0)X.fillRect(x+w*.28,wy,w*.12,h*.05);if(((o.s*7+i)|0)%2)X.fillRect(x+w*.62,wy,w*.1,h*.05)}X.globalAlpha=1}break;
  case'pillar':{const top=o.s>.5?base-h:base-h*.7;X.rect(x+w*.28,top,w*.44,base-top);X.rect(x+w*.12,top-22,w*.76,26);X.rect(x+w*.08,base-26,w*.84,26);X.fill();
    X.fillStyle=rgba('#000000',.25);for(let i=1;i<4;i++)X.fillRect(x+w*.28+i*w*.11,top,2,base-top);
    if(o.s>.6){X.fillStyle=col;X.beginPath();X.moveTo(x+w*.28,top-22);X.lineTo(x+w*.5,top-60);X.lineTo(x+w*.72,top-22);X.fill()}
    X.fillStyle=glo;X.globalAlpha=lit*.55;X.fillRect(x+w*.47,top+30,w*.06,(base-top)*.6);X.globalAlpha=1}break;
  case'arch':X.moveTo(x,base);X.lineTo(x,base-h*.7);X.quadraticCurveTo(x+w,base-h*1.25,x+w*2,base-h*.7);X.lineTo(x+w*2,base);X.lineTo(x+w*1.7,base);X.lineTo(x+w*1.7,base-h*.55);
    X.quadraticCurveTo(x+w,base-h*.95,x+w*.3,base-h*.55);X.lineTo(x+w*.3,base);X.closePath();X.fill();
    X.fillStyle=glo;X.globalAlpha=lit*.5;X.beginPath();X.arc(x+w,base-h*.86,6,0,7);X.fill();X.globalAlpha=1;break;
  case'spire':X.moveTo(x,base);X.lineTo(x+w*.38,base-h*.9);X.lineTo(x+w*.5,base-h*1.35);X.lineTo(x+w*.62,base-h*.9);X.lineTo(x+w,base);X.fill();
    X.fillRect(x+w*.1,base-h*.5,w*.08,h*.5);X.fillRect(x+w*.82,base-h*.5,w*.08,h*.5);
    glow(x+w*.5,base-h*.7,22+o.s*14,glo,lit*.9);break;
  case'crystal':X.moveTo(x+w*.15,base);X.lineTo(x,base-h*.45);X.lineTo(x+w*.42,base-h);X.lineTo(x+w*.88,base-h*.62);X.lineTo(x+w,base);X.closePath();X.fill();
    X.strokeStyle=glo;X.globalAlpha=lit*(.7+Math.sin(lvT*1.5+o.s*9)*.25);X.lineWidth=3;X.stroke();X.beginPath();X.moveTo(x+w*.42,base-h);X.lineTo(x+w*.5,base);X.moveTo(x,base-h*.45);X.lineTo(x+w*.5,base-h*.3);X.stroke();X.globalAlpha=1;
    glow(x+w*.42,base-h,30,glo,lit*.6);break;
  case'ctree':{const cx=x+w/2;X.moveTo(cx-10,base);X.lineTo(cx-6,base-h*.6);X.lineTo(cx+6,base-h*.6);X.lineTo(cx+10,base);X.fill();
    for(let i=0;i<5;i++){const a=-1.57+(i-2)*.5,len=h*(.35+.1*(i%2));X.beginPath();X.moveTo(cx,base-h*.55);X.lineTo(cx+Math.cos(a-.12)*len*.6,base-h*.55+Math.sin(a-.12)*len*.6);X.lineTo(cx+Math.cos(a)*len,base-h*.55+Math.sin(a)*len);X.lineTo(cx+Math.cos(a+.12)*len*.6,base-h*.55+Math.sin(a+.12)*len*.6);X.fill();
      glow(cx+Math.cos(a)*len,base-h*.55+Math.sin(a)*len,18,glo,lit*(.6+.3*Math.sin(lvT*2+i)))}}break;
  case'island':{const cy=base-h-40,cx=x+w/2,bob=Math.sin(lvT*.6+o.s*7)*8;X.ellipse(cx,cy+bob,w*.6,20,0,0,7);X.fill();X.beginPath();X.moveTo(cx-w*.6,cy+bob);X.lineTo(cx-w*.2,cy+bob+h*.45);X.lineTo(cx+w*.1,cy+bob+h*.6);X.lineTo(cx+w*.6,cy+bob);X.fill();
    X.fillRect(cx-w*.2,cy+bob-h*.25,w*.16,h*.25);X.fillRect(cx+w*.08,cy+bob-h*.38,w*.12,h*.38);X.fillStyle=glo;X.globalAlpha=lit;X.fillRect(cx+w*.11,cy+bob-h*.3,w*.06,8);X.globalAlpha=1;
    glow(cx+w*.1,cy+bob+h*.62,26,glo,lit*.5)}break;
  case'ship':{const cy=base-h-80+Math.sin(lvT*.5+o.s*5)*12,cx=x+w/2,dir=o.s>.5?1:-1;X.save();X.translate(cx,cy);X.scale(dir,1);
    X.moveTo(-w*.8,0);X.quadraticCurveTo(-w*.2,40,w*.8,0);X.lineTo(w*.6,-18);X.lineTo(-w*.6,-18);X.closePath();X.fill();X.fillRect(-w*.3,-70,w*.5,52);X.fillRect(-w*.1,-110,12,40);
    X.beginPath();X.moveTo(-w*.6,-40);X.lineTo(-w*1.0,-30);X.lineTo(-w*.6,-22);X.fill();X.restore();glow(cx-dir*w*.8,cy,30,glo,lit*.8);for(let i=0;i<4;i++){X.fillStyle=glo;X.globalAlpha=lit;X.fillRect(cx-w*.25+i*w*.12,cy-50,8,6)}X.globalAlpha=1}break;
  case'chimney':X.rect(x+w*.3,base-h,w*.4,h);X.rect(x+w*.22,base-h,w*.56,18);X.rect(x,base-h*.35,w,h*.35);X.fill();
    glow(x+w*.5,base-h,w*.4,glo,lit*(.6+Math.sin(lvT*3+o.s*9)*.2),18);
    X.fillStyle=rgba('#000000',.18+.1*lit);for(let i=0;i<4;i++){const t=(lvT*.3+o.s+i*.25)%1;X.beginPath();X.arc(x+w*.5+t*70,base-h-30-t*280,20+t*70,0,7);X.fill()}break;
  case'crane':X.rect(x+w*.4,base-h,w*.12,h);X.fill();X.beginPath();X.moveTo(x-w*.4,base-h);X.lineTo(x+w*1.4,base-h);X.lineTo(x+w*1.4,base-h+14);X.lineTo(x-w*.4,base-h+14);X.fill();
    X.strokeStyle=col;X.lineWidth=3;X.beginPath();X.moveTo(x+w*1.2,base-h+14);X.lineTo(x+w*1.2,base-h*.5+Math.sin(lvT+o.s)*20);X.stroke();X.fillRect(x+w*1.1,base-h*.5+Math.sin(lvT+o.s)*20,w*.2,30);
    glow(x+w*.46,base-h-8,14,'#ff3d3d',lit*(Math.sin(lvT*4)>.0?1:.2));break}}
function drawBG(){const B=bg,L=B.L;if(B.skyW!==W)bakeSky(B);if(AMB[L.theme].heat)drawSkyShimmer(B);else X.drawImage(B.skyC,-60-Math.min(260,cam*.02),-60);
  for(const s of B.stars){if(s.x>W+40)continue;X.globalAlpha=.25+.55*Math.abs(Math.sin(lvT*.8+s.t));X.fillStyle='#fff';X.fillRect(s.x,s.y,s.s,s.s)}X.globalAlpha=1;
  if(L.theme==='core')glow(W*.72-cam*.02-60,300,200,L.glow,.12+Math.sin(lvT*2)*.08);
  for(const c of B.clouds){const x=((c.x-cam*.06-lvT*c.v)%3200+3200)%3200-400;glow(x,c.y,c.w,'#ffffff',c.a,c.w*.22)}
  X.save();X.globalCompositeOperation='lighter';X.fillStyle=B.ray;
  for(const r of B.rays){const x=((r.x-cam*.08)%2600+2600)%2600-150,sway=Math.sin(lvT*.25+r.ph)*40;X.globalAlpha=r.a*(.75+.25*Math.sin(lvT*.6+r.ph));X.beginPath();X.moveTo(x,0);X.lineTo(x+r.w,0);X.lineTo(x+r.w*2.2+r.lean+sway,GY);X.lineTo(x+r.lean+sway,GY);X.fill()}
  X.restore();X.globalAlpha=1;
  drawSkyLife();
  for(const o of B.far)shape(o,cam*.12,GY-50,L.far,L.glow,2);
  X.fillStyle=B.fog;X.fillRect(-60,GY-340,W+120,340);
  for(const o of B.mid)shape(o,cam*.35,GY-6,L.mid,L.glow,1);
  for(const o of B.walls){const x=o.x-cam*.62;if(x>W+20||x+o.b.w<-20)continue;drawBaked(o.b,x,GY+34-o.b.h)}
  drawSigns();
  if(ROOM)return;const off=-(((cam%512)+512)%512);for(let x=off;x<W;x+=512)X.drawImage(B.tile,x,GY);drawConveyor(GY,0,cam);
  X.save();X.globalCompositeOperation='lighter';X.fillStyle=rgba(L.glow,.5);X.fillRect(-60,GY-1,W+120,3);X.restore();
  X.strokeStyle=rgba(L.glow,.1);X.lineWidth=2;const o2=-(cam%240);
  for(let x=o2-240;x<W+240;x+=240){X.beginPath();X.moveTo(x,GY);X.lineTo(x+(x-W/2)*.55,H);X.stroke()}}
function drawAmbient(){const B=bg,L=B.L,M=MOTE[L.theme];X.save();X.globalCompositeOperation='lighter';X.fillStyle=M.col;
  for(const m of B.motes){let x,y;if(M.wind){x=((m.x-cam*m.d-lvT*600*m.d)%2600+2600)%2600-100;y=m.y*.8;X.globalAlpha=.12*m.d;X.fillRect(x,y,90*m.d,2);continue}
    x=((m.x-cam*m.d+Math.sin(lvT+m.t)*30)%2600+2600)%2600-100;y=((m.y+lvT*m.v)%H+H)%H;if(x>W+20)continue;
    X.globalAlpha=(.25+.35*Math.sin(lvT*2+m.t))*(L.theme==='crystal'?Math.abs(Math.sin(lvT*3+m.t)):1);X.fillRect(x,y,m.s,m.s)}
  X.restore();X.globalAlpha=1;
}
</script>
