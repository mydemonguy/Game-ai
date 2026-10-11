<script>
"use strict";
/* ---------- middle frame (props on the play plane) + foreground (in front of the action) ---------- */
const PROPK={ruins:['stub','statue','banner','lamp'],crystal:['cluster','cluster','stub','lamp'],sky:['crate','lamp','banner','crate'],
  forge:['anvil','brazier','crate','brazier'],citadel:['obelisk','brazier','banner','obelisk'],throne:['stub','brazier','obelisk','statue']};
const TOPK={ruins:'vines',crystal:'icicles',sky:'cables',forge:'chains',citadel:'drapes',throne:'chains'};
function addLayers(B){const L=B.L,r=rng(L.len*13+5),ks=PROPK[L.theme];B.props=[];B.fgTop=[];B.fgBig=[];
  let x=500;while(x<L.len-450){B.props.push({x,k:ks[Math.floor(r()*ks.length)],s:r(),h:.8+r()*.5});x+=480+r()*720}
  x=-200;while(x<L.len*1.35+2900){B.fgTop.push({x,w:160+r()*260,h:90+r()*170,s:r()});x+=380+r()*620}
  x=1800;while(x<L.len*1.5+2900){B.fgBig.push({x,w:70+r()*40,s:r()});x+=3000+r()*1800}
  return B}

function flame(x,y,sc,col){const f=Math.sin(lvT*18+x)*.15+Math.sin(lvT*11+x*2)*.1;glow(x,y-20*sc,70*sc,col,.75);
  X.fillStyle=col;X.beginPath();X.moveTo(x-16*sc,y);X.quadraticCurveTo(x-10*sc,y-30*sc,x+(f*30)*sc,y-(58+f*20)*sc);X.quadraticCurveTo(x+12*sc,y-28*sc,x+16*sc,y);X.fill();
  X.fillStyle='#fff3c4';X.beginPath();X.moveTo(x-7*sc,y);X.quadraticCurveTo(x-4*sc,y-16*sc,x+f*12*sc,y-(30+f*10)*sc);X.quadraticCurveTo(x+5*sc,y-14*sc,x+7*sc,y);X.fill()}
