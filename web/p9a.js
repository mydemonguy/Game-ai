<script>
"use strict";
/* ---------- robot cast, part 1: glossy cartoon parts with thick outlines, baked once into small canvases ---------- */
const INK='#130f17',RB={};
const pE=(cx,cy,rx,ry)=>g=>{g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7)};
const pR=(x,y,w,h,r)=>g=>{r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
const pP=pts=>g=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
function bb(path){/* rough bounds via a probe canvas is overkill; parts pass explicit boxes */}
function gp(g,path,box,base,o){o=o||{};const[x,y,w,h]=box;path(g);g.fillStyle=base;g.fill();g.save();path(g);g.clip();
  const sh=g.createLinearGradient(x,y,x+w*.55,y+h);sh.addColorStop(0,'rgba(255,255,255,.2)');sh.addColorStop(.5,'rgba(0,0,0,0)');sh.addColorStop(1,`rgba(0,0,0,${o.dark||.45})`);g.fillStyle=sh;g.fillRect(x-4,y-4,w+8,h+8);
  if(o.gloss!==0){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x+w*.34,y+h*.24,Math.max(3,w*.2),Math.max(2,h*.1),-.45,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(x+w*.24,y+h*.18,Math.max(1.8,Math.min(w,h)*.05),0,7);g.fill()}
  g.restore();path(g);g.lineWidth=o.lw||5;g.lineJoin='round';g.strokeStyle=INK;g.stroke()}
function line(g,pts,col,w){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()}
function eyeDot(g,x,y,r,col){g.fillStyle=INK;g.beginPath();g.arc(x,y,r+3,0,7);g.fill();const e=g.createRadialGradient(x-r*.3,y-r*.3,1,x,y,r);e.addColorStop(0,'#ffffff');e.addColorStop(.35,shade(col,.5));e.addColorStop(1,col);g.fillStyle=e;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
function bakeRB(key,w,h,px,py,fn){const mk=dark=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.lineJoin='round';g.lineCap='round';fn(g);
    if(dark){g.globalCompositeOperation='source-atop';g.fillStyle='rgba(10,8,20,.38)';g.fillRect(0,0,w,h)}return c};RB[key]={c:mk(0),d:mk(1),px,py}}
function rp(key,x,y,rot,dark,sx){const p=RB[key];X.save();X.translate(x,y);if(rot)X.rotate(rot);if(sx)X.scale(sx,1);X.drawImage(dark?p.d:p.c,-p.px,-p.py);X.restore()}

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
</script>
