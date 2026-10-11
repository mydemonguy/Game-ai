<script>
"use strict";
/* ---------- art: everything is painted once with the 2D canvas API, then handed to Phaser as GPU textures ---------- */
let X=null;            /* bake-time drawing context (only used while painting textures) */
const RB={};           /* robot cut-out parts: key -> {c,d,px,py} */
const mkC=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return[c,c.getContext('2d')]};
const GLOW={};
function glowSpr(col){if(GLOW[col])return GLOW[col];const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,rgba(col,1));r.addColorStop(.18,rgba(col,.6));r.addColorStop(.45,rgba(col,.2));r.addColorStop(1,rgba(col,0));g.fillStyle=r;g.fillRect(0,0,128,128);return GLOW[col]=c}
function glow(x,y,r,col,a,ry){if(a<=0)return;const o=X.globalCompositeOperation,ga=X.globalAlpha;X.globalCompositeOperation='lighter';X.globalAlpha=Math.min(1,a==null?1:a);
  X.drawImage(glowSpr(col),x-r,y-(ry||r),r*2,(ry||r)*2);X.globalCompositeOperation=o;X.globalAlpha=ga}
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
/* old silhouette painter; W is widened while baking so nothing is culled */
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
function chamfer(g,x,y,w,h,c){c=Math.max(0,Math.min(c,w/2,h/2));g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);
  g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath()}
function plate(g,x,y,w,h,P,o,r){o=o||{};const c=o.c!=null?o.c:Math.min(w,h)*.16,m=o.m||P;
  const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,m.light);gr.addColorStop(.35,m.metal);gr.addColorStop(1,m.dark);
  chamfer(g,x,y,w,h,c);g.fillStyle=gr;g.fill();g.lineWidth=o.lw||3;g.strokeStyle=P.ink;g.stroke();
  g.save();chamfer(g,x,y,w,h,c);g.clip();
  g.strokeStyle='rgba(255,255,255,.32)';g.lineWidth=2.5;g.beginPath();g.moveTo(x+4,y+h*.65);g.lineTo(x+4,y+c+3);g.lineTo(x+c+3,y+4);g.lineTo(x+w-c-3,y+4);g.stroke();
  g.strokeStyle='rgba(0,0,0,.38)';g.beginPath();g.moveTo(x+w-4,y+c+3);g.lineTo(x+w-4,y+h-c-3);g.lineTo(x+w-c-3,y+h-4);g.lineTo(x+c+3,y+h-4);g.stroke();
  for(let i=1;i<=(o.seams||0);i++){const sy=Math.round(y+h*i/((o.seams||0)+1));g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x+6,sy,w-12,2);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x+6,sy+2,w-12,1)}
  if(o.vseam){g.fillStyle='rgba(0,0,0,.4)';g.fillRect(Math.round(x+w*o.vseam),y+6,2,h-12)}
  if(r){for(let i=0;i<7;i++){g.fillStyle=`rgba(0,0,0,${.06+r()*.1})`;g.fillRect(x+r()*w,y+r()*h,4+r()*w*.25,2+r()*4)}
    for(let i=0;i<3;i++){g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x+r()*w,y+r()*h,10+r()*20,1)}}
  g.restore();
  if(o.rivets){const k=Math.max(6,c*.55);g.fillStyle=P.ink;for(const[px,py]of[[x+k,y+k],[x+w-k,y+k],[x+k,y+h-k],[x+w-k,y+h-k]]){g.beginPath();g.arc(px,py,3.2,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.arc(px-1,py-1,1.3,0,7);g.fill();g.fillStyle=P.ink}}}
function glowWin(g,x,y,w,h,P,em,o){o=o||{};const c=o.c!=null?o.c:Math.min(w,h)*.22,col=o.col||P.acc,hot=o.hot||P.acc2;
  chamfer(g,x-5,y-5,w+10,h+10,c+3);g.fillStyle=P.ink;g.fill();
  const gr=g.createRadialGradient(x+w/2,y+h/2,2,x+w/2,y+h/2,Math.max(w,h)*.62);gr.addColorStop(0,'#ffffff');gr.addColorStop(.18,hot);gr.addColorStop(.6,col);gr.addColorStop(1,shade(col,-.45));
  chamfer(g,x,y,w,h,c);g.fillStyle=gr;g.fill();
  g.save();chamfer(g,x,y,w,h,c);g.clip();g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.45,y);g.lineTo(x,y+h*.55);g.fill();
  if(o.bars){g.fillStyle='rgba(0,0,0,.35)';for(let i=1;i<o.bars;i++)g.fillRect(x+w*i/o.bars-2,y,4,h)}g.restore();
  em.push({x:x+w/2,y:y+h/2,r:Math.max(w,h)*.95+30,col,a:o.a||.55,ry:o.ry})}
