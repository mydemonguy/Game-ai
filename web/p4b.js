<script>
"use strict";
/* ---------- characters ---------- */
function limb(x,y,len,wid,ang,col){X.save();X.translate(x,y);X.rotate(ang);X.fillStyle=col;X.fillRect(-wid/2,0,wid,len);X.restore()}
function leg(hx,hy,a1,a2,c1,c2,l1,l2,w){X.save();X.translate(hx,hy);X.rotate(a1);X.fillStyle=c1;X.fillRect(-w/2,0,w,l1+2);X.translate(0,l1);X.rotate(a2);
  X.fillStyle=c2;X.fillRect(-w/2+1,0,w-2,l2);X.fillRect(-w/2+1,l2-8,w+8,9);X.restore()}
function shadow(x,w){X.fillStyle='rgba(0,0,0,.4)';X.beginPath();X.ellipse(x,GY+4,w,12,0,0,7);X.fill()}
function bar(e,y){if(e.hp>=e.max)return;const w=Math.max(70,e.w+20),x=e.x-w/2,f=Math.max(0,e.hp/e.max);
  X.fillStyle='rgba(5,4,12,.75)';X.fillRect(x-2,y-2,w+4,12);X.fillStyle='#ff3d6e';X.fillRect(x,y,w*f,8);X.fillStyle='rgba(255,255,255,.35)';X.fillRect(x,y,w*f,2)}
function hitFlash(e,cx,cy,r){if(e.flash>0)glow(cx,cy,r,'#ffffff',e.flash*5)}

const SW=[[-3.37,-.67],[-.57,-2.77],[-3.97,-.37]];
function knightPose(p){const mv=p.ground?Math.min(1,Math.abs(p.vx)/450):0;let ang=-.67+Math.sin(lvT*2)*.04;
  if(p.atk>0){const q=1-p.atk/.22,s=SW[(p.combo||1)-1];ang=s[0]+(s[1]-s[0])*Math.min(1,q*1.4)}else if(p.dashT>0)ang=-1.75;else if(!p.ground)ang=-1.3;
  return{mv,sw:Math.sin(p.run)*mv,air:!p.ground,ang,bob:p.ground?(mv?-Math.abs(Math.cos(p.run))*6*mv:Math.sin(lvT*2.2)*1.5):0,sq:p.squash,vx:p.vx,lean:p.dashT>0?.28:mv*.07}}
