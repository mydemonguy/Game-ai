<script>
"use strict";
/* ---------- boss art: original armored mecha bosses drawn as chunky cel-shaded pixel sprites ----------
   Each boss is a little puppet of vector parts posed per frame at low resolution, then snapped to a fixed
   palette with a dark outline, so the result reads like hand-made sprite art. Frames are baked once. */
const BA_INK='#140c1c';
const RAMP={
 hz:['#7a2e0e','#d8641a','#ffa040','#ffe2a8'],      /* hazard orange */
 gm:['#1e2232','#3c4458','#687290','#b4bed8'],      /* gunmetal */
 yl:['#8a6210','#dca424','#ffe066','#fff8c8'],      /* safety yellow */
 cy:['#0a5a80','#22b8f0','#a8f0ff','#ffffff'],      /* cyan glow */
 ol:['#1e2a1a','#40562e','#74904a','#c4d890'],      /* olive armor */
 au:['#5e3e0c','#b8801e','#ffcc4a','#fff2b8'],      /* gold */
 rd:['#6a0a14','#e02a3a','#ff8a8a','#ffffff'],      /* red glow */
 cb:['#18244a','#34569a','#7aa4e8','#e0f0ff'],      /* chrome blue */
 pw:['#4e5670','#9aa6c0','#dfe8f8','#ffffff'],      /* pearl white */
 fl:['#701c06','#e04a14','#ff9638','#ffe0a0'],      /* flame orange */
 ir:['#0e0a12','#262030','#463e52','#7e7290'],      /* dark iron */
 lv:['#8a2406','#ff6418','#ffb040','#fff2b8'],      /* molten glow */
 br:['#4a2a10','#906030','#d09858','#f8dcb0'],      /* brass */
 vo:['#24104a','#5a2ea8','#9e70ea','#e6d4ff'],      /* void violet */
 mg:['#600a5a','#e030c0','#ff90ec','#ffffff'],      /* magenta glow */
 ob:['#0e0810','#24142a','#44284c','#76507e'],      /* obsidian */
 cr:['#460612','#981428','#e0384a','#ffa8b0'],
 nv:['#1a1230','#3a2c62','#6a56a4','#b8a2e8'],      /* sovereign navy-violet */
 fe:['#18141e','#383040','#62586e','#a49ab4']};     /* forged iron */     /* crimson */
const BA_PAL=(()=>{const L=[BA_INK];for(const k in RAMP)L.push(...RAMP[k]);return L.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)])})();
const P2=d=>new Path2D(d);
const TR=(M,x,y,r)=>{let n=M.translate(x,y);if(r)n=n.rotate(r*57.29578);return n};
let BAW=192,BAH=176;
/* a shaded part: light rim top-left, dark band bottom-right, ink outline */
function part(g,M,p,m,o){o=o||{};const R=RAMP[m],L=o.l==null?1.5:o.l,K=o.d==null?2.2:o.d;
  g.save();g.setTransform(M);g.clip(p);g.fillStyle=R[o.flat?1:3];g.fill(p);
  if(!o.flat){g.setTransform(new DOMMatrix().translate(.9,.9).multiply(M));g.fillStyle=R[2];g.fill(p);g.setTransform(new DOMMatrix().translate(L+.9,L+.9).multiply(M));g.fillStyle=R[1];g.fill(p);
    g.setTransform(1,0,0,1,0,0);const q=new Path2D();q.rect(-60,-60,BAW+120,BAH+120);q.addPath(p,new DOMMatrix().translate(-K,-K).multiply(M));g.fillStyle=R[0];g.fill(q,'evenodd')}
  g.restore();if(o.ink!==false){g.save();g.setTransform(M);g.lineWidth=(o.lw||1.1)/Math.hypot(M.a,M.b);g.lineJoin='round';g.strokeStyle=BA_INK;g.stroke(p);g.restore()}}
