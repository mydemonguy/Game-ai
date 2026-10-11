<script>
"use strict";
/* ---------- robot cast, part 2: cut-out rigs (walk, windup, attack) and the new Malakar ---------- */
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

function warnMark(e,y){X.textAlign='center';X.font=`900 56px ${FD}`;X.lineWidth=6;X.strokeStyle=INK;X.strokeText('!',e.x,y);X.fillStyle='#ff3d3d';X.fillText('!',e.x,y)}
function drawClaw(e){const sc=.74;shadow(e.x,50);X.save();X.translate(e.x,e.y);X.scale(e.face*sc,sc);
  const mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/150):0,sw=Math.sin(lvT*9+e.seed)*.55*mv,hip=-118+(e.state==='wind'?10:0),lean=.18+(e.state==='wind'?-.12:e.state==='swing'?.32:0);
  let ua=.25+sw*.4,fa=-.6;if(e.state==='wind'){ua=2.5;fa=.4}else if(e.state==='swing'){ua=-.95;fa=-.25}
  const leg=(a1,a2,d)=>{X.save();X.translate(d?-10:10,hip);X.rotate(a1);rp('cb_thigh',0,0,0,d);X.translate(0,48);X.rotate(a2);rp('cb_shin',0,0,0,d);X.translate(0,52);X.rotate(-(a1+a2));rp('cb_foot',0,0,0,d);X.restore()};
  const arm=(d,u,f)=>{X.save();X.translate(0,hip);X.rotate(lean);X.translate(d?-18:12,-84);X.rotate(u-lean);rp('cb_uarm',0,0,0,d);X.translate(0,44);X.rotate(f);rp('cb_farm',0,0,0,d);X.restore()};
  arm(1,.15-sw*.4,-.5);leg(-sw,.25+Math.max(0,sw)*1.1,1);
  X.save();X.translate(0,hip);X.rotate(lean);rp('cb_torso',0,0,0,0);rp('cb_head',10,-100,Math.sin(lvT*3+e.seed)*.06,0);X.restore();
  leg(sw,.25+Math.max(0,-sw)*1.1,0);arm(0,ua,fa);X.restore();
  glow(e.x+e.face*48,e.y-196,22,'#ff3d6e',.85);if(e.state==='wind'){glow(e.x+e.face*20,e.y-250,60,'#ff3d6e',.5+.3*Math.sin(lvT*30));warnMark(e,e.y-270)}
  hitFlash(e,e.x,e.y-110,100);bar(e,e.y-262)}
function drawGorilla(e){const sc=.72;shadow(e.x,84);X.save();X.translate(e.x,e.y);X.scale(e.face*sc,sc);
  const mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/120):0,sw=Math.sin(lvT*6+e.seed)*.45*mv,hip=-134+(e.state==='wind'?12:e.state==='swing'?18:0),lean=e.state==='wind'?.05:.32;
  let ua=.12+sw*.5,fa=.2;if(e.state==='wind'){ua=2.9;fa=.3}else if(e.state==='swing'){ua=-.55;fa=-.45}
  const leg=(a1,a2,d)=>{X.save();X.translate(d?-26:26,hip);X.rotate(a1);rp('go_thigh',0,0,0,d);X.translate(0,52);X.rotate(a2);rp('go_shin',0,0,0,d);X.translate(0,58);X.rotate(-(a1+a2));rp('go_foot',0,0,0,d);X.restore()};
  const arm=(d,u,f)=>{X.save();X.translate(0,hip);X.rotate(lean);X.translate(d?-34:54,-124);X.rotate(u-lean);rp('go_uarm',0,0,0,d);X.translate(0,78);X.rotate(f);rp('go_farm',0,0,0,d);X.restore()};
  arm(1,e.state==='walk'?.12-sw*.5:ua,fa);leg(-sw,.2+Math.max(0,sw)*.8,1);
  X.save();X.translate(0,hip);X.rotate(lean);rp('go_torso',0,0,0,0);rp('go_head',46,-150,0,0);X.restore();
  leg(sw,.2+Math.max(0,-sw)*.8,0);arm(0,ua,fa);X.restore();
  glow(e.x+e.face*70,e.y-262,26,'#ff3a2a',.7);if(e.state==='wind'){glow(e.x,e.y-300,90,'#ff3a2a',.4+.3*Math.sin(lvT*30));warnMark(e,e.y-330)}
  hitFlash(e,e.x,e.y-140,140);bar(e,e.y-320)}