function vents(g,x,y,w,n,P){for(let i=0;i<n;i++){g.fillStyle=P.ink;g.fillRect(x,y+i*9,w,5);g.fillStyle='rgba(255,255,255,.16)';g.fillRect(x,y+i*9+5,w,1)}}
function screenBox(g,x,y,w,h,P,em,r){chamfer(g,x-3,y-3,w+6,h+6,5);g.fillStyle=P.ink;g.fill();g.fillStyle=shade(P.scr,-.72);g.fillRect(x,y,w,h);
  g.fillStyle=P.scr;for(let i=0;i<4;i++){g.globalAlpha=.55+(r?r()*.4:0);g.fillRect(x+5,y+5+i*(h-10)/4,(w-10)*(.3+(r?r():.5)*.7),2)}g.globalAlpha=1;
  em.push({x:x+w/2,y:y+h/2,r:Math.max(w,h)*.8,col:P.scr,a:.32,blink:1})}
function hazard(g,x,y,w,h){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle='#1b1a16';g.fillRect(x,y,w,h);g.fillStyle='#e8b23a';
  for(let i=-h;i<w+h;i+=24){g.beginPath();g.moveTo(x+i,y+h);g.lineTo(x+i+12,y+h);g.lineTo(x+i+12+h,y);g.lineTo(x+i+h,y);g.fill()}g.restore()}
function pipeH(g,x,y,w,d,P,m){m=m||P;const gr=g.createLinearGradient(0,y-d/2,0,y+d/2);gr.addColorStop(0,m.light);gr.addColorStop(.45,m.metal);gr.addColorStop(1,m.dark);
  g.fillStyle=P.ink;g.fillRect(x,y-d/2-2,w,d+4);g.fillStyle=gr;g.fillRect(x,y-d/2,w,d)}
function pipeV(g,x,y,h,d,P,m){m=m||P;const gr=g.createLinearGradient(x-d/2,0,x+d/2,0);gr.addColorStop(0,m.dark);gr.addColorStop(.4,m.light);gr.addColorStop(1,m.dark);
  g.fillStyle=P.ink;g.fillRect(x-d/2-2,y,d+4,h);g.fillStyle=gr;g.fillRect(x-d/2,y,d,h)}
function light(g,x,y,P,em,col){col=col||P.acc;g.fillStyle=P.ink;g.fillRect(x-6,y-6,12,12);g.fillStyle=col;g.fillRect(x-3,y-3,6,6);em.push({x,y,r:16,col,a:.8,blink:1})}