const sp=(g,M,d,m,o)=>part(g,M,P2(d),m,o);
/* panel lines and highlight pixels */
function ln(g,M,d,col,w){g.save();g.setTransform(M);g.lineWidth=(w||1)/Math.hypot(M.a,M.b);g.lineCap='round';g.strokeStyle=col;g.stroke(P2(d));g.restore()}
function px(g,M,x,y,w,h,col){g.save();g.setTransform(M);g.fillStyle=col;g.fillRect(x,y,w,h);g.restore()}
function ell(x,y,rx,ry){return`M${x-rx} ${y} A${rx} ${ry} 0 1 0 ${x+rx} ${y} A${rx} ${ry} 0 1 0 ${x-rx} ${y}Z`}
/* snap to the palette, hard alpha, 1px outline */
function baSnap(c){const g=c.getContext('2d'),w=c.width,h=c.height,im=g.getImageData(0,0,w,h),d=im.data,cache=new Map(),A=new Uint8Array(w*h);
  for(let i=0,j=0;i<d.length;i+=4,j++){if(d[i+3]<120){d[i+3]=0;continue}A[j]=1;const key=(d[i]<<16)|(d[i+1]<<8)|d[i+2];let c2=cache.get(key);
    if(!c2){let best=1e9;for(const p of BA_PAL){const dr=p[0]-d[i],dg=p[1]-d[i+1],db=p[2]-d[i+2],e=dr*dr*.3+dg*dg*.59+db*db*.11;if(e<best){best=e;c2=p}}cache.set(key,c2)}
    d[i]=c2[0];d[i+1]=c2[1];d[i+2]=c2[2];d[i+3]=255}
  const ink=BA_PAL[0];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=y*w+x;if(A[j])continue;if((x>0&&A[j-1])||(x<w-1&&A[j+1])||(y>0&&A[j-w])||(y<h-1&&A[j+w])){const i=j*4;d[i]=ink[0];d[i+1]=ink[1];d[i+2]=ink[2];d[i+3]=255}}
  g.putImageData(im,0,0);return c}

/* ---- shared biped poses (angles in radians; limbs hang straight down at 0, positive swings backward) ---- */
const BIP_FR=['idle0','idle1','walk0','walk1','walk2','walk3','wind','swing','leap'];
function bipPose(f){const P={by:0,lean:.04,hb:.14,kb:.12,hf:-.2,kf:.18,ub:.18,eb:-.45,uf:-.12,ef:-.55,hd:0,fx:0};
  if(f==='idle1'){P.by=1.4;P.ub=.22;P.uf=-.08;P.ef=-.5;P.hd=.04}
  else if(f.startsWith('walk')){const k=+f[4],a=k*Math.PI/2,s=Math.sin(a);P.hb=.42*s;P.hf=-.42*s;P.kb=.18+Math.max(0,s)*.55;P.kf=.18+Math.max(0,-s)*.55;P.ub=-.35*s+.1;P.uf=.35*s-.1;P.by=-Math.abs(Math.cos(a))*1.5+1;P.lean=.1}
  else if(f==='wind'){P.by=3;P.lean=-.18;P.hb=.4;P.kb=.55;P.hf=-.45;P.kf=.55;P.uf=2.3;P.ef=-1.1;P.ub=-.4;P.eb=-.6;P.hd=-.08;P.fx=1}
  else if(f==='swing'){P.by=2;P.lean=.3;P.hb=.62;P.kb=.25;P.hf=-.55;P.kf=.7;P.uf=-1.45;P.ef=-.05;P.ub=.7;P.eb=-.3;P.hd=.12;P.fx=2}
  else if(f==='leap'){P.air=1;P.by=-8;P.lean=.12;P.hb=-.5;P.kb=1.5;P.hf=-.95;P.kf=1.7;P.ub=-2.3;P.eb=-.5;P.uf=-2.6;P.ef=-.3}
  return P}
/* hip height so the lowest foot rests on the ground line */
function hipFor(P,T,S,fh,gy){const dr=(h,k)=>T*Math.cos(h)+S*Math.cos(h+k);return(P.air?gy-fh-Math.max(dr(P.hb,P.kb),dr(P.hf,P.kf))-14:gy-fh-Math.max(dr(P.hb,P.kb),dr(P.hf,P.kf)))+P.by*.3}
function leg(g,M,P,which,T,S,thigh,knee,shin,foot){const h=which?P.hf:P.hb,k=which?P.kf:P.kb,m0=TR(M,0,0,h);thigh(g,m0);const m1=TR(m0,0,T,k);shin(g,m1);
  const m2=TR(m1,0,S,-(h+k));foot(g,m2);if(knee)knee(g,m1)}
function arm(g,M,u,e,U,upper,fore,end){const m0=TR(M,0,0,u);upper(g,m0);const m1=TR(m0,0,U,e);fore(g,m1);if(end)end(g,m1)}