function drawKnightBody(x,y,face,P,mono){const M=c=>mono||c;X.save();X.translate(x,y);X.scale(face*(1+P.sq*.12),1-P.sq*.12);X.rotate(P.lean);X.translate(0,P.bob);
  const flow=Math.min(1,Math.abs(P.vx)/600),w1=Math.sin(lvT*7)*6,w2=Math.sin(lvT*7+1.3)*8;
  /* cape */
  X.fillStyle=mono||lg(0,-130,-60,-20,['#6a40c0','#2a1656']);X.beginPath();X.moveTo(-4,-132);X.quadraticCurveTo(-34-flow*30,-110+w1,-60-flow*55,-36+w2-flow*30);
  X.lineTo(-46-flow*44,-22+w1-flow*24);X.lineTo(-34-flow*30,-34+w2-flow*14);X.lineTo(-18,-46);X.lineTo(-10,-92);X.closePath();X.fill();
  if(!mono){X.strokeStyle='#d9b45a';X.lineWidth=2.5;X.beginPath();X.moveTo(-60-flow*55,-36+w2-flow*30);X.lineTo(-46-flow*44,-22+w1-flow*24);X.lineTo(-34-flow*30,-34+w2-flow*14);X.stroke()}
  /* back arm + legs */
  limb(-10,-124,32,14,.25+P.sw*.5,M('#4d5578'));
  leg(-8,-74,P.air?-.55:-P.sw,P.air?.95:.22+Math.max(0,P.sw)*1.1,M('#4b5374'),M('#2a2f45'),38,34,20);
  leg(10,-74,P.air?.35:P.sw,P.air?.55:.22+Math.max(0,-P.sw)*1.1,M('#8a94ba'),M('#424a6e'),38,34,20);
  /* torso */
  X.fillStyle=mono||lg(-26,-134,26,-72,['#eef2ff','#a3aed4','#5d6890']);X.beginPath();X.moveTo(-24,-74);X.lineTo(-29,-124);X.quadraticCurveTo(-4,-140,27,-130);X.lineTo(23,-74);X.closePath();X.fill();
  if(!mono){X.strokeStyle='rgba(30,34,60,.5)';X.lineWidth=2;X.beginPath();X.moveTo(4,-132);X.lineTo(2,-80);X.moveTo(-24,-97);X.quadraticCurveTo(0,-91,23,-99);X.moveTo(-24,-87);X.quadraticCurveTo(0,-81,23,-88);X.stroke();
    X.strokeStyle='rgba(255,255,255,.55)';X.beginPath();X.moveTo(-26,-122);X.quadraticCurveTo(-4,-137,24,-128);X.stroke();
    glow(4,-110,26,'#5ce1ff',.55+.2*Math.sin(lvT*4));X.fillStyle='#d8fbff';X.beginPath();X.moveTo(4,-119);X.lineTo(10,-110);X.lineTo(4,-101);X.lineTo(-2,-110);X.fill();
    X.fillStyle='#3a2a1e';X.fillRect(-25,-81,48,9);X.fillStyle='#e8c46a';X.fillRect(-2,-82,10,11);X.fillStyle='#7a5a2a';X.fillRect(1,-79,4,5);
    X.fillStyle=lg(0,-72,0,-34,['#55309a','#2e1860']);X.beginPath();X.moveTo(-12,-72);X.lineTo(16,-72);X.lineTo(13+P.sw*6,-36);X.lineTo(-9+P.sw*6,-38);X.closePath();X.fill();
    X.strokeStyle='#d9b45a';X.lineWidth=2;X.stroke();X.fillStyle='#d9b45a';X.beginPath();X.moveTo(2+P.sw*3,-64);X.lineTo(6+P.sw*3,-56);X.lineTo(2+P.sw*3,-48);X.lineTo(-2+P.sw*3,-56);X.fill()}
  /* helmet + plume */
  X.fillStyle=mono||'#b48cff';X.beginPath();X.moveTo(0,-172);X.quadraticCurveTo(-26,-198+Math.sin(lvT*5)*3,-50-flow*14,-172+Math.sin(lvT*6)*4);X.quadraticCurveTo(-24,-175,-6,-160);X.fill();
  X.fillStyle=mono||lg(-20,-174,24,-130,['#f6f8ff','#adb8dc','#5f6a92']);X.beginPath();X.arc(4,-152,22,0,7);X.fill();X.fillRect(-18,-152,44,18);
  if(!mono){X.fillStyle='#1a1f34';X.fillRect(6,-160,22,8);X.fillStyle='#d8fbff';X.fillRect(9,-158,17,3);glow(19,-156,24,'#5ce1ff',.95);
    X.strokeStyle='rgba(30,34,60,.5)';X.lineWidth=2;X.beginPath();X.moveTo(4,-174);X.lineTo(4,-136);X.moveTo(-18,-140);X.lineTo(26,-140);X.stroke();
    X.fillStyle='#d9b45a';X.beginPath();X.moveTo(-2,-176);X.lineTo(4,-186);X.lineTo(10,-176);X.fill()}
  /* pauldron */
  X.fillStyle=mono||lg(0,-142,0,-110,['#f6f8ff','#8f9bc2']);X.beginPath();X.ellipse(4,-126,23,15,-.15,0,7);X.fill();
  if(!mono){X.fillStyle=lg(0,-132,0,-112,['#dfe5ff','#7a86ae']);X.beginPath();X.ellipse(6,-118,18,10,-.15,0,7);X.fill();X.fillStyle='#d9b45a';X.fillRect(-14,-121,38,3)}
  /* sword arm + starblade */
  X.save();X.translate(8,-122);X.rotate(P.ang);X.fillStyle=M('#929ec6');X.fillRect(-8,0,16,28);X.fillStyle=M('#6a759c');X.fillRect(-9,26,18,26);X.fillStyle=M('#d9b45a');X.fillRect(-9,26,18,3);
  X.translate(0,52);X.fillStyle=M('#3a2a1a');X.fillRect(-5,-16,10,18);X.fillStyle=M('#e8c46a');X.fillRect(-22,-4,44,8);X.fillStyle=M('#e8c46a');X.beginPath();X.arc(0,-18,5,0,7);X.fill();
  if(!mono)glow(0,0,14,'#5ce1ff',.9);
  X.fillStyle=mono||lg(-7,0,7,0,['#7fe9ff','#ffffff','#7fe9ff']);X.beginPath();X.moveTo(-7,4);X.lineTo(7,4);X.lineTo(5,140);X.lineTo(0,162);X.lineTo(-5,140);X.closePath();X.fill();
  if(!mono){X.fillStyle='#5ce1ff';X.fillRect(-1.5,10,3,124);for(const t of[30,80,130])glow(0,t,30,'#5ce1ff',.4);
    for(let i=0;i<3;i++){X.fillStyle='#ffffff';X.globalAlpha=.6+.4*Math.sin(lvT*6+i);X.fillRect(-1,24+i*36,2,6);X.globalAlpha=1}}
  X.restore();X.restore()}