/* each maker returns the canvas size it needs; painting happens on g with origin top-left, feet on the bottom edge */
const MACH={
 reactor:(g,P,r,em)=>{const W2=170,H2=330;plate(g,40,20,90,32,P,{c:8},r);pipeV(g,30,60,250,16,P,{light:P.light,metal:P.alt,dark:P.ink});pipeV(g,140,60,250,16,P,{light:P.light,metal:P.alt,dark:P.ink});
   plate(g,12,46,146,262,P,{c:34,rivets:1},r);glowWin(g,48,82,74,190,P,em,{c:30,bars:3,a:.7});plate(g,0,300,170,30,P,{c:6,m:{light:P.light,metal:P.alt,dark:P.ink}},r);
   light(g,85,35,P,em);return[W2,H2]},
 generator:(g,P,r,em)=>{plate(g,6,40,228,170,P,{c:30,seams:0,rivets:1},r);glowWin(g,70,66,100,100,P,em,{c:30,a:.6});vents(g,22,70,32,8,P);vents(g,186,70,32,8,P);
   plate(g,24,6,70,40,P,{c:8,m:{light:P.light,metal:P.alt,dark:P.ink}},r);plate(g,146,6,70,40,P,{c:8,m:{light:P.light,metal:P.alt,dark:P.ink}},r);
   plate(g,0,200,240,30,P,{c:6,m:{light:P.light,metal:P.alt,dark:P.ink}},r);light(g,120,186,P,em,P.scr);return[240,230]},
 locker:(g,P,r,em)=>{plate(g,6,10,118,240,P,{c:16,seams:3,vseam:.5,rivets:1},r);vents(g,22,30,34,4,P);screenBox(g,72,28,38,26,P,em,r);
   glowWin(g,22,178,86,16,P,em,{c:4,a:.5});plate(g,0,248,130,22,P,{c:5,m:{light:P.light,metal:P.alt,dark:P.ink}},r);return[130,270]},
 tank:(g,P,r,em)=>{const m={light:P.light,metal:P.alt,dark:P.ink};plate(g,10,190,180,24,P,{c:6,m},r);for(const lx of[24,160]){plate(g,lx,150,18,50,P,{c:3,m},r)}
   const gr=g.createLinearGradient(20,0,180,0);gr.addColorStop(0,P.dark);gr.addColorStop(.3,P.light);gr.addColorStop(.55,P.metal);gr.addColorStop(1,P.dark);
   chamfer(g,18,12,164,150,46);g.fillStyle=gr;g.fill();g.lineWidth=3;g.strokeStyle=P.ink;g.stroke();
   for(const by of[44,128]){g.fillStyle=P.ink;g.fillRect(18,by,164,10);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(18,by,164,2)}
   hazard(g,40,64,120,12);glowWin(g,74,88,52,26,P,em,{c:6,col:P.scr,hot:'#e8fbff',a:.45});
   g.fillStyle=P.ink;g.beginPath();g.arc(150,100,13,0,7);g.fill();g.fillStyle='#e8e8e8';g.beginPath();g.arc(150,100,9,0,7);g.fill();g.strokeStyle='#c02020';g.lineWidth=2;g.beginPath();g.moveTo(150,100);g.lineTo(156,94);g.stroke();
   return[200,214]},
 console:(g,P,r,em)=>{const m={light:P.light,metal:P.alt,dark:P.ink};plate(g,46,80,58,110,P,{c:8,m},r);plate(g,10,176,130,24,P,{c:6,m},r);
   g.save();g.translate(75,70);g.rotate(-.18);plate(g,-66,-46,132,82,P,{c:12,rivets:1},r);screenBox(g,-52,-34,104,52,P,em,r);g.restore();
   for(let i=0;i<4;i++)light(g,30+i*30,128,P,em,i%2?P.acc:P.scr);return[150,200]},
 crate:(g,P,r,em)=>{const one=(x,y,s)=>{plate(g,x,y,s,s*.82,P,{c:s*.14,rivets:1},r);g.strokeStyle=P.ink;g.lineWidth=5;g.beginPath();g.moveTo(x+s*.18,y+s*.18);g.lineTo(x+s*.82,y+s*.64);g.stroke();
     g.fillStyle=P.acc;g.fillRect(x+s*.12,y+s*.62,s*.3,6);em.push({x:x+s*.27,y:y+s*.62+3,r:22,col:P.acc,a:.4})};
   const two=r()>.4;one(0,two?84:30,120);if(two)one(30,0,96);else one(110,58,90);return[two?132:204,184]},
 turret:(g,P,r,em)=>{const m={light:P.light,metal:P.alt,dark:P.ink};plate(g,30,150,140,60,P,{c:14,m},r);plate(g,60,110,80,46,P,{c:10},r);
   pipeH(g,110,74,110,18,P,m);plate(g,196,62,24,24,P,{c:4,m},r);plate(g,40,40,110,74,P,{c:22,rivets:1},r);glowWin(g,62,62,30,22,P,em,{c:6,a:.55});
   vents(g,104,58,32,4,P);light(g,96,130,P,em,P.scr);return[226,210]},
 pipes:(g,P,r,em)=>{const m={light:P.light,metal:P.alt,dark:P.ink};plate(g,6,96,24,64,P,{c:4,m},r);plate(g,250,96,24,64,P,{c:4,m},r);
   for(let i=0;i<3;i++){const y=34+i*36,d=26-i*4;pipeH(g,0,y,280,d,P,i===1?P:m);for(const cx of[60+i*30,190-i*20]){glowWin(g,cx,y-d/2-4,34,d+8,P,em,{c:6,a:.45,bars:2})}}
   plate(g,0,150,280,20,P,{c:5,m},r);return[280,170]},
 pod:(g,P,r,em)=>{const G=PAL.armory,m={light:P.light,metal:P.alt,dark:P.ink};plate(g,56,180,68,60,P,{c:8,m},r);plate(g,20,226,140,22,P,{c:6,m},r);
   plate(g,10,30,160,150,G,{c:44,m:G,rivets:1},r);plate(g,40,8,100,40,G,{c:12,m:G},r);glowWin(g,62,86,56,40,G,em,{c:14,col:'#ff8a3a',a:.7});
   g.fillStyle=G.ink;g.fillRect(12,70,16,60);g.fillRect(152,70,16,60);g.fillStyle='#ff8a3a';g.fillRect(16,92,8,14);g.fillRect(156,92,8,14);
   em.push({x:20,y:99,r:16,col:'#ff8a3a',a:.7,blink:1},{x:160,y:99,r:16,col:'#ff8a3a',a:.7,blink:1});return[180,248]},
};
function bakeMachine(kind,P,seed){const r=rng(seed),em=[],c=document.createElement('canvas');c.width=300;c.height=360;const g=c.getContext('2d');
  const sz=MACH[kind](g,P,r,em);const out=document.createElement('canvas');out.width=sz[0];out.height=sz[1];out.getContext('2d').drawImage(c,0,0);return{c:out,w:sz[0],h:sz[1],em}}
