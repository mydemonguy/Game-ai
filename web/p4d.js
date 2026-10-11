<script>
"use strict";
/* ---------- sci-fi machinery kit: beveled plates, glowing windows, vents, pipes. Each machine is painted once into
   its own canvas (baked) and its glowing parts are listed so they can pulse live. ---------- */
const PAL={
 hangar:{metal:'#626b78',light:'#a7b1be',dark:'#2c323b',ink:'#14171c',acc:'#ff9a2a',acc2:'#ffd9a0',scr:'#7fd8ff',alt:'#4a525e'},
 armory:{metal:'#5f8a6e',light:'#a2c8ac',dark:'#26372d',ink:'#111813',acc:'#ff8a3a',acc2:'#ffc890',scr:'#9affc8',alt:'#4b535c'},
 station:{metal:'#c3c9d2',light:'#f3f5f8',dark:'#596171',ink:'#1f232a',acc:'#ff9a2a',acc2:'#ffe0b0',scr:'#7fd8ff',alt:'#6c7482'},
 cargo:{metal:'#e09f2c',light:'#ffd47e',dark:'#6a4a1c',ink:'#221709',acc:'#ffb347',acc2:'#fff0c8',scr:'#8fe8ff',alt:'#4c4d54'},
 citadel:{metal:'#4e4a64',light:'#8e88ad',dark:'#221f30',ink:'#0f0d17',acc:'#ff7a2a',acc2:'#e0ccff',scr:'#b48cff',alt:'#3a3650'},
 core:{metal:'#4c4246',light:'#8a7a80',dark:'#1f1a1c',ink:'#0b0909',acc:'#ff4a2a',acc2:'#ffc0a0',scr:'#ff8a6a',alt:'#352d30'}};
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
function bakeWall(P,seed,tint){const r=rng(seed),w=380+Math.floor(r()*200),h=520+Math.floor(r()*140),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),em=[];
  const D={light:shade(P.light,-.35),metal:shade(P.metal,-.42),dark:shade(P.dark,-.4)},A={light:shade(P.light,-.45),metal:shade(P.alt,-.4),dark:P.ink};
  plate(g,0,40,w,h-40,P,{c:40,m:D,seams:2},r);
  const cols=2+Math.floor(r()*2);for(let i=0;i<cols;i++){const cw=(w-40)/cols,x=20+i*cw,kind=r();
    if(kind<.35){plate(g,x+10,90,cw-20,h*.42,P,{c:22,m:A,rivets:1},r);glowWin(g,x+cw*.3,120,cw*.4,h*.3,P,em,{c:16,bars:2,a:.35})}
    else if(kind<.7){plate(g,x+10,90,cw-20,h*.28,P,{c:14,m:A},r);vents(g,x+30,110,cw-60,6,P);glowWin(g,x+24,90+h*.2,cw-48,14,P,em,{c:3,a:.3})}
    else{pipeV(g,x+cw*.3,60,h-60,20,P,A);pipeV(g,x+cw*.7,60,h-60,14,P,A);glowWin(g,x+cw*.3-14,h*.45,28,40,P,em,{c:6,a:.35})}}
  hazard(g,10,h-34,w-20,14);pipeH(g,0,64,w,22,P,A);
  if(tint){g.globalCompositeOperation='source-atop';g.fillStyle=rgba(tint,.5);g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over'}
  for(const e of em)e.a*=.6;return{c,w,h,em}}
function drawBaked(b,x,y){X.drawImage(b.c,x,y);for(const e of b.em){const p=e.blink?(Math.sin(lvT*3+x*.01+e.x)>-.3?1:.25):(.8+.2*Math.sin(lvT*2+e.y));glow(x+e.x,y+e.y,e.r,e.col,e.a*p,e.ry)}}
</script>