function drawKnight(p){const P=knightPose(p);
  for(const g of p.ghosts){X.globalAlpha=g.life/.22*.38;drawKnightBody(g.x,g.y,g.face,P,'#9d7cff')}X.globalAlpha=1;
  shadow(p.x,46*(1-Math.min(.5,(GY-p.y)/600)));
  if(p.inv>0&&p.dashT<=0&&Math.floor(p.inv*22)%2)X.globalAlpha=.45;
  drawKnightBody(p.x,p.y,p.face,P,null);X.globalAlpha=1;
  if(p.atk>0){const s=SW[(p.combo||1)-1],a=p.atk/.22,a0=Math.min(s[0],P.ang)+1.5708,a1=Math.max(s[0],P.ang)+1.5708,col=p.combo===3?'#c9a8ff':'#7fe9ff';
    X.save();X.translate(p.x,p.y+P.bob);X.scale(p.face,1);X.globalCompositeOperation='lighter';
    X.strokeStyle=col;X.globalAlpha=.22*a+.08;X.lineWidth=p.combo===3?70:52;X.beginPath();X.arc(8,-122,162,a0,a1);X.stroke();
    X.globalAlpha=.5*a+.15;X.lineWidth=p.combo===3?22:16;X.beginPath();X.arc(8,-122,180,a0,a1);X.stroke();
    X.strokeStyle='#ffffff';X.globalAlpha=.8*a;X.lineWidth=4;X.beginPath();X.arc(8,-122,190,Math.max(a0,a1-.9),a1);X.stroke();X.restore();X.globalAlpha=1}}

