<script>
"use strict";
/* ---------- textures: baked canvases registered with Phaser (common set at boot, per-world sets on demand) ---------- */
let TX=null;
const SW=2048;                       /* width of the wrapping parallax strips */
let TKEY=null;const TKEYS={};
function addTex(key,c){if(TX.exists(key))TX.remove(key);TX.addCanvas(key,c);if(TKEY)(TKEYS[TKEY]=TKEYS[TKEY]||[]).push(key);return key}
/* textures of a world are dropped when Tyko leaves it, so GPU memory stays at one world's worth */
function freeTheme(t){for(const k of TKEYS[t]||[])if(TX.exists(k))TX.remove(k);TKEYS[t]=[];delete THEMED[t];for(const k in MACHS)if(k.startsWith('m_'+t+'_'))delete MACHS[k]}
function withX(g,fn){const o=X;X=g;try{fn()}finally{X=o}}

function bakeCommon(){
  {const[c,g]=mkC(128,128),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.6)');r.addColorStop(.45,'rgba(255,255,255,.2)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);addTex('glow',c)}
  {const[c,g]=mkC(64,64),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.45,'rgba(0,0,0,.7)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);addTex('hole',c)}
  {const[c,g]=mkC(64,64),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.6,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);addTex('puff',c)}
  {const[c,g]=mkC(256,256);g.strokeStyle='#fff';g.lineWidth=16;g.beginPath();g.arc(128,128,112,0,7);g.stroke();g.globalAlpha=.35;g.lineWidth=34;g.beginPath();g.arc(128,128,104,0,7);g.stroke();addTex('ring',c)}
  {const[c,g]=mkC(16,16);g.fillStyle='#fff';g.fillRect(1,1,14,14);addTex('dot',c)}
  {const[c,g]=mkC(8,48),r=g.createLinearGradient(0,0,0,48);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=r;g.fillRect(2,0,4,48);addTex('streak',c)}
  {const[c,g]=mkC(12,12);g.fillStyle='#fff';g.beginPath();g.arc(6,6,5,0,7);g.fill();addTex('flake',c)}
  {const[c,g]=mkC(8,8);g.fillStyle='#fff';g.fillRect(0,0,8,8);addTex('px',c)}
  /* lamp cone: a trapezoid of light, 1 unit = 1px; scaled per lamp */
  {const w=420,h=600,[c,g]=mkC(w,h),r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(1,'rgba(255,255,255,.08)');g.fillStyle=r;
    g.beginPath();g.moveTo(w/2-28,0);g.lineTo(w/2+28,0);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();addTex('cone',c)}
  /* narrow sweeping beam for alarms and searchlights */
  {const w=200,h=600,[c,g]=mkC(w,h),r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;
    g.beginPath();g.moveTo(w/2-6,0);g.lineTo(w/2+6,0);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();addTex('beam',c)}
  /* sky light ray */
  {const w=300,h=880,[c,g]=mkC(w,h),r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(.7,'rgba(255,255,255,.25)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;
    g.beginPath();g.moveTo(0,0);g.lineTo(90,0);g.lineTo(300,h);g.lineTo(160,h);g.closePath();g.fill();addTex('ray',c)}
  /* vertical darkness gradient used by the light map */
  {const[c,g]=mkC(4,256),r=g.createLinearGradient(0,0,0,256);r.addColorStop(0,'rgba(255,255,255,.44)');r.addColorStop(.55,'rgba(255,255,255,.8)');r.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=r;g.fillRect(0,0,4,256);addTex('dgrad',c)}
  /* low-health / damage vignette */
  {const[c,g]=mkC(256,144),r=g.createRadialGradient(128,72,40,128,72,150);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=r;g.fillRect(0,0,256,144);addTex('vig',c)}
  /* boss wing feather and crown spike */
  {const[c,g]=mkC(400,52);g.fillStyle='#fff';g.beginPath();g.moveTo(0,17);g.quadraticCurveTo(220,-10,400,26);g.quadraticCurveTo(220,40,0,38);g.closePath();g.fill();addTex('wing',c)}
  {const[c,g]=mkC(20,52);g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(4,48);g.lineTo(10,4);g.lineTo(16,48);g.closePath();g.fill();g.stroke();addTex('spike',c)}
  /* hound cable tail */
  {const[c,g]=mkC(90,70);g.strokeStyle=INK;g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(84,60);g.quadraticCurveTo(44,10,8,22);g.stroke();g.strokeStyle='#5a5050';g.lineWidth=3;g.stroke();addTex('hd_tail',c)}
  /* robot parts: normal + darker (far-side limbs) */
  for(const k in RB){addTex(k,RB[k].c);addTex(k+'_d',RB[k].d)}
  /* pickup icons */
  for(const t in PICK){const[c,g]=mkC(170,170);withX(g,()=>drawPickIcon({type:t,x:85,y:85,float:0,life:99}));addTex('pk_'+t,c)}
  {const[c,g]=mkC(4,256),r=g.createLinearGradient(0,0,0,256);r.addColorStop(0,'rgba(255,255,255,0)');r.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=r;g.fillRect(0,0,4,256);addTex('vgrad',c)}
  {const[c,g]=mkC(64,64);g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(32,32,28,0,2.2);g.stroke();addTex('arc',c)}
  /* roar crescent */
  {const[c,g]=mkC(200,260);g.translate(40,130);g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=44;g.beginPath();g.arc(0,0,100,-1.1,1.1);g.stroke();g.strokeStyle='#fff';g.lineWidth=8;g.beginPath();g.arc(0,0,100,-.9,.9);g.stroke();addTex('crescent',c)}
  /* claw slash arcs: small and heavy */
  for(const[k,r0,lw]of[['slash',96,7],['slash3',120,9]]){const sz=(r0+60)*2,[c,g]=mkC(sz,sz);g.translate(sz/2,sz/2);g.lineCap='round';g.globalAlpha=.25;g.strokeStyle='#fff';g.lineWidth=lw*8;g.beginPath();g.arc(0,0,r0+24,-1.6,1.4);g.stroke();
    g.globalAlpha=.9;for(let i=0;i<3;i++){g.lineWidth=lw;g.beginPath();g.arc(0,0,r0+i*(r0>100?22:17),-1.6,1.4);g.stroke()}addTex(k,c)}
  /* map hatch light */
  {const[c,g]=mkC(36,320);g.fillStyle='#fff';g.beginPath();g.ellipse(18,160,16,150,0,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=4;g.stroke();g.fillStyle='rgba(255,255,255,.5)';g.fillRect(9,20,5,280);addTex('hatch',c)}
}

/* ---- per-world textures ---- */
const THEMED={};
function themeTex(a){const L=LV[a],t=L.theme,P=PAL[t],M={light:P.light,metal:P.alt,dark:P.ink};if(THEMED[t])return THEMED[t];const T={L,P};THEMED[t]=T;TKEY=t;
  addTex('gt_'+t,groundTile(L));
  {const[c,g]=mkC(512,512),D={light:shade(P.light,-.55),metal:shade(P.alt,-.45),dark:P.ink};for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128)plate(g,x+2,y+2,124,124,P,{c:16,m:D,rivets:1,seams:1});addTex('wp_'+t,c)}
  {const[c,g]=mkC(160,46);plate(g,0,0,160,20,P,{c:4,m:M});hazard(g,4,4,152,5);g.strokeStyle=P.ink;g.lineWidth=5;g.beginPath();g.moveTo(6,20);g.lineTo(40,44);g.lineTo(80,20);g.lineTo(120,44);g.lineTo(154,20);g.stroke();g.fillStyle=P.ink;g.fillRect(0,40,160,6);addTex('pl_'+t,c)}
  /* silhouette strips (far and mid) that wrap seamlessly */
  const r=rng(L.len*7+L.name.length*97),ks=KINDS[t];
  for(const[layer,base,col,depth,gap]of[['far',GY-50,L.far,2,.6],['mid',GY-6,L.mid,1,1]]){const[c,g]=mkC(SW,GY+10),list=[];let x=0;
    while(x<SW-60){const w=layer==='far'?110+r()*220:90+r()*170;list.push({x,w,h:layer==='far'?200+r()*380:150+r()*270,k:ks[Math.floor(r()*ks.length)],s:r()});x+=layer==='far'?w*(.55+r()*.7):w+160+r()*380}
    const oW=W;W=SW*3;withX(g,()=>{for(const o of list)for(const ox of[0,SW,-SW])shape(o,ox,base,col,L.glow,depth)});W=oW;addTex(layer+'_'+t,c)}
  {const[c,g]=mkC(4,340),fr=g.createLinearGradient(0,0,0,340);fr.addColorStop(0,rgba(L.sky[2],0));fr.addColorStop(1,rgba(L.sky[2],.55));g.fillStyle=fr;g.fillRect(0,0,4,340);addTex('fog_'+t,c)}
  /* machinery walls behind the play plane */
  T.walls=[0,1,2,3].map(i=>{const b=bakeWall(P,L.len*3+i*71,L.sky[1]);addTex('wl_'+t+i,b.c);return b});
  {const fr=60,[c,g]=mkC(fr*2,fr*2);g.translate(fr,fr);g.fillStyle=shade(P.alt,-.55);for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.beginPath();g.ellipse(fr*.5,0,fr*.5,fr*.17,.3,0,7);g.fill()}g.fillStyle='#000';g.beginPath();g.arc(0,0,fr*.15,0,7);g.fill();addTex('fan_'+t,c)}
  /* supply crate */
  {const[c,g]=mkC(120,104);plate(g,4,4,112,96,P,{c:16,rivets:1,seams:1,m:{light:shade(P.light,-.1),metal:shade(P.alt,.1),dark:P.ink}});hazard(g,14,70,92,12);
    g.fillStyle=P.ink;g.beginPath();g.arc(60,40,20,0,7);g.fill();g.strokeStyle='#5ce1ff';g.lineWidth=4;g.beginPath();g.moveTo(60,24);g.lineTo(60,56);g.moveTo(44,40);g.lineTo(76,40);g.stroke();addTex('crate_'+t,c)}
  /* ceiling lamp housing */
  {const[c,g]=mkC(80,34);g.fillStyle=P.ink;g.fillRect(2,0,76,26);g.fillStyle=shade(P.metal,-.3);g.fillRect(6,3,68,8);addTex('lamp_'+t,c)}
  /* hatch frame, shrine, save station, elevator */
  {const[c,g]=mkC(70,34);plate(g,3,2,64,30,P,{c:6,m:M});addTex('dframe_'+t,c)}
  {const[c,g]=mkC(124,64);plate(g,2,22,120,40,P,{c:8,m:M});plate(g,22,2,80,24,P,{c:6});addTex('shrine_'+t,c)}
  {const[c,g]=mkC(144,250);plate(g,2,224,140,26,P,{c:6,m:M});for(const sx of[16,116])plate(g,sx,30,12,196,P,{c:3,m:M});plate(g,6,14,132,22,P,{c:6});addTex('station_'+t,c)}
  {const[c,g]=mkC(224,34);plate(g,2,2,220,30,P,{c:8,m:{light:'#e8f4ff',metal:'#7fa0c8',dark:P.ink}});addTex('lift_'+t,c)}
  /* gates and cages */
  {const w=80,h=GY,[c,g]=mkC(w,h);plate(g,0,0,w,h,P,{c:12,seams:Math.floor(h/120),rivets:1});g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=4;
    for(let y=120;y<h;y+=210){g.beginPath();g.moveTo(10,y);g.lineTo(w*.45,y+40);g.lineTo(w*.3,y+90);g.lineTo(w-8,y+130);g.stroke()}addTex('g_crack_'+t,c)}
  {const w=150,h=330,[c,g]=mkC(w,h);plate(g,0,0,w,h,P,{c:12,seams:2,rivets:1});hazard(g,0,0,w,16);addTex('g_ledge_'+t,c)}
  {const w=94,[c,g]=mkC(w+48,90);plate(g,0,0,w+48,90,P,{c:10,rivets:1});hazard(g,10,66,w+28,14);addTex('g_lcap_'+t,c)}
  {const w=90,h=GY,[c,g]=mkC(w,h);plate(g,0,0,w,h,P,{c:10,seams:6,rivets:1});g.fillStyle='#ff3d2a';for(let y=120;y<h;y+=160)g.fillRect(w/2-8,y,16,16);addTex('g_blast_'+t,c)}
  {const[c,g]=mkC(124,14);plate(g,2,1,120,12,P,{c:4,m:{light:'#ffd27a',metal:'#c88a1a',dark:'#5a3a0a'}});addTex('g_plate_'+t,c)}
  {const w=96,h=GY,[c,g]=mkC(w+40,h);g.translate(20,0);g.fillStyle='#2a0c2e';g.beginPath();g.moveTo(0,h);for(let y=h;y>0;y-=90)g.lineTo(((y/90)%2?18:-6),y);g.lineTo(w,0);for(let y=0;y<h;y+=90)g.lineTo(w+((y/90)%2?-18:6),y);g.closePath();g.fill();
    g.strokeStyle='#ff5ad8';g.lineWidth=3;g.stroke();addTex('g_crystal_'+t,c)}
  {const[c,g]=mkC(144,174);g.globalAlpha=.9;plate(g,2,2,140,170,P,{c:14,seams:1});g.globalAlpha=1;g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=4;g.beginPath();g.moveTo(22,32);g.lineTo(72,82);g.lineTo(52,122);g.lineTo(122,162);g.stroke();addTex('c_crack_'+t,c)}
  {const[c,g]=mkC(144,174);plate(g,2,42,140,130,P,{c:40,rivets:1});g.fillStyle='#ffb347';g.fillRect(42,32,60,10);addTex('c_slam_'+t,c)}
  {const[c,g]=mkC(144,20);plate(g,2,2,140,16,P,{c:4});addTex('c_lcap_'+t,c)}
  {const[c,g]=mkC(144,204);g.fillStyle='rgba(60,10,70,.85)';g.beginPath();g.moveTo(2,202);g.lineTo(22,32);g.lineTo(72,2);g.lineTo(122,32);g.lineTo(142,202);g.closePath();g.fill();g.strokeStyle='#ff5ad8';g.lineWidth=3;g.stroke();addTex('c_plasma_'+t,c)}
  /* foreground strips: low silhouettes along the bottom and hanging gear along the top */
  const fr=rng(L.len*13+5),col=shade(L.gnd,-.62),rim=rgba(L.glow,.28),fk=FGK[t],tk=TOPK[t];
  {const h=300,[c,g]=mkC(SW,h);let x=0;const list=[];while(x<SW-100){list.push({x,w:(120+fr()*200)*1.2,h:(50+fr()*80)*1.5,s:fr()});x+=500+fr()*700}
    withX(g,()=>{g.fillStyle=col;for(const o of list)for(const ox of[0,SW]){const x=o.x-ox,w=o.w,hh=o.h;
      if(fk==='rail'){g.fillStyle=col;g.fillRect(x,h-hh,w,10);for(let i=0;i<=4;i++)g.fillRect(x+i*w/4-5,h-hh,10,hh);g.fillRect(x,h-hh*.5,w,6);glow(x+w/2,h-hh,18,L.glow,.4)}
      else if(fk==='pipes'){g.fillStyle=col;g.fillRect(x,h-hh*.6,w,30);g.fillRect(x,h-hh*.6+40,w*.7,18);g.fillRect(x+w*.7,h-hh-60,30,hh+60);g.fillStyle=rim;g.fillRect(x+w*.7+24,h-hh-60,4,hh+60);glow(x+w*.7+15,h-hh-60,22,L.glow,.6)}
      else{g.fillStyle=col;g.beginPath();for(let i=0;i<6;i++){const sx=x+i*w/6;g.moveTo(sx,h);g.lineTo(sx+w/12,h-hh*(.5+((o.s*7+i)%1)));g.lineTo(sx+w/6,h)}g.fill()}}});addTex('fgb_'+t,c)}
  {const h=320,[c,g]=mkC(SW,h);let x=0;const list=[];while(x<SW-100){list.push({x,w:200+fr()*300,h:90+fr()*150,s:fr()});x+=420+fr()*620}
    withX(g,()=>{for(const o of list)for(const ox of[0,SW]){const x=o.x-ox,w=o.w,hh=o.h;g.fillStyle=col;g.strokeStyle=col;
      if(tk==='beams'){truss(g,x-60,0,w+120,46,col);const lx=x+w*.5,lh=40+hh*.4;g.lineWidth=4;g.beginPath();g.moveTo(lx,46);g.lineTo(lx,lh);g.stroke();g.fillRect(lx-26,lh,52,16);g.fillStyle=P.acc2;g.fillRect(lx-20,lh+16,40,5);glow(lx,lh+24,70,L.glow,.35)}
      else if(tk==='cables'){g.lineWidth=7;g.beginPath();g.moveTo(x-40,0);g.quadraticCurveTo(x+w/2,hh,x+w+40,0);g.stroke();g.lineWidth=4;g.beginPath();g.moveTo(x,0);g.quadraticCurveTo(x+w*.6,hh*.7,x+w+80,0);g.stroke();
        for(let i=1;i<4;i++){const q=i/4,cx=(1-q)*(1-q)*(x-40)+2*q*(1-q)*(x+w/2)+q*q*(x+w+40),cy=2*q*(1-q)*hh;glow(cx,cy+8,16,L.glow,.7);g.fillStyle=col;g.fillRect(cx-5,cy,10,12)}}
      else{g.lineWidth=9;g.setLineDash([20,9]);for(let i=0;i<2;i++){const cx=x+i*w*.6,ch=hh*(1+i*.3);g.beginPath();g.moveTo(cx,0);g.lineTo(cx,ch);g.stroke()}g.setLineDash([]);
        g.lineWidth=7;g.beginPath();g.arc(x,hh+14,14,.3,Math.PI*1.4);g.stroke();g.fillRect(x+w*.6-22,hh*1.3,44,30);glow(x+w*.6,hh*1.3+15,26,L.glow,.4)}}});addTex('fgt_'+t,c)}
  {const w=96,[c,g]=mkC(w+40,H);withX(g,()=>{g.translate(20,0);g.fillStyle=col;g.fillRect(0,0,14,H);g.fillRect(w-14,0,14,H);g.strokeStyle=col;g.lineWidth=7;g.beginPath();
    for(let y=60;y<H;y+=w*1.2){g.moveTo(7,y);g.lineTo(w-7,y+w*1.2);g.moveTo(w-7,y);g.lineTo(7,y+w*1.2)}g.stroke();g.fillRect(-20,0,w+40,60);g.fillRect(-20,H-90,w+40,90);g.fillStyle=rim;g.fillRect(w-4,60,4,H-150);
    g.fillStyle=L.glow;g.globalAlpha=.8;g.fillRect(-14,40,w+28,5)});addTex('fgcol_'+t,c)}
  {const[c,g]=mkC(34,512);pipeV(g,17,0,512,26,P,{light:shade(P.light,-.5),metal:shade(P.alt,-.4),dark:P.ink});addTex('pipev_'+t,c)}
  {const[c,g]=mkC(48,12);g.fillStyle='#1b1a16';g.fillRect(0,0,48,12);g.fillStyle='#e8b23a';g.beginPath();g.moveTo(0,12);g.lineTo(14,12);g.lineTo(26,0);g.lineTo(12,0);g.fill();addTex('conv_'+t,c)}
  /* small ship for the sky traffic */
  {const[c,g]=mkC(200,60);g.translate(100,40);g.fillStyle=L.far;g.beginPath();g.moveTo(-90,0);g.quadraticCurveTo(-20,22,90,6);g.lineTo(60,-12);g.lineTo(-60,-14);g.closePath();g.fill();g.fillRect(-30,-34,46,22);addTex('ship_'+t,c)}
  TKEY=null;return T}