/* ================= the bosses ================= */
const BOSSES={};
/* shared heroic armored body: big chest and pauldrons, gauntlets, greaves and clawed feet. C supplies materials, bulk and the boss-specific pieces */
function knight(g,f,C){const P=bipPose(f);if(C.pose)C.pose(P,f);const s=C.s||1,bw=C.bw||1,ab=C.ab||1,T=22*s,S=24*s,hy=hipFor(P,T,S,10*s,C.gy),R=new DOMMatrix().translate(C.cx,hy),A=C.a,Bm=C.b,Tm=C.t;
  const legs=w=>leg(g,TR(R,(w?9:-9)*bw*s,0),P,w,T,S,
    (g,m)=>{const q=m.scale(s*bw,s);sp(g,q,'M-8 -2 L8 -2 L7 22 L-7 22Z',Bm);ln(g,q,'M-3 4 L-3 18',RAMP[Bm][0])},
    (g,m)=>sp(g,m.scale(s*bw,s),'M-9 -6 L9 -6 L11 3 L0 8 L-11 3Z',Tm),
    (g,m)=>{const q=m.scale(s*bw,s);sp(g,q,'M-8 0 L8 0 L10 7 L6 24 L-6 24 L-9 7Z',A);if(C.shin)C.shin(g,q)},
    (g,m)=>{const q=m.scale(s*bw,s);sp(g,q,'M-10 -2 L6 -2 L17 3 L21 10 L-11 10Z',A);sp(g,q,'M14 5 L24 7 L22 10 L13 10Z',Tm,{l:1,d:1})});
  const B0=TR(R,0,-2*s,P.lean),B=B0.scale(s*bw,s);
  const arm=(front)=>{const x=(front?15:-15)*bw*s,u=front?P.uf:P.ub,e=front?P.ef:P.eb,m0=TR(B0,x,-40*s,u),q0=m0.scale(s*ab,s);sp(g,q0,'M-6 -2 L6 -2 L5 18 L-5 18Z',Bm);
    const m1=TR(m0,0,18*s,e),q1=m1.scale(s*ab,s);sp(g,q1,'M-7 0 L7 0 L9 16 L-9 16Z',A);sp(g,q1,'M-8 0 L8 0 L8 4 L-8 4Z',Tm,{l:1,d:1});
    const hand=front?C.handF:C.handB;if(hand)hand(g,q1,m1,P,f);else sp(g,q1,'M-6 15 L6 15 L7 24 L-7 24Z',Bm);
    const pm=TR(B0,x,-43*s,u*.22).scale(s*ab,s);if(C.paul)C.paul(g,pm,front);else{sp(g,pm,'M-14 9 Q-17 -9 0 -14 Q17 -12 17 4 L13 11 L-12 11Z',A,{l:3,d:3.5});ln(g,pm,'M-13 6 Q1 -3 15 4',RAMP[Tm][2],1.6);px(g,pm,-6,-11,7,2,RAMP[A][3])}};
  legs(0);if(C.back)C.back(g,B,B0,P,f);arm(0);
  sp(g,B,'M-11 2 L11 2 L13 -14 L-13 -14Z',Bm);ln(g,B,'M-9 -4 L9 -4 M-10 -9 L10 -9',RAMP[Bm][0]);sp(g,B,'M-15 6 L15 6 L14 -2 L-14 -2Z',Tm);
  sp(g,B,'M-17 -12 L17 -12 L25 -28 L22 -43 L9 -50 L-10 -50 L-22 -43 L-24 -28Z',A,{l:3,d:3.5});sp(g,B,'M-9 -50 L9 -50 L7 -55 L-8 -55Z',Bm);
  if(C.chest)C.chest(g,B,P,f);
  legs(1);arm(1);
  const Hm=TR(B0,3*s,-50*s,P.hd).scale(s*(C.hs||1),s*(C.hs||1));C.head(g,Hm,P,f)}