function drawHollow(e){const big=e.type==='b',s=big?1.38:1;shadow(e.x,big?74:46);
  const walk=e.state==='walk'?Math.sin(lvT*9+e.seed)*.55*Math.min(1,Math.abs(e.vx)/150):0,crouch=e.state==='wind'?7:0;
  const iron=big?'#3d2f54':'#30263f',dark=big?'#241a33':'#1d1528',rim='#7a6a9c';
  X.save();X.translate(e.x,e.y);X.scale(e.face*s,s);
  leg(-12,-64,walk,.3+Math.max(0,walk),dark,dark,30,30,22);leg(12,-64,-walk,.3+Math.max(0,-walk),iron,dark,30,30,22);
  X.fillStyle='#2a1a2a';X.beginPath();X.moveTo(-20,-66);X.lineTo(22,-66);X.lineTo(16+walk*6,-30);X.lineTo(4,-40);X.lineTo(-10+walk*6,-28);X.closePath();X.fill();
  X.translate(0,crouch);
  X.fillStyle=lg(-40,-140,30,-60,[shade(iron,.28),iron,dark]);X.beginPath();X.moveTo(-34,-62);X.lineTo(-44,-122);X.quadraticCurveTo(-10,-146,32,-134);X.lineTo(30,-62);X.closePath();X.fill();
  X.strokeStyle=rim;X.lineWidth=2;X.beginPath();X.moveTo(-44,-122);X.quadraticCurveTo(-10,-146,32,-134);X.stroke();
  X.strokeStyle='rgba(0,0,0,.45)';X.beginPath();X.moveTo(-36,-100);X.lineTo(30,-104);X.moveTo(-34,-82);X.lineTo(30,-84);X.stroke();
  X.save();X.globalCompositeOperation='lighter';X.strokeStyle='#ff3d8e';X.globalAlpha=.7+.2*Math.sin(lvT*5+e.seed);X.lineWidth=2.5;X.beginPath();
  X.moveTo(-6,-120);X.lineTo(-14,-104);X.lineTo(-4,-94);X.lineTo(-12,-76);X.moveTo(10,-114);X.lineTo(18,-100);X.lineTo(12,-90);X.stroke();X.restore();X.globalAlpha=1;
  glow(0,-100,32,'#ff3d6e',.6+.25*Math.sin(lvT*5+e.seed));X.fillStyle='#ffd0de';X.beginPath();X.arc(0,-100,6,0,7);X.fill();
  X.fillStyle=shade(iron,.18);X.beginPath();X.moveTo(-30,-128);X.lineTo(-50,-162);X.lineTo(-14,-136);X.fill();X.beginPath();X.moveTo(14,-134);X.lineTo(26,-168);X.lineTo(34,-130);X.fill();
  X.fillStyle=dark;X.beginPath();X.arc(8,-148,22,0,7);X.fill();X.fillStyle=shade(iron,.12);X.beginPath();X.moveTo(-10,-160);X.lineTo(30,-163);X.lineTo(30,-146);X.lineTo(-8,-150);X.fill();
  X.fillStyle='#4f3f68';X.beginPath();X.moveTo(-4,-164);X.quadraticCurveTo(-30,-176,-30,-204);X.quadraticCurveTo(-18,-180,4,-170);X.fill();
  X.beginPath();X.moveTo(16,-166);X.quadraticCurveTo(30,-186,24,-206);X.quadraticCurveTo(38,-184,26,-162);X.fill();
  X.fillStyle='#ffe0ea';X.fillRect(16,-155,14,4);glow(23,-153,20,'#ff3d6e',.95);
  let a=-.6;if(e.state==='wind')a=-3.4;else if(e.state==='swing')a=-.9;
  X.save();X.translate(14,-124);X.rotate(a);X.fillStyle=iron;X.fillRect(-9,0,18,30);X.fillStyle=dark;X.fillRect(-10,28,20,22);X.translate(0,50);
  if(big){X.fillStyle='#4e3e66';X.fillRect(-6,-6,12,96);X.fillStyle=lg(-40,80,40,130,['#463860','#1a1424']);X.fillRect(-40,78,80,52);X.strokeStyle=rim;X.lineWidth=3;X.strokeRect(-40,78,80,52);
    X.save();X.globalCompositeOperation='lighter';X.fillStyle=e.state==='wind'?'#ff7a9e':'#ff3d6e';X.globalAlpha=.85;X.fillRect(-30,100,60,6);X.fillRect(-3,86,6,36);X.restore();X.globalAlpha=1}
  else{X.fillStyle=lg(-6,0,10,0,['#9a8ab8','#5a4a78']);X.beginPath();X.moveTo(-5,0);X.lineTo(6,0);X.lineTo(14,40);X.lineTo(6,58);X.lineTo(12,96);X.lineTo(0,118);X.lineTo(-4,60);X.closePath();X.fill();
    X.save();X.globalCompositeOperation='lighter';X.strokeStyle='#ff4fd8';X.globalAlpha=.65;X.lineWidth=2;X.beginPath();X.moveTo(1,8);X.lineTo(4,100);X.stroke();X.restore();X.globalAlpha=1}
  if(e.state==='wind')glow(0,big?100:60,big?95:62,'#ff3d6e',.5+.3*Math.sin(lvT*30));
  X.restore();X.restore();
  if(e.state==='wind'){X.textAlign='center';X.font=`900 ${big?64:52}px ${FD}`;X.fillStyle='#ff3d6e';X.fillText('!',e.x,e.y-(big?300:225))}
  hitFlash(e,e.x,e.y-80*s,90*s);bar(e,e.y-(big?290:220))}