/* a darker wall of machinery behind the play plane */
function bakeWall(P,seed,tint){const r=rng(seed),w=380+Math.floor(r()*200),h=520+Math.floor(r()*140),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),em=[],fans=[];
  const D={light:shade(P.light,-.35),metal:shade(P.metal,-.42),dark:shade(P.dark,-.4)},A={light:shade(P.light,-.45),metal:shade(P.alt,-.4),dark:P.ink};
  plate(g,0,40,w,h-40,P,{c:40,m:D,seams:2},r);
  const cols=2+Math.floor(r()*2);for(let i=0;i<cols;i++){const cw=(w-40)/cols,x=20+i*cw,kind=r();
    if(kind<.35){plate(g,x+10,90,cw-20,h*.42,P,{c:22,m:A,rivets:1},r);glowWin(g,x+cw*.3,120,cw*.4,h*.3,P,em,{c:16,bars:2,a:.35})}
    else if(kind<.7){plate(g,x+10,90,cw-20,h*.28,P,{c:14,m:A},r);vents(g,x+30,110,cw-60,6,P);glowWin(g,x+24,90+h*.2,cw-48,14,P,em,{c:3,a:.3})}
    else if(kind<.85){pipeV(g,x+cw*.3,60,h-60,20,P,A);pipeV(g,x+cw*.7,60,h-60,14,P,A);glowWin(g,x+cw*.3-14,h*.45,28,40,P,em,{c:6,a:.35})}
    else{const fr=Math.min(cw*.36,80),fx=x+cw/2,fy=90+fr+10;plate(g,fx-fr-14,fy-fr-14,fr*2+28,fr*2+28,P,{c:18,m:A,rivets:1},r);g.fillStyle=P.ink;g.beginPath();g.arc(fx,fy,fr,0,7);g.fill();fans.push({x:fx,y:fy,r:fr-6})}}
  hazard(g,10,h-34,w-20,14);pipeH(g,0,64,w,22,P,A);
  if(tint){g.globalCompositeOperation='source-atop';g.fillStyle=rgba(tint,.5);g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over'}
  for(const e of em)e.a*=.6;return{c,w,h,em,fans,fcol:shade(P.alt,-.55)}}