/* --- Foreman Krell: hangar welding mech with a hydraulic claw and a rivet drill --- */
BOSSES.krell={w:184,h:176,gy:170,frames:BIP_FR,draw(g,f){knight(g,f,{cx:88,gy:170,s:1,bw:1,ab:1.12,a:'hz',b:'gm',t:'yl',
  shin:(g,q)=>sp(g,q,'M-8 9 L8 9 L7 13 L-7 13Z','yl',{flat:1,ink:false}),
  back:(g,B)=>{for(const [x,hh] of [[-16,28],[-6,22]]){const m=TR(B,x,-44,-.2);sp(g,m,`M-4 0 L4 0 L4 ${-hh} L-4 ${-hh}Z`,'gm');sp(g,m,`M-5 ${-hh} L5 ${-hh} L5 ${-hh-6} L-5 ${-hh-6}Z`,'hz')}},
  chest:(g,B)=>{sp(g,B,'M-17 -13 L17 -13 L19 -19 L-19 -19Z','yl',{flat:1});for(let x=-16;x<18;x+=6)ln(g,B,`M${x} -13 L${x+4} -19`,'#140c1c',1.8);
    ln(g,B,'M-16 -26 L-6 -26 M-16 -30 L-6 -30 M-16 -34 L-6 -34','#7a2e0e',1.4);sp(g,B,ell(9,-32,5,5),'cy',{l:1,d:1});px(g,B,7,-35,2,2,'#ffffff')},
  handF:(g,q,m,P,f)=>{sp(g,q,'M-3 3 L3 3 L3 13 L-3 13Z','yl',{flat:1,ink:false});sp(g,q,'M-11 14 L11 14 L10 22 L-10 22Z','gm');
    for(const [x,a] of [[-7,.55],[0,0],[7,-.55]]){const c=TR(q,x,21,a+(f==='wind'?.45:f==='swing'?-.1:.2));sp(g,c,'M-3.5 0 L3.5 0 L5 11 L0 21 L-2.5 11Z','yl')}},
  handB:(g,q)=>{sp(g,q,'M-8 14 L8 14 L7 20 L-7 20Z','gm');sp(g,q,'M-7 20 L7 20 L0 42Z','yl',{l:1.5});ln(g,q,'M-5 25 L5 28 M-4 31 L4 34 M-2 37 L2 39','#8a6210',1.2)},
  head:(g,H)=>{sp(g,H,'M-6 -16 L-24 -30 L-16 -20 L-9 -11Z','yl');sp(g,H,'M-2 -19 L-12 -34 L4 -20Z','yl');
    sp(g,H,'M-12 2 L12 2 L14 -11 L8 -21 L-9 -21 L-14 -9Z','hz',{l:2.5,d:3});sp(g,H,'M-3 -14 L16 -14 L16 -6 L-3 -6Z','gm');sp(g,H,'M0 -12 L15 -12 L15 -8 L0 -8Z','cy',{flat:1,ink:false});
    px(g,H,9,-12,4,2,'#ffffff');sp(g,H,'M2 -5 L13 -5 L11 2 L2 2Z','gm');ln(g,H,'M5 -3 L5 1 M8 -3 L8 1','#1e2232');px(g,H,-9,-19,6,2,'#ffe2a8')}})}};
/* --- Bulwark: armory juggernaut with a tower shield and a pile-driver fist --- */
BOSSES.bulwark={w:204,h:172,gy:166,frames:BIP_FR,draw(g,f){knight(g,f,{cx:98,gy:166,s:.95,bw:1.32,ab:1.35,hs:.9,a:'ol',b:'gm',t:'au',
  pose:(P,f)=>{P.uf*=.55;P.ef*=.4},
  back:(g,B)=>{sp(g,B,'M-24 -46 L-6 -50 L-4 -20 L-26 -22Z','gm');sp(g,B,'M-22 -48 L-12 -50 L-12 -56 L-22 -54Z','au')},
  chest:(g,B)=>{ln(g,B,'M0 -16 L0 -46','#1e2a1a',1.2);sp(g,B,'M-7 -40 L7 -40 L6 -27 L0 -22 L-6 -27Z','au');sp(g,B,ell(0,-32,2.5,2.5),'rd',{ink:false});
    ln(g,B,'M-20 -24 L-9 -24 M9 -24 L20 -24','#c4d890',1.2)},
  handB:(g,q)=>{sp(g,q,'M-11 14 L11 14 L11 30 L-11 30Z','gm');ln(g,q,'M-11 20 L11 20 M-11 25 L11 25','#1e2232');sp(g,q,'M-6 30 L6 30 L6 38 L-6 38Z','au')},
  handF:(g,q,m,P)=>{const sm=TR(m,13,6,-(P.uf+P.ef)*.85);sp(g,sm,'M-7 -44 Q5 -52 19 -44 L19 26 Q6 40 -7 26Z','ol',{l:3,d:4});
    sp(g,sm,'M-7 -44 Q5 -52 19 -44 L19 -38 Q5 -45 -7 -38Z','au',{flat:1,ink:false});sp(g,sm,'M-1 -20 L13 -20 L13 2 L6 10 L-1 2Z','au');sp(g,sm,ell(6,-8,3,3),'rd',{ink:false});
    ln(g,sm,'M-7 21 Q6 32 19 21','#ffcc4a',1.6);ln(g,sm,'M2 -36 L2 -26 M10 -36 L10 -26','#40562e',1.2);px(g,sm,-4,-36,2,30,'#c4d890')},
  head:(g,H)=>{sp(g,H,'M-3 -16 L3 -28 L7 -15Z','au');sp(g,H,'M-11 2 L11 2 L13 -9 L6 -17 L-7 -17 L-13 -7Z','gm',{l:2,d:2.5});
    sp(g,H,'M-1 -10 L13 -10 L13 -4 L-1 -4Z','rd',{flat:1});px(g,H,6,-9,4,2,'#ffffff');sp(g,H,'M-12 -3 L-4 -3 L-4 3 L-12 3Z','ol')}})}};