function drawDrone(e){const y=e.y-35,rt=lvT*2+e.seed,fl=.6+Math.random()*.4;X.save();X.translate(e.x,y);
  glow(0,46,30,'#ff4fd8',.7*fl,48);X.fillStyle='#ffd8f6';X.beginPath();X.moveTo(-9,26);X.lineTo(0,46+fl*18);X.lineTo(9,26);X.fill();
  X.fillStyle='#3a3060';X.beginPath();X.moveTo(-28,-10);X.lineTo(-58,-34);X.lineTo(-34,8);X.fill();X.beginPath();X.moveTo(28,-10);X.lineTo(58,-34);X.lineTo(34,8);X.fill();
  const tilt=Math.sin(rt*.5)*.15;X.strokeStyle='#4a3c78';X.lineWidth=6;X.beginPath();X.ellipse(0,0,58,15,tilt,Math.PI,Math.PI*2);X.stroke();
  const sg=X.createRadialGradient(-12,-14,3,0,0,36);sg.addColorStop(0,'#a59ad6');sg.addColorStop(.45,'#3a3260');sg.addColorStop(1,'#120e20');X.fillStyle=sg;X.beginPath();X.arc(0,0,34,0,7);X.fill();
  X.strokeStyle='rgba(0,0,0,.45)';X.lineWidth=3;X.beginPath();X.ellipse(0,6,34,9,0,0,Math.PI);X.stroke();
  X.fillStyle='#0c0816';X.beginPath();X.arc(e.face*12,-2,13,0,7);X.fill();X.fillStyle='#ffb0ee';X.beginPath();X.arc(e.face*13,-2,7,0,7);X.fill();glow(e.face*13,-2,28,'#ff4fd8',.95);
  X.strokeStyle='#7a6ab0';X.lineWidth=6;X.beginPath();X.ellipse(0,0,58,15,tilt,0,Math.PI);X.stroke();
  for(let i=0;i<4;i++){const a=rt*1.5+i*1.571;if(Math.sin(a)>0)glow(Math.cos(a)*58,Math.sin(a)*15,10,'#ff9ae8',.9)}
  X.restore();if(e.t<.4)glow(e.x,y,56,'#ff4fd8',(.4-e.t)*2.2);hitFlash(e,e.x,y,60);bar(e,y-66)}