function drawWalker(e){const sc=.88;shadow(e.x,110);X.save();X.translate(e.x,e.y);X.scale(e.face*sc,sc);
  const mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/110):0,ph=lvT*5+e.seed,sw=Math.sin(ph)*.32*mv,dip=e.state==='swing'?24:e.state==='wind'?-10:Math.abs(Math.sin(ph))*6*mv,hip=-227+dip;
  const leg=(o,a,d)=>{X.save();X.translate(o,hip);X.rotate(-.45+a);rp('wk_thigh',0,0,0,d);X.translate(0,104);X.rotate(.95-a*1.4);rp('wk_shin',0,0,0,d);X.translate(0,112);X.rotate(-(.5-a*.4));rp('wk_foot',0,0,0,d);X.restore()};
  const gtilt=e.state==='wind'?-.32:e.state==='swing'?.08:Math.sin(lvT*2+e.seed)*.04;
  rp('wk_gun',-50,hip-96,gtilt,1);leg(-46,-sw,1);
  X.save();X.translate(0,hip);rp('wk_hull',0,0,0,0);X.restore();
  leg(46,sw,0);rp('wk_gun',72,hip-84,gtilt,0);X.restore();
  const tip=(e.x+e.face*(72+150)*sc),ty=e.y+(hip-84+Math.sin(gtilt)*150)*sc;glow(e.x+e.face*170*sc,e.y+(hip-70)*sc,26,'#ff3a2a',.8);
  if(e.state==='wind'){glow(tip,ty,80,'#ff8a2a',.6+.3*Math.sin(lvT*30));warnMark(e,e.y-370)}if(e.state==='swing')glow(tip,ty,120,'#fff0c8',.8);
  hitFlash(e,e.x,e.y-200,170);bar(e,e.y-360)}
function drawHound(e){const sc=.86;shadow(e.x,62);X.save();X.translate(e.x,e.y);X.scale(e.face*sc,sc);
  const lp=e.state==='leap',wd=e.state==='wind',mv=Math.min(1,Math.abs(e.vx)/300),ph=lvT*14+e.seed,by=-86+(wd?16:0)+(lp?-26:0),tilt=lp?-.16:wd?.12:Math.sin(ph*2)*.03;
  const leg=(x,ph2,d)=>{const a=lp?(x>0?-1.0:1.0):wd?(x>0?.5:-.5):Math.sin(ph+ph2)*.6*mv;X.save();X.translate(0,by);X.rotate(tilt);X.translate(x,18);X.rotate(a);rp('hd_leg',0,0,0,d);X.restore()};
  leg(-30,Math.PI,1);leg(50,0,1);
  X.strokeStyle=INK;X.lineWidth=7;X.beginPath();X.moveTo(-70,by-6);X.quadraticCurveTo(-110,by-50+Math.sin(lvT*8)*10,-136,by-40);X.stroke();X.strokeStyle='#5a5050';X.lineWidth=3;X.stroke();
  X.save();X.translate(0,by);X.rotate(tilt);rp('hd_body',0,0,0,0);rp('hd_head',62,-6,wd?.25:lp?-.2:Math.sin(ph)*.05,0);X.restore();
  leg(-46,0,0);leg(36,Math.PI,0);X.restore();
  glow(e.x+e.face*96,e.y-108,20,'#ff3a2a',.85);if(wd)warnMark(e,e.y-150);hitFlash(e,e.x,e.y-70,90);bar(e,e.y-150)}
function drawHollow(e){if(e.type==='B')return drawWalker(e);if(e.type==='b')return drawGorilla(e);if(e.type==='h')return drawHound(e);return drawClaw(e)}
function drawDrone(e){const y=e.y-30+Math.sin(lvT*3+e.seed)*5,sc=.9;X.save();X.translate(e.x,y);X.scale(e.face*sc,sc);
  glow(0,58,30,'#ff8a3a',.55+Math.random()*.3,40);
  for(const[x,o]of[[-24,0],[24,2],[0,4]]){const a=Math.sin(lvT*4+e.seed+o)*.25+(x<0?.25:x>0?-.25:0);rp('dr_leg',x,40,a,x===0)}
  rp('dr_body',0,0,Math.sin(lvT*2+e.seed)*.06,0);X.restore();glow(e.x+e.face*6*sc,y+(56-58)*sc,26,'#ff3a2a',.9);
  if(e.t<.4)glow(e.x,y,60,'#ff3a2a',(.4-e.t)*2.2);hitFlash(e,e.x,y,60);bar(e,y-70)}