/* --- Crucible: foundry colossus, forged iron split by molten seams, twin slag cannons --- */
BOSSES.crucible={w:216,h:204,gy:198,frames:BIP_FR,draw(g,f){knight(g,f,{cx:100,gy:198,s:1.18,bw:1.15,ab:1.3,a:'fe',b:'gm',t:'br',
  pose:(P)=>{P.lean+=.12;P.uf*=.85;P.ub*=.8},
  shin:(g,q)=>ln(g,q,'M1 3 L-2 12 L2 21','#ff6418',1.4),
  back:(g,B)=>{for(const [x,hh] of [[-20,30],[-10,40],[0,26]]){const m=TR(B,x,-50,-.25);sp(g,m,`M-4 0 L4 0 L5 ${-hh} L-5 ${-hh}Z`,'fe');sp(g,m,`M-6 ${-hh} L6 ${-hh} L6 ${-hh-4} L-6 ${-hh-4}Z`,'br');px(g,m,-3,-hh-2,6,2,'#ffb040')}},
  chest:(g,B)=>{sp(g,B,'M-12 -22 L12 -22 L13 -44 L-13 -44Z','lv');for(let x=-9;x<12;x+=4.5)ln(g,B,`M${x} -42 L${x} -24`,'#262030',1.8);
    ln(g,B,'M-22 -18 L-16 -26 L-20 -34 M22 -20 L17 -30','#ff6418',1.3);sp(g,B,'M-13 -22 L13 -22 L13 -19 L-13 -19Z','br',{flat:1})},
  paul:(g,pm)=>{sp(g,pm,'M-14 9 Q-17 -9 0 -14 Q17 -12 17 4 L13 11 L-12 11Z','fe',{l:3,d:3.5});sp(g,pm,'M-7 -12 L-1 -24 L5 -12Z','br');ln(g,pm,'M-10 4 L-4 -2 L2 2','#ff6418',1.2)},
  handF:(g,q)=>{sp(g,q,'M-10 14 L10 14 L10 30 L-10 30Z','fe');sp(g,q,'M-12 26 L12 26 L12 33 L-12 33Z','br');sp(g,q,ell(0,33,7,3.5),'lv',{flat:1});ln(g,q,'M-5 17 L-2 23','#ff6418',1.2)},
  handB:(g,q)=>{sp(g,q,'M-10 14 L10 14 L10 28 L-10 28Z','fe');sp(g,q,'M-11 24 L11 24 L11 30 L-11 30Z','br');sp(g,q,ell(0,30,6,3),'lv',{flat:1})},
  head:(g,H)=>{sp(g,H,'M-6 -12 L-16 -28 L2 -40 L-6 -26 L1 -14Z','br');sp(g,H,'M6 -12 L16 -30 L30 -36 L18 -22 L12 -12Z','br');
    sp(g,H,'M-12 2 L12 2 L15 -10 L8 -17 L-8 -17 L-14 -8Z','fe',{l:2,d:2.5});sp(g,H,'M0 -11 L14 -10 L13 -5 L0 -6Z','lv',{flat:1});px(g,H,6,-10,4,2,'#fff2b8');
    sp(g,H,'M3 -4 L14 -4 L12 2 L3 2Z','gm');ln(g,H,'M6 -3 L6 1 M9 -3 L9 1','#140c1c')}})}};