/* ---- robot parts (outlined glossy cut-outs) ---- */
const bakeRBq=[];
const pE=(cx,cy,rx,ry)=>g=>{g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7)};
const pR=(x,y,w,h,r)=>g=>{r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
const pP=pts=>g=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
function gp(g,path,box,base,o){o=o||{};const[x,y,w,h]=box;path(g);g.fillStyle=base;g.fill();g.save();path(g);g.clip();
  const sh=g.createLinearGradient(x,y,x+w*.55,y+h);sh.addColorStop(0,'rgba(255,255,255,.2)');sh.addColorStop(.5,'rgba(0,0,0,0)');sh.addColorStop(1,`rgba(0,0,0,${o.dark||.45})`);g.fillStyle=sh;g.fillRect(x-4,y-4,w+8,h+8);
  if(o.gloss!==0){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x+w*.34,y+h*.24,Math.max(3,w*.2),Math.max(2,h*.1),-.45,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(x+w*.24,y+h*.18,Math.max(1.8,Math.min(w,h)*.05),0,7);g.fill()}
  g.restore();path(g);g.lineWidth=o.lw||5;g.lineJoin='round';g.strokeStyle=INK;g.stroke()}
function line(g,pts,col,w){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()}
function eyeDot(g,x,y,r,col){g.fillStyle=INK;g.beginPath();g.arc(x,y,r+3,0,7);g.fill();const e=g.createRadialGradient(x-r*.3,y-r*.3,1,x,y,r);e.addColorStop(0,'#ffffff');e.addColorStop(.35,shade(col,.5));e.addColorStop(1,col);g.fillStyle=e;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
function bakeRB(key,w,h,px,py,fn){const mk=dark=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.lineJoin='round';g.lineCap='round';fn(g);
    if(dark){g.globalCompositeOperation='source-atop';g.fillStyle='rgba(10,8,20,.38)';g.fillRect(0,0,w,h)}return c};RB[key]={c:mk(0),d:mk(1),px,py}}

/* Clawbot: violet steel, white chest, yellow spikes, serrated blade arms */
const CB={v:'#6d64bd',w:'#e9edf6',y:'#f2c230',k:'#3b2d33'};
bakeRB('cb_thigh',40,66,20,10,g=>gp(g,pR(6,4,28,56,13),[6,4,28,56],CB.k));
bakeRB('cb_shin',56,72,24,10,g=>{gp(g,pP([[8,6],[36,4],[40,58],[12,64]]),[8,4,32,60],CB.v);gp(g,pP([[36,10],[52,2],[40,28]]),[36,2,16,26],CB.y,{gloss:0,lw:4})});
bakeRB('cb_foot',76,40,22,10,g=>{gp(g,pR(4,6,54,24,10),[4,6,54,24],CB.w);for(let i=0;i<3;i++)gp(g,pP([[46+i*7,24],[70+i*2,30+i],[50+i*7,32]]),[46,24,26,10],CB.y,{gloss:0,lw:3})});
bakeRB('cb_uarm',38,62,19,10,g=>gp(g,pR(6,4,26,52,12),[6,4,26,52],CB.k));
bakeRB('cb_farm',66,112,22,12,g=>{gp(g,pP([[8,6],[42,6],[54,96],[22,104],[6,60]]),[6,6,48,98],CB.v);
  const t=[];for(let i=0;i<7;i++){t.push([44+i*1.6,14+i*13],[56+i*1.2,20+i*13])}gp(g,pP([[40,10]].concat(t,[[50,104],[44,100]])),[40,10,18,94],'#d8dcea',{gloss:0,lw:3});
  gp(g,pP([[10,8],[2,-4+12],[22,10]]),[2,6,20,8],CB.y,{gloss:0,lw:3});line(g,[[16,40],[34,70]],'rgba(255,255,255,.35)',3)});
bakeRB('cb_torso',124,124,62,112,g=>{gp(g,pE(48,62,46,52),[2,10,92,104],CB.v);gp(g,pE(70,58,38,46),[32,12,76,92],CB.w);
  line(g,[[18,40],[34,76]],CB.y,9);line(g,[[10,58],[24,90]],CB.y,9);gp(g,pR(30,96,64,22,10),[30,96,64,22],CB.k,{gloss:0});
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(74,64,10,26,0,0,7);g.fill()});
bakeRB('cb_head',136,96,46,72,g=>{for(let i=0;i<4;i++)gp(g,pP([[24+i*18,26-i*2],[30+i*18,0+i*2],[42+i*18,24-i*2]]),[24+i*18,0,18,26],CB.y,{gloss:0,lw:4});
  gp(g,pP([[14,52],[20,24],[52,14],[96,28],[132,52],[96,60],[60,70],[24,72]]),[14,14,118,58],CB.v);gp(g,pP([[40,62],[100,56],[128,54],[96,72],[48,78]]),[40,54,88,24],CB.w,{gloss:0,lw:4});
  line(g,[[60,62],[104,58]],INK,3);eyeDot(g,76,40,9,'#ff3d6e')});

/* Gorilla mech: brass body, dark ribbed joints, huge fists, twin red eyes */
const GO={b:'#e2a832',d:'#4a3a28',k:'#2c2622'};
bakeRB('go_torso',196,176,92,164,g=>{gp(g,pE(100,82,86,74),[14,8,172,148],GO.b);gp(g,pR(52,104,92,40,16),[52,104,92,40],GO.k,{gloss:0});
  for(let i=0;i<5;i++){g.fillStyle='#e8c070';g.fillRect(62+i*16,112,8,24)}for(const[x,y]of[[40,60],[160,60],[60,30],[140,30],[100,22]]){g.fillStyle=INK;g.beginPath();g.arc(x,y,5,0,7);g.fill()}
  gp(g,pE(150,48,34,30),[116,18,68,60],shade(GO.b,.12));gp(g,pR(70,150,60,22,8),[70,150,60,22],GO.k,{gloss:0})});
bakeRB('go_head',92,80,30,70,g=>{gp(g,pR(10,14,70,56,18),[10,14,70,56],GO.b);gp(g,pR(30,30,52,22,10),[30,30,52,22],'#1a1416',{gloss:0,lw:4});eyeDot(g,46,41,7,'#ff3a2a');eyeDot(g,66,41,7,'#ff3a2a');
  line(g,[[30,14],[26,0]],INK,4);gp(g,pE(26,4,5,5),[21,-1,10,10],'#ff3a2a',{gloss:0,lw:3})});
bakeRB('go_uarm',58,96,29,12,g=>{gp(g,pR(10,4,38,84,16),[10,4,38,84],GO.d);for(let y=20;y<84;y+=14)line(g,[[14,y],[44,y]],'rgba(0,0,0,.45)',3)});
bakeRB('go_farm',112,150,52,14,g=>{gp(g,pP([[22,6],[78,6],[100,110],[6,112]]),[6,6,94,106],GO.b);gp(g,pR(4,100,102,44,18),[4,100,102,44],GO.k);
  for(let i=0;i<4;i++)line(g,[[22+i*22,108],[22+i*22,138]],'rgba(255,255,255,.18)',3);gp(g,pE(52,52,18,18),[34,34,36,36],shade(GO.b,-.2),{gloss:0,lw:4});
  for(let i=0;i<6;i++){const a=i*Math.PI/3;g.fillStyle=INK;g.fillRect(52+Math.cos(a)*18-3,52+Math.sin(a)*18-3,6,6)}});
bakeRB('go_thigh',56,64,28,8,g=>gp(g,pR(8,4,40,56,14),[8,4,40,56],GO.d));
bakeRB('go_shin',70,68,34,8,g=>gp(g,pP([[10,4],[60,4],[64,60],[6,62]]),[6,4,58,58],GO.b));
bakeRB('go_foot',100,40,40,8,g=>gp(g,pR(4,6,90,28,12),[4,6,90,28],GO.k));

/* Walker mech: blue-grey boxy hull, orange stripes, twin arm cannons, reverse knees */
const WK={b:'#566a8a',l:'#8ea2c2',k:'#252c3a',o:'#ff8a2a'};
bakeRB('wk_hull',248,150,124,138,g=>{gp(g,pP([[14,40],[40,10],[210,10],[240,44],[236,112],[200,136],[48,136],[10,110]]),[10,10,230,126],WK.b);
  gp(g,pP([[60,20],[190,20],[200,44],[52,44]]),[52,20,148,24],WK.l,{lw:4});line(g,[[30,76],[220,76]],WK.o,12);line(g,[[36,96],[214,96]],WK.o,8);
  gp(g,pR(176,52,52,18,6),[176,52,52,18],'#1a0c0c',{gloss:0,lw:4});g.fillStyle='#ff3a2a';g.fillRect(184,57,36,8);for(let i=0;i<4;i++)line(g,[[30+i*14,52],[30+i*14,66]],INK,4)});
bakeRB('wk_gun',190,70,34,35,g=>{gp(g,pR(8,10,120,50,10),[8,10,120,50],WK.b);gp(g,pR(118,22,66,24,6),[118,22,66,24],WK.k,{gloss:0});line(g,[[30,24],[100,24]],'rgba(255,255,255,.35)',4);
  g.fillStyle=WK.o;g.fillRect(24,42,30,8);g.fillRect(64,42,30,8);g.fillStyle='#120a08';g.fillRect(176,26,8,16)});
bakeRB('wk_thigh',64,120,32,12,g=>gp(g,pP([[10,6],[54,6],[46,110],[18,112]]),[10,6,44,106],WK.b));
bakeRB('wk_shin',56,128,28,10,g=>{gp(g,pR(10,4,36,116,14),[10,4,36,116],WK.k);line(g,[[28,20],[28,100]],WK.o,5)});
bakeRB('wk_foot',116,42,52,8,g=>{gp(g,pP([[6,8],[96,8],[112,34],[2,34]]),[2,8,110,26],WK.b);gp(g,pE(52,20,12,12),[40,8,24,24],WK.k,{gloss:0,lw:4})});

/* Tripod drone: yellow capsule, big red lens, antenna, dangling claw legs */
const DR={y:'#ecb534',k:'#2e2a2a'};
bakeRB('dr_body',104,112,52,58,g=>{line(g,[[52,20],[52,2]],INK,5);gp(g,pE(52,2,6,6),[46,-4,12,12],'#ff3a2a',{gloss:0,lw:3});gp(g,pR(14,18,76,78,26),[14,18,76,78],DR.y);
  gp(g,pR(30,36,48,40,14),[30,36,48,40],'#3a3030',{gloss:0,lw:4});eyeDot(g,58,56,13,'#ff3a2a');for(const[x,y]of[[22,30],[82,30],[22,84],[82,84]]){g.fillStyle=INK;g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}
  gp(g,pR(30,92,44,14,6),[30,92,44,14],DR.k,{gloss:0,lw:4})});
bakeRB('dr_leg',34,84,17,6,g=>{line(g,[[17,6],[17,54]],INK,9);line(g,[[17,6],[17,54]],'#5a5050',5);gp(g,pP([[8,52],[26,52],[30,64],[17,82],[4,64]]),[4,52,26,30],DR.y,{gloss:0,lw:4})});

/* Jet gunner: white and black armor, red stripe, visor helmet with fin, long rifle, jetpack */
const GN={w:'#e8ecf4',k:'#2a2c34',r:'#e23a3a'};
bakeRB('gn_torso',96,104,46,96,g=>{gp(g,pR(14,10,68,80,20),[14,10,68,80],GN.w);gp(g,pR(10,64,76,30,10),[10,64,76,30],GN.k,{gloss:0});line(g,[[24,40],[72,40]],GN.r,7)});
bakeRB('gn_head',96,92,40,80,g=>{gp(g,pP([[6,46],[30,0],[40,6],[30,40]]),[6,0,34,46],GN.w,{gloss:0,lw:4});gp(g,pE(48,50,34,32),[14,18,68,64],GN.k);
  gp(g,pR(52,40,32,12,6),[52,40,32,12],GN.w,{gloss:0,lw:3});g.fillStyle='#ff4a3a';g.fillRect(60,43,16,6)});
bakeRB('gn_jet',50,80,24,10,g=>{gp(g,pR(6,4,38,62,12),[6,4,38,62],GN.k);gp(g,pR(10,60,30,14,4),[10,60,30,14],'#5a5c66',{gloss:0,lw:3})});
bakeRB('gn_rifle',230,52,52,26,g=>{gp(g,pR(10,16,170,20,6),[10,16,170,20],GN.k);gp(g,pR(176,20,48,10,3),[176,20,48,10],'#4a4c56',{gloss:0,lw:3});gp(g,pR(70,4,50,12,4),[70,4,50,12],GN.w,{gloss:0,lw:3});
  gp(g,pP([[40,36],[62,36],[54,50],[38,50]]),[38,36,24,14],GN.k,{gloss:0,lw:3});g.fillStyle=GN.r;g.fillRect(130,22,30,6)});
bakeRB('gn_leg',40,70,20,8,g=>{gp(g,pR(8,4,24,50,10),[8,4,24,50],GN.k);gp(g,pR(4,48,34,18,6),[4,48,34,18],GN.w,{gloss:0,lw:4})});

/* Robo-hound: yellow quadruped with a toothed jaw and cable tail */
const HD={y:'#f0b830',k:'#2e2626'};
bakeRB('hd_body',156,76,78,40,g=>{gp(g,pR(14,12,128,52,24),[14,12,128,52],HD.y);gp(g,pR(40,22,70,14,6),[40,22,70,14],HD.k,{gloss:0,lw:3});for(let i=0;i<4;i++){g.fillStyle=INK;g.fillRect(48+i*16,48,8,10)}});
bakeRB('hd_head',110,78,24,40,g=>{gp(g,pP([[6,14],[60,6],[104,24],[100,46],[60,44],[8,52]]),[6,6,98,46],HD.y);gp(g,pP([[24,46],[96,48],[90,66],[30,64]]),[24,46,72,20],HD.y,{gloss:0,lw:4});
  for(let i=0;i<5;i++){g.fillStyle='#ffffff';g.beginPath();g.moveTo(40+i*12,46);g.lineTo(46+i*12,56);g.lineTo(52+i*12,46);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke()}eyeDot(g,70,24,8,'#ff3a2a')});
bakeRB('hd_leg',34,74,17,8,g=>{gp(g,pR(8,4,18,40,8),[8,4,18,40],HD.k,{gloss:0});gp(g,pR(4,36,26,34,8),[4,36,26,34],HD.y,{gloss:0,lw:4})});
const MK={c:'#22304e',cl:'#33466e',lin:'#7a1e2a',lea:'#6a4a2e',st:'#a9b3c4',sk:'#f0d4bc',h:'#1e2a46',g:'#d9a84a'};
bakeRB('mk_tails',260,270,130,8,g=>{gp(g,pP([[60,4],[200,4],[244,250],[170,236],[130,262],[90,236],[16,250]]),[16,4,228,258],MK.c,{gloss:0});
  gp(g,pP([[96,20],[164,20],[178,230],[130,250],[82,230]]),[82,20,96,230],MK.lin,{gloss:0,lw:3});line(g,[[30,240],[100,20]],MK.lea,6);line(g,[[230,240],[160,20]],MK.lea,6)});
bakeRB('mk_body',176,200,88,190,g=>{gp(g,pP([[30,30],[146,30],[160,186],[16,186]]),[16,30,144,156],MK.cl);gp(g,pP([[62,34],[114,34],[106,180],[70,180]]),[62,34,52,146],'#2f63a8',{lw:4});
  gp(g,pP([[30,30],[64,32],[74,186],[16,186]]),[16,30,58,156],MK.lea,{lw:4});gp(g,pP([[146,30],[112,32],[102,186],[160,186]]),[102,30,58,156],MK.lea,{lw:4});
  line(g,[[40,40],[140,150]],'#4a3020',12);line(g,[[40,40],[140,150]],MK.lea,7);gp(g,pR(20,140,136,24,6),[20,140,136,24],'#4a3020',{gloss:0,lw:4});
  gp(g,pE(88,152,18,16),[70,136,36,32],MK.g,{lw:4});line(g,[[80,152],[96,152]],INK,3);gp(g,pP([[60,10],[88,30],[116,10],[124,40],[52,40]]),[52,10,72,30],MK.c,{gloss:0,lw:4})});
bakeRB('mk_head',112,126,56,116,g=>{gp(g,pR(30,40,52,66,22),[30,40,52,66],MK.sk,{gloss:0,lw:4});
  g.fillStyle='#1a1418';g.fillRect(62,66,16,5);g.fillRect(40,66,12,5);line(g,[[52,92],[70,90]],'#7a4a3a',3);
  gp(g,pP([[18,58],[22,26],[10,10],[38,18],[44,0],[60,16],[78,2],[82,22],[102,14],[92,40],[100,58],[84,44],[60,40],[34,46]]),[10,0,92,58],MK.h,{lw:4});
  gp(g,pP([[24,96],[40,108],[72,108],[88,96],[96,124],[16,124]]),[16,96,80,28],MK.c,{gloss:0,lw:4})});
bakeRB('mk_paul',104,80,52,24,g=>{gp(g,pP([[8,30],[30,8],[78,8],[100,30],[92,60],[14,60]]),[8,8,92,52],MK.st);gp(g,pP([[18,52],[86,52],[80,74],[24,74]]),[18,52,68,22],shade(MK.st,-.2),{gloss:0,lw:4});
  for(const x of[24,80]){g.fillStyle=MK.g;g.beginPath();g.arc(x,30,5,0,7);g.fill()}});
bakeRB('mk_arm',70,156,35,12,g=>{gp(g,pR(14,4,42,96,18),[14,4,42,96],MK.c);gp(g,pR(10,84,50,40,10),[10,84,50,40],MK.st,{lw:4});line(g,[[14,104],[56,104]],MK.g,4);gp(g,pE(35,136,18,16),[17,120,36,32],MK.sk,{gloss:0,lw:4})});
bakeRB('mk_leg',72,164,36,10,g=>{gp(g,pR(18,4,36,96,14),[18,4,36,96],'#151d30',{gloss:0});gp(g,pP([[12,92],[56,92],[60,140],[70,150],[66,160],[6,160],[10,140]]),[6,92,64,68],MK.lea,{lw:4});line(g,[[14,112],[58,112]],'#3a2414',5)});

/* ---- pickups and crates ---- */
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
  case'tank':{plate(X,-20,-26,40,52,PAL.citadel,{c:8});const tg=X.createLinearGradient(0,-18,0,18);tg.addColorStop(0,'#ffd0f4');tg.addColorStop(1,'#ff5ad8');X.fillStyle=tg;X.fillRect(-11,-17,22,34);
    X.fillStyle='#ffffff';X.fillRect(-3,-11,6,22);X.fillRect(-9,-3,18,6)}break;
  case'egg':{const eg=X.createLinearGradient(-20,-28,20,28);eg.addColorStop(0,'#fff6c8');eg.addColorStop(.5,'#ffd24a');eg.addColorStop(1,'#c88a1a');X.fillStyle=eg;X.beginPath();X.ellipse(0,0,22,29,0,0,7);X.fill();
    X.fillStyle='rgba(120,70,10,.35)';X.beginPath();X.arc(-7,6,4,0,7);X.arc(8,-4,3,0,7);X.arc(4,14,3,0,7);X.fill();glow(-8,-12,14,'#ffffff',.6+.4*Math.sin(lvT*5))}break}
  X.restore()}
</script>