function drawCaster(e){const fl=Math.sin(lvT*2.5+e.seed)*10,y=e.y-30+fl,al=e.tp?Math.max(.05,e.tp/.35):1-(e.fade||0)*.8;shadow(e.x,36);
  if(e.t<.7&&!e.tp){X.save();X.translate(e.x,GY);X.scale(1,.28);X.globalCompositeOperation='lighter';X.strokeStyle='#b48cff';X.globalAlpha=Math.min(1,(.7-e.t)*1.4);X.lineWidth=5;
    X.beginPath();X.arc(0,0,92,0,7);X.stroke();X.setLineDash([16,12]);X.lineDashOffset=-lvT*80;X.beginPath();X.arc(0,0,72,0,7);X.stroke();X.setLineDash([]);X.restore();X.globalAlpha=1}
  X.save();X.translate(e.x,y);X.scale(e.face,1);X.globalAlpha=al;
  X.fillStyle=lg(0,-130,0,0,['#4e3488','#2a1a48','#140c24']);X.beginPath();X.moveTo(-44,0);X.lineTo(-24,-120);X.lineTo(22,-124);X.lineTo(46,0);
  X.quadraticCurveTo(24,-12+Math.sin(lvT*4)*6,0,-4);X.quadraticCurveTo(-22,-14+Math.sin(lvT*4+1)*6,-44,0);X.fill();
  X.strokeStyle='#d9b45a';X.lineWidth=2;X.beginPath();X.moveTo(-2,-118);X.lineTo(0,-6);X.moveTo(-40,-6);X.quadraticCurveTo(0,-20,44,-6);X.stroke();
  X.fillStyle='#3d2766';X.beginPath();X.moveTo(10,-112);X.lineTo(42,-70);X.lineTo(30,-62);X.lineTo(4,-96);X.fill();
  X.fillStyle='#4e3488';X.beginPath();X.moveTo(-22,-112);X.quadraticCurveTo(-24,-162,6,-168);X.quadraticCurveTo(30,-162,26,-112);X.fill();
  X.fillStyle='#08040f';X.beginPath();X.ellipse(10,-134,13,17,0,0,7);X.fill();
  X.fillStyle='#efe4ff';X.fillRect(5,-138,4,3);X.fillRect(14,-138,4,3);glow(12,-136,18,'#b48cff',.9);
  X.strokeStyle='#5a4a7a';X.lineWidth=7;X.beginPath();X.moveTo(36,-10);X.lineTo(46,-176);X.stroke();X.strokeStyle='#d9b45a';X.lineWidth=3;X.beginPath();X.arc(46,-184,13,0,7);X.stroke();
  X.fillStyle='#f4ecff';X.beginPath();X.arc(46,-184,8+(e.t<.5?4:0),0,7);X.fill();glow(46,-184,e.t<.5?64:36,'#b48cff',1);
  for(let i=0;i<3;i++){const a=lvT*3+i*2.1;glow(46+Math.cos(a)*24,-184+Math.sin(a)*10,9,'#ffffff',.7)}
  X.restore();X.globalAlpha=1;hitFlash(e,e.x,y-80,80);bar(e,y-e.h-30)}