const TOPK={hangar:'beams',armory:'cables',station:'beams',cargo:'chains',citadel:'cables',core:'chains'};
function truss(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(x,y,w,8);g.fillRect(x,y+h-8,w,8);g.strokeStyle=col;g.lineWidth=6;g.beginPath();
  for(let i=0;i<w;i+=h){g.moveTo(x+i,y+4);g.lineTo(x+Math.min(w,i+h),y+h-4);g.moveTo(x+Math.min(w,i+h),y+4);g.lineTo(x+i,y+h-4)}g.stroke()}
/* sky: gradient, nebulae and planet, sized to the current stage width */
function skyTex(a){const L=LV[a],key='sky_'+L.theme+'_'+W;if(TX.exists(key))return key;TKEY=L.theme;
  const[c,g]=mkC(W+340,GY+60);withX(g,()=>{const sky=g.createLinearGradient(0,0,0,GY+60);sky.addColorStop(0,L.sky[0]);sky.addColorStop(.62,L.sky[1]);sky.addColorStop(1,L.sky[2]);g.fillStyle=sky;g.fillRect(0,0,c.width,c.height);g.translate(60,60);
    const r=rng(L.len*7+3);for(let i=0;i<5;i++)glow(r()*(W+200),60+r()*420,240+r()*260,[L.planet,L.glow,L.sky[2]][i%3],.06+r()*.07);
    for(let i=0;i<180;i++){g.globalAlpha=.2+r()*.5;g.fillStyle='#fff';const s=r()*2.2+.4;g.fillRect(r()*(W+260)-40,r()*GY*.62-40,s,s)}g.globalAlpha=1;
    const px=W*.72,py=250;
    if(L.theme==='core'){g.globalCompositeOperation='lighter';g.strokeStyle=L.glow;for(let k=0;k<3;k++){g.globalAlpha=.28-k*.07;g.lineWidth=46-k*14;g.beginPath();
        g.moveTo(px-240,40);g.lineTo(px-120,170);g.lineTo(px-170,260);g.lineTo(px,330);g.lineTo(px-30,440);g.lineTo(px+130,540);g.stroke()}g.globalCompositeOperation='source-over';g.globalAlpha=1;glow(px-60,300,320,L.glow,.35)}
    else{glow(px,py,330,L.planet,.35);g.save();g.translate(px,py);const pg=g.createRadialGradient(-60,-60,20,0,0,190);pg.addColorStop(0,'#ffffff');pg.addColorStop(.28,L.planet);pg.addColorStop(.85,shade(L.planet,-.55));pg.addColorStop(1,shade(L.sky[1],-.2));
      g.fillStyle=pg;g.beginPath();g.arc(0,0,170,0,7);g.fill();g.globalAlpha=.18;g.fillStyle=shade(L.planet,-.4);for(let i=0;i<4;i++){g.beginPath();g.ellipse(-30+i*22,-60+i*40,120-i*18,10,-.2,0,7);g.fill()}g.globalAlpha=1;
      if(L.theme!=='cargo'){g.strokeStyle=rgba(L.planet,.55);g.lineWidth=7;g.beginPath();g.ellipse(0,0,310,48,-.25,Math.PI*.03,Math.PI*.97,true);g.stroke();g.strokeStyle=rgba(L.planet,.25);g.lineWidth=16;g.beginPath();g.ellipse(0,0,280,40,-.25,Math.PI*.03,Math.PI*.97,true);g.stroke()}g.restore()}});
  addTex(key,c);TKEY=null;return key}
/* machines (props) are baked lazily per world: key + size + emissive spots */
const MACHS={};
function getMach(t,k,v){const key='m_'+t+'_'+k+v;if(MACHS[key])return MACHS[key];const L=LV.find(l=>l.theme===t),b=bakeMachine(k,PAL[t],L.len+k.length*31+v*977);TKEY=t;addTex(key,b.c);TKEY=null;return MACHS[key]={key,w:b.w,h:b.h,em:b.em}}
</script>