/* --- Malakar, the Void Sovereign: crowned dragon king with a crimson cape and a void greatsword --- */
BOSSES.malakar={w:256,h:224,gy:216,frames:BIP_FR,draw(g,f){const fl=f==='idle1'?1:f.startsWith('walk')?+f[4]:f==='swing'?3:0,cast=f==='leap';
  knight(g,f,{cx:126,gy:216,s:1.25,bw:1.05,ab:1.1,a:'nv',b:'ob',t:'au',
  pose:(P,f)=>{if(f==='leap'){P.air=0;P.by=0;P.hb=.1;P.kb=.1;P.hf=-.15;P.kf=.15;P.uf=-2.8;P.ef=-.2;P.ub=-2.5;P.eb=-.4;P.lean=-.05}},
  shin:(g,q)=>ln(g,q,'M0 6 L0 21','#e0384a',1.3),
  back:(g,B,B0)=>{const cw=Math.sin(fl*1.3)*4,cs=f==='swing'?14:f==='wind'?-6:0;
    sp(g,B,`M-20 -52 L14 -54 Q12 0 ${6-cs*.3} 66 Q-6 58 ${-18+cw*.5} 68 Q-30 58 ${-42-cs+cw} 66 Q${-54-cs} 56 ${-66-cs+cw*1.5} 60 Q${-46-cs} 8 -20 -52Z`,'cr',{l:3,d:3.5});
    ln(g,B,`M-14 -40 Q-26 8 ${-44-cs} 58 M-4 -36 Q-10 16 ${-20-cs*.5} 62`,'#460612',1.4);sp(g,B,'M-20 -50 L-30 -66 L-10 -54Z','cr');
sp(g,B,'M-18 -52 L14 -54 L12 -46 L-16 -44Z','au',{flat:1});
    let tm=TR(B0,-8,4,-1);for(let i=0;i<5;i++){const w=6-i;sp(g,tm,`M${-w} 0 L${w} 0 L${w-1} 13 L${1-w} 13Z`,'ob');tm=TR(tm,0,12,.24+Math.sin(fl+i)*.05)}sp(g,tm,'M-4 0 L4 0 L0 13Z','au')},
  chest:(g,B)=>{sp(g,B,'M-7 -44 L7 -44 L5 -29 L0 -24 L-5 -29Z','rd');px(g,B,-2,-40,3,3,'#ffffff');ln(g,B,'M-19 -24 L-9 -38 M19 -24 L9 -38','#b8a2e8',1.1);
    sp(g,B,'M-17 -13 L17 -13 L18 -18 L-18 -18Z','au',{flat:1})},
  paul:(g,pm)=>{sp(g,pm,'M-14 9 Q-17 -9 0 -14 Q17 -12 17 4 L13 11 L-12 11Z','nv',{l:3,d:3.5});sp(g,pm,'M-8 -12 L-2 -26 L4 -12Z','au');sp(g,pm,'M4 -11 L14 -21 L13 -7Z','au');ln(g,pm,'M-13 6 Q1 -3 15 4','#ffcc4a',1.6)},
  handB:(g,q)=>{sp(g,q,'M-7 15 L7 15 L8 24 L-8 24Z','ob');for(const x of[-5,0,5])sp(g,q,`M${x-2} 23 L${x+2} 23 L${x} 30Z`,'au',{ink:false});if(cast)sp(g,q,ell(0,34,8,8),'mg')},
  handF:(g,q,m,P)=>{const ga=f==='swing'?1.45:f==='wind'?2.6:cast?3.1:.9,S2=TR(m,0,22*1.25,-(P.uf+P.ef)+ga).scale(1.25,1.25);sp(g,q,'M-7 15 L7 15 L8 24 L-8 24Z','ob');
    sp(g,S2,'M-3 -9 L3 -9 L3 4 L-3 4Z','au');sp(g,S2,'M-11 3 Q0 0 11 3 L11 8 L-11 8Z','au');sp(g,S2,'M-4 8 L4 8 L5 66 L0 78 L-5 66Z','mg',{l:1.2,d:1.8});ln(g,S2,'M0 12 L0 70','#ffffff',1.2);sp(g,S2,ell(0,5,2.5,2.5),'rd',{ink:false})},
  head:(g,H)=>{sp(g,H,'M-8 -14 L-28 -24 L-15 -9Z','ob');sp(g,H,'M-12 1 L14 1 L23 -5 L15 -10 L12 -19 L-10 -19 L-14 -8Z','nv',{l:2.5,d:3});
    for(const [x,hh] of [[-8,9],[-2,13],[4,9]])sp(g,H,`M${x-3} -18 L${x} ${-18-hh} L${x+3} -18Z`,'au');sp(g,H,'M-12 -19 L12 -19 L11 -16 L-11 -16Z','au',{flat:1,ink:false});
    sp(g,H,'M2 -11 L14 -10 L13 -6 L2 -7Z','rd',{flat:1});px(g,H,8,-10,3,2,'#ffffff');ln(g,H,'M12 -2 L21 -4','#140c1c');px(g,H,-6,-16,6,2,'#b8a2e8')}})}};