function prop(o,L){const x=o.x,y=GY,s=o.h,base=shade(L.mid,.06),hi=rgba(shade(L.glow,.3),.35),dk=shade(L.mid,-.35);
  if(x<cam-260||x>cam+W+260)return;
  switch(o.k){
  case'stub':{const w=70*s,h=150*s+o.s*90;X.fillStyle=dk;X.fillRect(x-w*.8,y-26,w*1.6,26);X.fillStyle=base;X.beginPath();X.moveTo(x-w/2,y-26);X.lineTo(x-w/2,y-h);X.lineTo(x-w*.1,y-h-22*s);
    X.lineTo(x+w*.15,y-h+8);X.lineTo(x+w/2,y-h-12);X.lineTo(x+w/2,y-26);X.fill();X.fillStyle=hi;X.fillRect(x+w/2-5,y-h,5,h-26);
    X.strokeStyle='rgba(0,0,0,.35)';X.lineWidth=2;for(let i=1;i<4;i++){X.beginPath();X.moveTo(x-w/2+i*w/4,y-26);X.lineTo(x-w/2+i*w/4,y-h+10);X.stroke()}
    X.fillStyle='rgba(110,170,90,.45)';X.fillRect(x-w/2,y-h*.4,w*.4,6);X.fillRect(x-w*.1,y-h-4,w*.3,5);
    if(o.s>.5){X.fillStyle=L.glow;X.globalAlpha=.6+.3*Math.sin(lvT*2+o.s*9);X.beginPath();X.arc(x,y-h*.55,7,0,7);X.fill();X.globalAlpha=1;glow(x,y-h*.55,30,L.glow,.5)}}break;
  case'statue':{const sc=s*1.1;X.fillStyle=dk;X.fillRect(x-60*sc,y-50*sc,120*sc,50*sc);X.fillStyle=hi;X.fillRect(x-60*sc,y-50*sc,120*sc,4);X.fillStyle=base;X.beginPath();
    X.moveTo(x-40*sc,y-50*sc);X.lineTo(x-28*sc,y-190*sc);X.quadraticCurveTo(x,y-250*sc,x+28*sc,y-190*sc);X.lineTo(x+40*sc,y-50*sc);X.fill();
    X.beginPath();X.moveTo(x+20*sc,y-170*sc);X.lineTo(x+40*sc,y-300*sc);X.lineTo(x+48*sc,y-298*sc);X.lineTo(x+30*sc,y-160*sc);X.fill();
    X.fillStyle='#000';X.globalAlpha=.5;X.beginPath();X.ellipse(x+2*sc,y-200*sc,12*sc,16*sc,0,0,7);X.fill();X.globalAlpha=1;
    X.fillStyle=L.glow;X.fillRect(x-4*sc,y-205*sc,8*sc,3);glow(x,y-204*sc,22*sc,L.glow,.7);glow(x+44*sc,y-300*sc,30*sc,L.glow,.4+.2*Math.sin(lvT*3))}break;
  case'banner':{const h=260*s,wv=Math.sin(lvT*2.4+o.s*7);X.fillStyle=dk;X.fillRect(x-5,y-h,10,h);X.fillRect(x-40,y-h,80,8);
    X.fillStyle=shade(L.glow,-.45);X.beginPath();X.moveTo(x-34,y-h+8);X.lineTo(x+34,y-h+8);X.lineTo(x+30+wv*8,y-h+140);X.lineTo(x+wv*10,y-h+118);X.lineTo(x-30+wv*8,y-h+140);X.closePath();X.fill();
    X.strokeStyle=rgba(L.glow,.7);X.lineWidth=2;X.stroke();X.fillStyle=rgba(L.glow,.8);X.beginPath();X.moveTo(x+wv*5,y-h+40);X.lineTo(x+12+wv*5,y-h+62);X.lineTo(x+wv*5,y-h+84);X.lineTo(x-12+wv*5,y-h+62);X.fill()}break;
  case'lamp':{const h=210*s,fl=.75+.25*Math.sin(lvT*9+o.s*20)*Math.sin(lvT*3.3);X.fillStyle=dk;X.fillRect(x-6,y-h,12,h);X.fillRect(x-22,y-14,44,14);X.fillRect(x,y-h,46,7);
    X.fillStyle=base;X.fillRect(x+30,y-h+7,32,40);glow(x+46,y-h+28,90,L.glow,.55*fl);X.fillStyle=shade(L.glow,.5);X.fillRect(x+35,y-h+12,22,30)}break;
  case'brazier':{const sc=s;X.fillStyle=dk;X.beginPath();X.moveTo(x-34*sc,y);X.lineTo(x-8*sc,y-80*sc);X.lineTo(x+8*sc,y-80*sc);X.lineTo(x+34*sc,y);X.lineTo(x+22*sc,y);X.lineTo(x,y-56*sc);X.lineTo(x-22*sc,y);X.fill();
    X.fillStyle=base;X.beginPath();X.moveTo(x-46*sc,y-104*sc);X.lineTo(x+46*sc,y-104*sc);X.lineTo(x+30*sc,y-78*sc);X.lineTo(x-30*sc,y-78*sc);X.fill();X.fillStyle=hi;X.fillRect(x-46*sc,y-106*sc,92*sc,4);
    flame(x-10*sc,y-104*sc,.9*sc,L.glow);flame(x+12*sc,y-104*sc,.7*sc,L.glow);
    if(Math.random()<.25)parts.push({x:x+(Math.random()-.5)*40,y:y-140*sc,vx:(Math.random()-.5)*40,vy:-90-Math.random()*90,life:.8,max:.8,col:L.glow,sz:4,g:-20})}break;
  case'cluster':{X.save();X.translate(x,y);const sc=s;for(let i=-2;i<=2;i++){const hh=(70+((o.s*17+i*7)%1)*130)*sc*(i===0?1.4:1),w=24*sc;X.save();X.rotate(i*.22);
      X.fillStyle=shade(L.glow,-.55);X.beginPath();X.moveTo(-w,0);X.lineTo(-w*.6,-hh*.8);X.lineTo(0,-hh);X.lineTo(w*.6,-hh*.8);X.lineTo(w,0);X.fill();
      X.fillStyle=rgba(L.glow,.35);X.beginPath();X.moveTo(0,0);X.lineTo(0,-hh);X.lineTo(w*.6,-hh*.8);X.lineTo(w,0);X.fill();X.restore()}
    X.restore();glow(x,y-60*s,120*s,L.glow,.35+.15*Math.sin(lvT*2+o.s*9))}break;
  case'crate':{const sc=s,c=60*sc;const box=(bx,by,sz)=>{X.fillStyle=base;X.fillRect(bx,by,sz,sz);X.strokeStyle=dk;X.lineWidth=4;X.strokeRect(bx+2,by+2,sz-4,sz-4);
      X.beginPath();X.moveTo(bx,by);X.lineTo(bx+sz,by+sz);X.stroke();X.fillStyle=hi;X.fillRect(bx,by,sz,3)};
    box(x-c,y-c,c);box(x,y-c*.9,c*.9);if(o.s>.4)box(x-c*.6,y-c*1.95,c*.95);X.fillStyle=rgba(L.glow,.85);X.fillRect(x+8,y-c*.6,c*.5,8);glow(x+8+c*.25,y-c*.6+4,24,L.glow,.5)}break;
  case'anvil':{const sc=s;X.fillStyle=dk;X.fillRect(x-30*sc,y-70*sc,60*sc,70*sc);X.fillStyle=base;X.beginPath();X.moveTo(x-70*sc,y-70*sc);X.lineTo(x+60*sc,y-70*sc);X.lineTo(x+90*sc,y-96*sc);
    X.lineTo(x-60*sc,y-104*sc);X.closePath();X.fill();X.fillStyle=hi;X.fillRect(x-60*sc,y-106*sc,140*sc,4);
    X.fillStyle='#ffb070';X.fillRect(x-30*sc,y-118*sc,70*sc,12*sc);glow(x+5*sc,y-112*sc,60*sc,'#ff6a2a',.7+.2*Math.sin(lvT*6));
    X.fillStyle=dk;X.fillRect(x+70*sc,y-60*sc,40*sc,60*sc);X.fillStyle='#ff7a2a';X.fillRect(x+74*sc,y-60*sc,32*sc,6);glow(x+90*sc,y-60*sc,30*sc,'#ff7a2a',.6)}break;
  case'obelisk':{const h=300*s,w=56*s;X.fillStyle=dk;X.fillRect(x-w,y-30,w*2,30);X.fillStyle=base;X.beginPath();X.moveTo(x-w/2,y-30);X.lineTo(x-w*.38,y-h);X.lineTo(x,y-h-50*s);X.lineTo(x+w*.38,y-h);X.lineTo(x+w/2,y-30);X.fill();
    X.fillStyle=hi;X.beginPath();X.moveTo(x,y-h-50*s);X.lineTo(x+w*.38,y-h);X.lineTo(x+w/2,y-30);X.lineTo(x+w*.36,y-30);X.lineTo(x+w*.26,y-h);X.fill();
    for(let i=0;i<4;i++){const ry=y-60-i*(h-80)/4,a=.4+.5*Math.max(0,Math.sin(lvT*2-i*.8+o.s*5));X.fillStyle=L.glow;X.globalAlpha=a;X.fillRect(x-8,ry-14,16,4);X.fillRect(x-2,ry-22,4,18);X.globalAlpha=1;glow(x,ry-12,26,L.glow,a*.5)}}break}}