function drawCaster(e){const fl=Math.sin(lvT*2.5+e.seed)*10,y=e.y-60+fl,al=e.tp?Math.max(.05,e.tp/.35):1-(e.fade||0)*.8,sc=.86;shadow(e.x,36);
  const aim=Math.max(-.7,Math.min(.5,Math.atan2((pl?pl.y-100:y)-(y-60),Math.abs((pl?pl.x:e.x)-e.x)+1)));
  for(const dx of[-8,10])glow(e.x-e.face*30*sc+dx,y+4,30,'#7fd8ff',.7*al*(.7+Math.random()*.3),46);
  X.save();X.globalAlpha=al;X.translate(e.x,y);X.scale(e.face*sc,sc);
  rp('gn_jet',-36,-74,0,1);for(const[x,o]of[[-12,1],[10,0]])rp('gn_leg',x,-8,Math.sin(lvT*3+o+e.seed)*.15+.12,!o);
  rp('gn_torso',0,0,0,0);rp('gn_head',4,-86,aim*.3,0);rp('gn_rifle',16,-52,aim,0);X.restore();X.globalAlpha=1;
  const tx=e.x+e.face*(16+170*Math.cos(aim))*sc,ty=y+(-52+170*Math.sin(aim))*sc;glow(tx,ty,e.t<.5?60:20,'#ff4a3a',e.t<.5?1:.5);
  if(e.t<.7&&!e.tp){X.save();X.translate(e.x,GY);X.scale(1,.28);X.globalCompositeOperation='lighter';X.strokeStyle='#7fd8ff';X.globalAlpha=Math.min(1,(.7-e.t)*1.4)*.6;X.lineWidth=5;X.beginPath();X.arc(0,0,70,0,7);X.stroke();X.restore();X.globalAlpha=1}
  hitFlash(e,e.x,y-60,80);bar(e,y-e.h-20)}
function drawBoss(b){const y=b.y+b.dy+b.hov,p3=b.phase===3,cr=p3?'#ff1f4f':'#ff3d6e',up=b.state==='barrage'||b.state==='cast',sc=.82;shadow(b.x,120);
  glow(b.x,y-200,290,cr,(p3?.34:.2)+Math.sin(lvT*3)*.05);if(b.state==='dashWind'||b.state==='dash')glow(b.x,y-180,230,'#ff3d6e',.5);
  X.save();X.translate(b.x,y);X.scale(b.face*sc,sc);
  X.save();X.globalCompositeOperation='lighter';X.fillStyle=cr;for(const sd of[-1,1])for(let i=0;i<5;i++){let th=-.15-i*.3+Math.sin(lvT*2+i)*.05;if(sd<0)th=Math.PI-th;const len=200+i*36;
    X.save();X.translate(sd*30,-300);X.rotate(th);X.globalAlpha=.12+i*.05;X.beginPath();X.moveTo(0,-9);X.quadraticCurveTo(len*.55,-36,len,0);X.quadraticCurveTo(len*.55,14,0,12);X.fill();X.restore()}X.restore();X.globalAlpha=1;
  const sway=Math.sin(lvT*2.2)*.05;rp('mk_tails',0,-186,sway,0);rp('mk_arm',-60,-330,up?.3:.18+sway,1);
  rp('mk_leg',-26,-160,.06,1);rp('mk_leg',24,-160,-.04,0);rp('mk_body',0,-150,0,0);rp('mk_paul',-58,-334,-.2,1);
  rp('mk_head',4,-336,Math.sin(lvT*1.4)*.04,0);rp('mk_paul',62,-334,.2,0);
  X.save();X.translate(64,-326);X.rotate(up?-2.6:-.15);rp('mk_arm',0,0,0,0);X.restore();
  for(let i=0;i<7;i++){const a=-2.65+i*.36+Math.sin(lvT*1.5+i)*.05,r=78+Math.sin(lvT*3+i)*5;X.save();X.translate(4+Math.cos(a)*r,-420+Math.sin(a)*r);X.rotate(a+1.57);
    X.fillStyle=i%2?'#e8b85a':cr;X.strokeStyle=INK;X.lineWidth=3;X.beginPath();X.moveTo(-6,10);X.lineTo(0,i===3?-34:-24);X.lineTo(6,10);X.closePath();X.fill();X.stroke();X.restore()}
  X.restore();
  const hx=b.x+b.face*(64+Math.sin(up?-2.6+Math.PI:Math.PI-.15)*-140)*sc,hy=y+(-326+Math.cos(up?-2.6:-.15)*140)*sc;
  const ox=b.x+b.face*(up?64+Math.sin(2.6)*140:64+Math.sin(.15)*140)*sc,oy=y+(-326+(up?Math.cos(2.6):Math.cos(.15))*140)*sc;
  X.fillStyle='#ffe0e8';X.beginPath();X.arc(ox,oy,up?16:10,0,7);X.fill();glow(ox,oy,up?80:44,cr,1);
  glow(b.x+b.face*18*sc,y-386*sc,16,cr,1);glow(b.x-b.face*8*sc,y-386*sc,12,cr,.8);glow(b.x,y-250*sc,60,cr,.5+.2*Math.sin(lvT*4));
  if(b.flash>0)glow(b.x,y-170,220,'#ffffff',b.flash*3)}
</script>