/* --- Alpha Hound: chrome mecha-wolf with thruster fins and a bladed tail --- */
const HND_FR=['idle0','idle1','walk0','walk1','walk2','walk3','wind','swing','leap'];
BOSSES.hound={w:200,h:120,gy:114,frames:HND_FR,draw(g,f){let by=0,tilt=0,legA=[0,0,0,0],kne=[.3,.3,-.3,-.3],jaw=0,tail=-.4,hd=0;
  if(f==='idle1'){by=1;tail=-.3}
  if(f.startsWith('walk')){const a=+f[4]*Math.PI/2,s=Math.sin(a),c=Math.cos(a);legA=[.6*s,.6*s+.3,-.6*s,-.6*s-.3];kne=[.3+Math.max(0,s)*.6,.4,-.3-Math.max(0,-s)*.6,-.4];by=-Math.abs(c)*3;tilt=s*.05;tail=-.4+s*.2}
  if(f==='wind'){by=8;tilt=.12;legA=[.4,.5,-.5,-.4];kne=[.9,.9,-.9,-.9];hd=.15;tail=-.9}
  if(f==='swing'){by=-4;tilt=-.12;legA=[-.9,-.7,1.1,.9];kne=[.2,.2,-.1,-.1];jaw=.55;hd=-.15;tail=-.1}
  if(f==='leap'){by=-14;tilt=-.18;legA=[-1.1,-.9,1.3,1.1];kne=[.5,.4,-.6,-.5];jaw=.3;hd=-.1;tail=0}
  const R=new DOMMatrix().translate(100,64+by),B=TR(R,0,0,tilt);
  const lg=(x,i,front)=>{const m0=TR(B,x,6,legA[i]);sp(g,m0,'M-6 -4 L6 -4 L5 20 L-5 20Z',front?'cb':'gm');const m1=TR(m0,0,19,kne[i]);sp(g,m1,'M-4 0 L4 0 L3 20 L-3 20Z',front?'pw':'gm');
    const m2=TR(m1,0,20,-(legA[i]+kne[i]+tilt));sp(g,m2,'M-5 -1 L5 -1 L12 4 L12 7 L-6 7Z','gm')};
  lg(-28,1,0);lg(26,3,0);
  /* tail blades */
  let tm=TR(B,-38,-6,-1.57+tail);for(let i=0;i<4;i++){sp(g,tm,'M-3 0 L3 0 L2 12 L-2 12Z','gm');sp(g,tm,'M2 2 L10 6 L2 9Z','fl');tm=TR(tm,0,11,.18)}
  /* body */
  sp(g,B,'M-42 -14 L18 -18 L36 -10 L34 10 L-36 12 L-44 0Z','cb',{l:2,d:3});
  sp(g,B,'M-30 -16 L-18 -30 L-12 -16Z','fl');sp(g,B,'M-14 -17 L-2 -34 L4 -17Z','fl');sp(g,B,'M2 -18 L12 -30 L16 -16Z','fl');
  sp(g,B,'M-4 -12 L30 -12 L32 6 L-2 8Z','pw');ln(g,B,'M-30 -4 L-8 -4 M-30 2 L-10 2','#18244a');sp(g,B,ell(14,-2,3,3),'cy',{l:1,d:1});
  lg(-24,0,1);lg(30,2,1);
  /* head */
  const Hm=TR(B,36,-8,hd);sp(g,Hm,'M-2 -6 L-10 -22 L4 -12Z','cb');sp(g,Hm,'M0 -6 L-4 -24 L10 -10Z','pw');
  const J=TR(Hm,10,6,jaw);sp(g,J,'M-6 -2 L22 0 L20 5 L-6 6Z','gm');for(let x=2;x<20;x+=5)sp(g,J,`M${x} -1 L${x+2} -5 L${x+4} -1Z`,'pw',{ink:false});
  sp(g,Hm,'M-8 -10 L14 -10 L32 -2 L32 4 L6 8 L-8 6Z','cb',{l:2,d:2.5});sp(g,Hm,'M4 -7 L18 -5 L16 -2 L4 -3Z','rd',{flat:1});px(g,Hm,10,-6,3,1,'#ffffff');
  sp(g,Hm,'M14 -2 L32 -2 L32 3 L14 3Z','pw',{flat:1,ink:false});
}};