function drawProps(){const B=bg;for(const o of B.props)prop(o,B.L)}

function drawFG(){const B=bg,L=B.L,col=shade(L.gnd,-.62),rim=rgba(L.glow,.28),k=FGK[L.theme],tk=TOPK[L.theme];
  /* bottom debris, parallax 1.3 */
  X.fillStyle=col;
  for(const o of B.fg){const x=o.x-cam*1.3,w=o.w*1.2,h=o.h*1.5;if(x>W+60||x+w<-60)continue;X.beginPath();
    if(k==='rubble'){X.moveTo(x,H);X.lineTo(x+w*.1,H-h*.6);X.lineTo(x+w*.3,H-h);X.lineTo(x+w*.55,H-h*.7);X.lineTo(x+w*.8,H-h*.85);X.lineTo(x+w,H);X.fill();
      X.fillStyle='rgba(90,140,70,.35)';X.fillRect(x+w*.25,H-h,w*.12,6);X.fillStyle=col}
    else if(k==='shards'){for(let i=0;i<4;i++){const sx=x+i*w*.25,sh=h*(.6+((o.s*13+i)%1)*.8);X.moveTo(sx,H);X.lineTo(sx+w*.08,H-sh);X.lineTo(sx+w*.16,H)}X.fill();X.strokeStyle=rim;X.lineWidth=2;X.stroke()}
    else if(k==='rail'){X.fillRect(x,H-h,w,10);for(let i=0;i<=4;i++)X.fillRect(x+i*w/4-5,H-h,10,h);glow(x+w/2,H-h,18,L.glow,.4)}
    else if(k==='pipes'){X.fillRect(x,H-h*.6,w,30);X.fillRect(x+w*.7,H-h-60,30,h+60);glow(x+w*.7+15,H-h-60,22,L.glow,.5+Math.sin(lvT*5+o.s*9)*.3)}
    else if(k==='spikes'){for(let i=0;i<6;i++){const sx=x+i*w/6;X.moveTo(sx,H);X.lineTo(sx+w/12,H-h*(.5+((o.s*7+i)%1)));X.lineTo(sx+w/6,H)}X.fill()}
    else{X.moveTo(x,H);X.lineTo(x+w*.2,H-h*.5);X.lineTo(x+w*.5,H-h*.8);X.lineTo(x+w*.8,H-h*.45);X.lineTo(x+w,H);X.fill()}}
  /* hanging silhouettes along the top, parallax 1.35 */
  for(const o of B.fgTop){const x=o.x-cam*1.35,w=o.w,h=o.h,sw=Math.sin(lvT*.9+o.s*6)*10;if(x>W+80||x+w<-80)continue;X.fillStyle=col;X.strokeStyle=col;
    if(tk==='vines'){X.lineWidth=7;for(let i=0;i<3;i++){const vx=x+i*w/3,vh=h*(.6+((o.s*11+i)%1)*.6);X.beginPath();X.moveTo(vx,0);X.quadraticCurveTo(vx+sw,vh*.5,vx+sw*1.6,vh);X.stroke();
        for(let j=1;j<5;j++){X.beginPath();X.ellipse(vx+sw*j/3,vh*j/5,9,5,.6,0,7);X.fill()}}X.fillRect(x-20,0,w+40,22)}
    else if(tk==='icicles'){X.beginPath();X.moveTo(x,0);for(let i=0;i<5;i++){const ix=x+i*w/5;X.lineTo(ix+w/10,h*(.4+((o.s*9+i)%1)*.6));X.lineTo(ix+w/5,0)}X.fill();X.strokeStyle=rim;X.lineWidth=2;X.stroke()}
    else if(tk==='cables'){X.lineWidth=5;X.beginPath();X.moveTo(x-40,0);X.quadraticCurveTo(x+w/2,h+sw,x+w+40,0);X.stroke();for(let i=1;i<4;i++){const t=i/4,cx=(1-t)*(1-t)*(x-40)+2*t*(1-t)*(x+w/2)+t*t*(x+w+40),cy=2*t*(1-t)*(h+sw);glow(cx,cy+8,16,L.glow,.7);X.fillRect(cx-4,cy,8,10)}}
    else if(tk==='drapes'){X.beginPath();X.moveTo(x,0);X.lineTo(x+w,0);X.quadraticCurveTo(x+w*.8+sw,h*.5,x+w*.85+sw,h);X.quadraticCurveTo(x+w/2,h*.7,x+w*.15+sw,h);X.quadraticCurveTo(x+w*.2+sw,h*.5,x,0);X.fill();
      X.strokeStyle=rgba(L.glow,.45);X.lineWidth=3;X.beginPath();X.moveTo(x+w*.15+sw,h);X.quadraticCurveTo(x+w/2,h*.7,x+w*.85+sw,h);X.stroke()}
    else{X.lineWidth=9;X.setLineDash([20,9]);for(let i=0;i<2;i++){const cx=x+i*w*.6,ch=h*(1+i*.3);X.beginPath();X.moveTo(cx,0);X.lineTo(cx+sw,ch);X.stroke()}X.setLineDash([]);
      X.lineWidth=7;X.beginPath();X.arc(x+sw,h+14,14,.3,Math.PI*1.4);X.stroke()}}
  /* big pillars that sweep past in front, parallax 1.55; they turn see-through when they cross the hero */
  const xs=[];if(pl)xs.push(pl.x-cam);for(const e of en)xs.push(e.x-cam);if(boss&&!boss.dead)xs.push(boss.x-cam);
  for(const o of B.fgBig){const x=o.x-cam*1.55,w=o.w;if(x>W+40||x+w<-40)continue;const near=xs.some(sx=>Math.abs(x+w/2-sx)<w/2+110);
    o.a=(o.a==null?.8:o.a)+((near?.22:.8)-(o.a==null?.8:o.a))*.2;X.globalAlpha=o.a;
    X.fillStyle=col;X.fillRect(x,0,w,H);X.fillRect(x-18,0,w+36,60);X.fillRect(x-18,H-90,w+36,90);X.fillStyle=rim;X.fillRect(x+w-6,60,6,H-150);
    X.fillStyle=rgba(L.glow,.5);for(let i=0;i<3;i++)X.fillRect(x+w*.4,180+i*220,w*.2,10);X.globalAlpha=1}}
</script>
