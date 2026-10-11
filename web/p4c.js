<script>
"use strict";
/* ---------- middle frame (machines on the play plane) + foreground (in front of the action) ---------- */
const PROPK={hangar:['generator','locker','crate','reactor','console'],armory:['pod','turret','crate','locker','generator'],station:['console','pipes','reactor','locker','turret'],
  cargo:['tank','crate','tank','pipes','generator'],citadel:['reactor','console','locker','turret'],core:['reactor','generator','pipes','tank']};
const TOPK={hangar:'beams',armory:'cables',station:'beams',cargo:'chains',citadel:'cables',core:'chains'};
function addLayers(B){const L=B.L,P=PAL[L.theme],r=rng(L.len*13+5),ks=PROPK[L.theme];B.props=[];B.fgTop=[];B.fgBig=[];B.walls=[];B.mach={};
  const mk=(k,v)=>B.mach[k+v]||(B.mach[k+v]=bakeMachine(k,P,L.len+k.length*31+v*977));
  let x=520;while(x<L.len-420){const k=ks[Math.floor(r()*ks.length)];B.props.push({x,b:mk(k,Math.floor(r()*2))});x+=430+r()*640}
  const walls=[0,1,2,3].map(i=>bakeWall(P,L.len*3+i*71,L.sky[1]));x=150;while(x<L.len*.62+2900){B.walls.push({x,b:walls[Math.floor(r()*walls.length)]});x+=700+r()*800}
  x=-200;while(x<L.len*1.35+2900){B.fgTop.push({x,w:200+r()*300,h:90+r()*150,s:r()});x+=420+r()*620}
  x=1800;while(x<L.len*1.5+2900){B.fgBig.push({x,w:70+r()*36,s:r()});x+=3000+r()*1800}
  return B}
function drawProps(){const B=bg;for(const o of B.props){const b=o.b,x=o.x-b.w/2;if(x>cam+W+40||x+b.w<cam-40)continue;drawBaked(b,x,GY-b.h+4)}}

function truss(x,y,w,h,col){X.fillStyle=col;X.fillRect(x,y,w,8);X.fillRect(x,y+h-8,w,8);X.strokeStyle=col;X.lineWidth=6;X.beginPath();
  for(let i=0;i<w;i+=h){X.moveTo(x+i,y+4);X.lineTo(x+Math.min(w,i+h),y+h-4);X.moveTo(x+Math.min(w,i+h),y+4);X.lineTo(x+i,y+h-4)}X.stroke()}
function drawFG(){const B=bg,L=B.L,P=PAL[L.theme],col=shade(L.gnd,-.62),rim=rgba(L.glow,.28),k=FGK[L.theme],tk=TOPK[L.theme];
  X.fillStyle=col;
  for(const o of B.fg){const x=o.x-cam*1.3,w=o.w*1.2,h=o.h*1.5;if(x>W+60||x+w<-60)continue;X.fillStyle=col;X.beginPath();
    if(k==='rail'){X.fillRect(x,H-h,w,10);for(let i=0;i<=4;i++)X.fillRect(x+i*w/4-5,H-h,10,h);X.fillRect(x,H-h*.5,w,6);glow(x+w/2,H-h,18,L.glow,.4)}
    else if(k==='pipes'){X.fillRect(x,H-h*.6,w,30);X.fillRect(x,H-h*.6+40,w*.7,18);X.fillRect(x+w*.7,H-h-60,30,h+60);X.fillStyle=rim;X.fillRect(x+w*.7+24,H-h-60,4,h+60);
      glow(x+w*.7+15,H-h-60,22,L.glow,.5+Math.sin(lvT*5+o.s*9)*.3)}
    else{for(let i=0;i<6;i++){const sx=x+i*w/6;X.moveTo(sx,H);X.lineTo(sx+w/12,H-h*(.5+((o.s*7+i)%1)));X.lineTo(sx+w/6,H)}X.fill()}}
  for(const o of B.fgTop){const x=o.x-cam*1.35,w=o.w,h=o.h,sw=Math.sin(lvT*.9+o.s*6)*10;if(x>W+80||x+w<-80)continue;X.fillStyle=col;X.strokeStyle=col;
    if(tk==='beams'){truss(x-60,0,w+120,46,col);const lx=x+w*.5,lh=40+h*.4;X.lineWidth=4;X.beginPath();X.moveTo(lx,46);X.lineTo(lx+sw*.3,lh);X.stroke();
      X.fillRect(lx-26+sw*.3,lh,52,16);X.fillStyle=P.acc2;X.fillRect(lx-20+sw*.3,lh+16,40,5);glow(lx+sw*.3,lh+24,70,L.glow,.35)}
    else if(tk==='cables'){X.lineWidth=7;X.beginPath();X.moveTo(x-40,0);X.quadraticCurveTo(x+w/2,h+sw,x+w+40,0);X.stroke();X.lineWidth=4;X.beginPath();X.moveTo(x,0);X.quadraticCurveTo(x+w*.6,h*.7+sw,x+w+80,0);X.stroke();
      for(let i=1;i<4;i++){const t=i/4,cx=(1-t)*(1-t)*(x-40)+2*t*(1-t)*(x+w/2)+t*t*(x+w+40),cy=2*t*(1-t)*(h+sw);glow(cx,cy+8,16,L.glow,.7);X.fillRect(cx-5,cy,10,12)}}
    else{X.lineWidth=9;X.setLineDash([20,9]);for(let i=0;i<2;i++){const cx=x+i*w*.6,ch=h*(1+i*.3);X.beginPath();X.moveTo(cx,0);X.lineTo(cx+sw,ch);X.stroke()}X.setLineDash([]);
      X.lineWidth=7;X.beginPath();X.arc(x+sw,h+14,14,.3,Math.PI*1.4);X.stroke();X.fillRect(x+w*.6+sw-22,h*1.3,44,30);glow(x+w*.6+sw,h*1.3+15,26,L.glow,.4)}}
  /* braced steel columns that sweep past in front; they turn see-through when a character is behind them */
  const xs=[];if(pl)xs.push(pl.x-cam);for(const e of en)xs.push(e.x-cam);if(boss&&!boss.dead)xs.push(boss.x-cam);
  for(const o of B.fgBig){const x=o.x-cam*1.55,w=o.w;if(x>W+40||x+w<-40)continue;const near=xs.some(sx=>Math.abs(x+w/2-sx)<w/2+110);
    o.a=(o.a==null?.85:o.a)+((near?.22:.85)-(o.a==null?.85:o.a))*.2;X.globalAlpha=o.a;
    X.fillStyle=col;X.fillRect(x,0,14,H);X.fillRect(x+w-14,0,14,H);X.strokeStyle=col;X.lineWidth=7;X.beginPath();
    for(let y=60;y<H;y+=w*1.2){X.moveTo(x+7,y);X.lineTo(x+w-7,y+w*1.2);X.moveTo(x+w-7,y);X.lineTo(x+7,y+w*1.2)}X.stroke();
    X.fillRect(x-20,0,w+40,60);X.fillRect(x-20,H-90,w+40,90);X.fillStyle=rim;X.fillRect(x+w-4,60,4,H-150);
    X.fillStyle=L.glow;X.globalAlpha=o.a*.8;X.fillRect(x-14,40,w+28,5);X.globalAlpha=1}}
</script>