/* --- Null Seraph: floating void knight with crystal blade-wings, a halo and a crystal lance (no legs) --- */
BOSSES.seraph={w:220,h:200,gy:194,frames:BIP_FR,draw(g,f){
  const fl=f==='idle1'?1:f.startsWith('walk')?+f[4]:0,flap=Math.sin(fl*Math.PI/2)*.16,wind=f==='wind',sw=f==='swing',bl=f==='leap';
  const R=new DOMMatrix().translate(108,106+(f==='idle1'?2:0)).scale(1.3),B=TR(R,0,0,sw?.2:wind?-.12:0);
  /* halo + wings behind */
  sp(g,TR(B,-3,-60),ell(0,0,17,5),'mg',{flat:1});sp(g,TR(B,-3,-60),ell(0,0,12,2.5),'vo',{flat:1,ink:false});
  const wing=(a,len,wd)=>{const m=TR(B,-6,-34,a+flap*(1+len/80));sp(g,m,`M${-wd} 0 L${wd} 0 L${wd+2} ${-len*.55} L0 ${-len} L${-wd-2} ${-len*.55}Z`,'pw',{l:1.5,d:2});
    sp(g,m,`M-2 -3 L2 -3 L3 ${-len*.55} L0 ${-len*.9} L-3 ${-len*.55}Z`,'cy',{l:1,d:1,ink:false})};
  wing(-2.55,38,4);wing(-2.05,52,5);wing(-1.55,58,5);wing(-1.05,50,5);wing(-.6,36,4);
  /* skirt of layered armor plates tapering to a point */
  sp(g,B,'M-18 0 L18 0 L14 30 L0 58 L-14 30Z','vo',{l:2,d:3});sp(g,B,'M-18 0 L-5 0 L-9 36 L-16 26Z','pw');sp(g,B,'M6 0 L18 0 L14 28 L5 40Z','pw');
  ln(g,B,'M0 4 L0 52','#e6d4ff');sp(g,B,'M-19 -3 L19 -3 L18 4 L-18 4Z','au',{flat:1});sp(g,B,ell(0,1,3,2.5),'cy',{ink:false});
  /* back arm: open palm with an orb */
  const ua2=wind?-.9:sw?.8:.3;
  arm(g,TR(B,-12,-33),ua2,-.6,14,(g,m)=>sp(g,m,'M-5 -2 L5 -2 L4 14 L-4 14Z','vo'),(g,m)=>{sp(g,m,'M-6 0 L6 0 L7 13 L-7 13Z','pw');sp(g,m,'M-6 0 L6 0 L6 3 L-6 3Z','au',{flat:1,ink:false})},
    (g,m)=>sp(g,m,ell(0,19,5,5),'mg'));
  sp(g,TR(B,-12,-35,ua2*.2),'M-11 6 Q-12 -8 0 -10 Q12 -8 11 4 L8 8 L-8 8Z','pw',{l:2,d:2.5});
  /* torso */
  sp(g,B,'M-12 0 L12 0 L14 -12 L-14 -12Z','vo');sp(g,B,'M-15 -10 L15 -10 L21 -26 L13 -38 L-12 -38 L-20 -26Z','pw',{l:2.5,d:3});
  sp(g,B,'M-6 -32 L6 -32 L4 -18 L0 -13 L-4 -18Z','vo');sp(g,B,ell(0,-24,3,3),'cy',{ink:false});ln(g,B,'M-16 -24 L-8 -30 M16 -24 L8 -30','#9e70ea',1.1);
  /* helm with a long swept crest */
  const Hm=TR(B,2,-39,bl?-.2:0);sp(g,Hm,'M-4 -14 L-28 -24 L-20 -16 L-8 -9Z','au');sp(g,Hm,'M-2 -16 L-14 -30 L2 -18Z','au');
  sp(g,Hm,'M-10 1 L10 1 L12 -10 L5 -18 L-6 -18 L-12 -8Z','pw',{l:2,d:2.5});
  sp(g,Hm,'M-1 -12 L11 -12 L11 -6 L-1 -6Z','vo',{flat:1});px(g,Hm,3,-10,6,2,'#9e70ea');px(g,Hm,7,-10,2,2,'#ffffff');
  /* front arm: crystal lance */
  const ua=wind?-2.6:sw?-1.55:-.4,ea=wind?-.4:sw?0:-.9;
  arm(g,TR(B,12,-33),ua,ea,14,(g,m)=>sp(g,m,'M-5 -2 L5 -2 L4 14 L-4 14Z','vo'),(g,m)=>{sp(g,m,'M-6 0 L6 0 L7 13 L-7 13Z','pw');sp(g,m,'M-6 0 L6 0 L6 3 L-6 3Z','au',{flat:1,ink:false})},
    (g,m)=>{const L=TR(m,0,15,-(ua+ea)+(sw?1.57:wind?2.2:.35));sp(g,L,'M-2 -22 L2 -22 L2 14 L-2 14Z','au');sp(g,L,'M-5 14 L5 14 L0 56Z','cy',{l:1,d:1.5});ln(g,L,'M0 17 L0 50','#ffffff');sp(g,L,'M-6 11 L6 11 L6 16 L-6 16Z','vo')});
  sp(g,TR(B,12,-35,ua*.2),'M-11 6 Q-12 -8 0 -10 Q12 -8 11 4 L8 8 L-8 8Z','pw',{l:2,d:2.5});ln(g,TR(B,12,-35,ua*.2),'M-10 4 Q0 -2 10 3','#ffcc4a',1.4);
}};
/* bake every frame of one boss: returns canvases at art resolution (draw them scaled up with nearest filtering) */
function bakeBoss(key){const D0=BOSSES[key];BAW=D0.w;BAH=D0.h;const out={key,fw:D0.w,fh:D0.h,ax:.5,ay:D0.gy/D0.h,names:D0.frames,frames:[]};
  for(const f of D0.frames){const c=document.createElement('canvas');c.width=D0.w;c.height=D0.h;const g=c.getContext('2d');D0.draw(g,f);out.frames.push(baSnap(c))}return out}
</script>
