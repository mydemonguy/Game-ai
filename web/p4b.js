<script>
"use strict";
/* ---------- characters ---------- */
function limb(x,y,len,wid,ang,col){X.save();X.translate(x,y);X.rotate(ang);X.fillStyle=col;X.fillRect(-wid/2,0,wid,len);X.restore()}
function leg(hx,hy,a1,a2,c1,c2,l1,l2,w){X.save();X.translate(hx,hy);X.rotate(a1);X.fillStyle=c1;X.fillRect(-w/2,0,w,l1+2);X.translate(0,l1);X.rotate(a2);
  X.fillStyle=c2;X.fillRect(-w/2+1,0,w-2,l2);X.fillRect(-w/2+1,l2-8,w+8,9);X.restore()}
function shadow(x,w,y){if(y==null)y=FY;X.fillStyle='rgba(0,0,0,.4)';X.beginPath();X.ellipse(x,y+4,w,12,0,0,7);X.fill()}
function bar(e,y){if(e.hp>=e.max)return;const w=Math.max(70,e.w+20),x=e.x-w/2,f=Math.max(0,e.hp/e.max);
  X.fillStyle='rgba(5,4,12,.75)';X.fillRect(x-2,y-2,w+4,12);X.fillStyle='#ff3d6e';X.fillRect(x,y,w*f,8);X.fillStyle='rgba(255,255,255,.35)';X.fillRect(x,y,w*f,2)}
function hitFlash(e,cx,cy,r){if(e.flash>0)glow(cx,cy,r,'#ffffff',e.flash*5)}

/* ---------- the hero: sprite-sheet dino (frames packed by sprites/make_atlas.py) ---------- */
const DIMG=new Image();let DGHOST=null;
DIMG.onload=()=>{try{const c=document.createElement('canvas');c.width=DIMG.width;c.height=DIMG.height;const g=c.getContext('2d');g.drawImage(DIMG,0,0);
  g.globalCompositeOperation='source-in';g.fillStyle='#a58cff';g.fillRect(0,0,c.width,c.height);DGHOST=c}catch(e){}C._dirty=1};
DIMG.src=DINO.src;
function dinoFrame(p){const A=DINO.anims;
  if(p.dead)return A.dead[Math.min(7,Math.floor((p.deadT||0)*12))];
  if(p.atk>0){const q=1-p.atk/.22;return p.combo===3?A.jump[q<.3?2:10]:A.jump[q<.25?3:5]}
  if(p.dashT>0)return A.run[2];
  if(!p.ground)return p.vy<-500?A.jump[4]:p.vy<0?A.jump[5]:p.vy<500?A.jump[7]:A.jump[8];
  if(p.landT>0)return A.jump[9+Math.min(2,Math.floor((.15-p.landT)/.05))];
  const v=Math.abs(p.vx);if(v>330)return A.run[Math.floor(p.run*1.1)%8];if(v>40)return A.walk[Math.floor(p.run*1.6)%10];return A.idle[Math.floor(lvT*12)%10]}
function dinoDraw(img,k,x,y,face,sx,sy){const M=DINO,fx=(k%M.cols)*M.fw,fy=Math.floor(k/M.cols)*M.fh;X.save();X.translate(x,y);X.scale(face*sx,sy);
  X.drawImage(img,fx,fy,M.fw,M.fh,-M.ax,-M.ay,M.fw,M.fh);X.restore()}
const CLAW=[[-1.25,1.0],[1.05,-1.2],[-1.6,1.4]];
function drawKnight(p){if(!DIMG.complete||!DIMG.naturalWidth)return;
  for(const g of p.ghosts){X.globalAlpha=g.life/.22*.45;dinoDraw(DGHOST||DIMG,DINO.anims.run[2],g.x,g.y,g.face,1,1)}X.globalAlpha=1;
  const supY=p.sup||GY;shadow(p.x,60*(1-Math.min(.5,(supY-p.y)/600)),supY);
  if(p.en>=50&&!p.dead)glow(p.x+p.face*10,p.y-100,110,'#5ce1ff',.18+.08*Math.sin(lvT*5));
  const lunge=p.atk>0?1+.06*Math.sin((1-p.atk/.22)*Math.PI):1,sx=(1+p.squash*.1)*lunge,sy=1-p.squash*.1;
  if(p.inv>0&&p.dashT<=0&&!p.dead&&Math.floor(p.inv*22)%2)X.globalAlpha=.45;
  dinoDraw(DIMG,dinoFrame(p),p.x,p.y,p.face,sx,sy);X.globalAlpha=1;
  if(p.atk>0){const c=CLAW[(p.combo||1)-1],q=Math.min(1,(1-p.atk/.22)*1.5),a=p.atk/.22,big=p.combo===3,col=big?'#c9a8ff':'#7fe9ff';
    const a0=c[0],a1=c[0]+(c[1]-c[0])*q,lo=Math.min(a0,a1),hi=Math.max(a0,a1);
    X.save();X.translate(p.x+p.face*(big?90:70),p.y-100);X.scale(p.face,1);X.globalCompositeOperation='lighter';
    X.strokeStyle=col;X.globalAlpha=.2*a+.06;X.lineWidth=big?80:56;X.beginPath();X.arc(0,0,big?150:120,lo,hi);X.stroke();
    X.lineCap='round';for(let i=0;i<3;i++){const r=(big?120:96)+i*(big?22:17);X.globalAlpha=.75*a;X.lineWidth=big?9:7;X.strokeStyle=i===1?'#ffffff':col;X.beginPath();X.arc(0,0,r,lo,hi);X.stroke()}
    X.restore();X.globalAlpha=1}}
</script>