function drawBoss(b){const y=b.y+b.dy+b.hov,p3=b.phase===3,cr=p3?'#ff1f4f':'#ff3d6e',up=b.state==='barrage'||b.state==='cast';shadow(b.x,124);
  glow(b.x,y-190,280,cr,(p3?.34:.2)+Math.sin(lvT*3)*.05);
  if(b.state==='dashWind'||b.state==='dash')glow(b.x,y-170,220,'#ff3d6e',.5);
  X.save();X.translate(b.x,y);X.scale(b.face,1);
  X.save();X.globalCompositeOperation='lighter';X.fillStyle=cr;
  for(const sd of[-1,1])for(let i=0;i<5;i++){let th=-.15-i*.3+Math.sin(lvT*2+i)*.05;if(sd<0)th=Math.PI-th;const len=190+i*34;X.save();X.translate(sd*26,-250);X.rotate(th);
    X.globalAlpha=.12+i*.05;X.beginPath();X.moveTo(0,-9);X.quadraticCurveTo(len*.55,-36,len,0);X.quadraticCurveTo(len*.55,14,0,12);X.fill();X.restore()}
  X.restore();X.globalAlpha=1;
  X.fillStyle=lg(0,-214,0,0,['#2c1834','#150a1a','#08040a']);X.beginPath();X.moveTo(-94,0);X.lineTo(-52,-212);X.lineTo(52,-216);X.lineTo(100,0);
  X.quadraticCurveTo(50,-26+Math.sin(lvT*3)*8,0,-12);X.quadraticCurveTo(-48,-28+Math.sin(lvT*3+1)*8,-94,0);X.fill();
  X.strokeStyle='#d9a84a';X.lineWidth=3;X.beginPath();X.moveTo(-84,-10);X.lineTo(-48,-202);X.moveTo(88,-10);X.lineTo(48,-204);X.moveTo(-90,-4);X.quadraticCurveTo(-48,-30,0,-14);X.quadraticCurveTo(50,-28,96,-4);X.stroke();
  X.lineWidth=2;for(let i=0;i<4;i++){const yy=-40-i*42;X.beginPath();X.moveTo(-70+i*8,yy);X.quadraticCurveTo(-40,yy-16,-30+i*4,yy+6);X.moveTo(74-i*8,yy);X.quadraticCurveTo(44,yy-16,34-i*4,yy+6);X.stroke()}
  X.fillStyle='#d9a84a';for(let i=-3;i<=3;i++){X.beginPath();X.moveTo(i*24,-16-Math.abs(i)*2);X.lineTo(i*24+5,-22-Math.abs(i)*2);X.lineTo(i*24,-28-Math.abs(i)*2);X.lineTo(i*24-5,-22-Math.abs(i)*2);X.fill()}
  X.fillStyle=lg(-60,-300,60,-200,['#62406a','#2e1c34','#1a0e1e']);X.beginPath();X.moveTo(-62,-200);X.lineTo(-58,-292);X.quadraticCurveTo(0,-306,60,-296);X.lineTo(56,-200);X.quadraticCurveTo(0,-186,-62,-200);X.fill();
  X.strokeStyle='rgba(255,200,220,.25)';X.lineWidth=2;X.beginPath();X.moveTo(0,-298);X.lineTo(0,-196);X.moveTo(-56,-262);X.quadraticCurveTo(0,-250,56,-264);X.stroke();
  glow(0,-240,70,cr,.85+.15*Math.sin(lvT*4));X.fillStyle='#ffe0e8';X.beginPath();X.moveTo(0,-256);X.lineTo(12,-240);X.lineTo(0,-224);X.lineTo(-12,-240);X.fill();
  for(const sx of[-1,1]){X.fillStyle=lg(0,-306,0,-262,['#7a5a80','#2c1a30']);X.beginPath();X.ellipse(sx*64,-284,36,20,sx*.2,0,7);X.fill();X.strokeStyle='#d9a84a';X.lineWidth=3;X.stroke();
    X.fillStyle='#3e2440';X.beginPath();X.moveTo(sx*80,-296);X.lineTo(sx*104,-326);X.lineTo(sx*90,-288);X.fill()}
  X.fillStyle='#0c060e';X.beginPath();X.arc(0,-328,30,0,7);X.fill();X.fillStyle='#3e2440';X.beginPath();X.moveTo(-26,-334);X.lineTo(30,-338);X.lineTo(24,-312);X.lineTo(0,-302);X.lineTo(-20,-314);X.fill();
  X.fillStyle='#ffe0e8';X.fillRect(6,-336,20,5);X.fillRect(-14,-336,10,5);glow(16,-334,24,cr,1);glow(-9,-334,16,cr,.8);
  for(let i=0;i<7;i++){const a=-2.65+i*.36+Math.sin(lvT*1.5+i)*.05,r=62+Math.sin(lvT*3+i)*5;X.save();X.translate(Math.cos(a)*r,-328+Math.sin(a)*r);X.rotate(a+1.57);
    X.fillStyle=i%2?'#e8b85a':cr;X.beginPath();X.moveTo(-6,10);X.lineTo(0,i===3?-34:-24);X.lineTo(6,10);X.fill();X.restore();if(i%2===0)glow(Math.cos(a)*r,-328+Math.sin(a)*r,14,cr,.6)}
  X.save();X.translate(50,-282);X.rotate(up?-2.6:-.2);X.fillStyle='#2c1a30';X.fillRect(-13,0,26,92);X.fillStyle='#d9a84a';X.fillRect(-14,84,28,6);
  X.fillStyle='#ffe0e8';X.beginPath();X.arc(0,104,up?14:9,0,7);X.fill();glow(0,104,up?74:40,cr,1);X.restore();
  X.restore();if(b.flash>0)glow(b.x,y-170,210,'#ffffff',b.flash*3)}
</script>
