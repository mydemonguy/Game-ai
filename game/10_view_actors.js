<script>
"use strict";
/* ---------- view, part 2: Tyko (sprite sheet), the robot cast as cut-out rigs (Phaser containers), shots, pickups, crates, hazards ---------- */
let FRAME=0;
const VIEWS=new Set();
/* every game entity gets a view object the first time it is seen; views whose entity disappeared are destroyed */
function sync(arr,make,upd){for(const e of arr){if(!e.v||!e.v.alive){e.v=make(e);e.v.alive=1;VIEWS.add(e.v)}e.v.seen=FRAME;upd(e,e.v)}}
function sweepViews(){for(const v of VIEWS)if(v.seen!==FRAME){v.alive=0;for(const o of v.objs)o.destroy();VIEWS.delete(v)}}
function killAllViews(){for(const v of VIEWS){v.alive=0;for(const o of v.objs)o.destroy()}VIEWS.clear()}
const rbI=(k,d)=>{const p=RB[k];return SC.add.image(0,0,d?k+'_d':k).setOrigin(p.px/p.c.width,p.py/p.c.height)};
const Cn=(x,y,list)=>{const c=SC.add.container(x||0,y||0);if(list)c.add(list);return c};
const gI=(x,y,size,col,a)=>SC.add.image(x,y,'glow').setBlendMode('ADD').setTint(hexC(col)).setDisplaySize(size,size).setAlpha(a==null?1:a);
function shadowObj(){return SC.add.ellipse(0,0,100,24,0x000000,.4).setDepth(D.shadows)}
function setShadow(sh,x,w,y){sh.setPosition(x,y+4);sh.width=w*2;sh.setSize(w*2,24);sh.setDisplaySize(w*2,24)}
function imgsOf(c,out){out=out||[];for(const ch of c.list){if(ch.type==='Container')imgsOf(ch,out);else if(ch.type==='Image'&&ch.blendMode!==Phaser.BlendModes.ADD)out.push(ch)}return out}
function flashRig(v,f){const on=f>.06;if(on===v.fl)return;v.fl=on;for(const im of v.imgs)on?im.setTintFill(0xffffff):v.tint?im.setTint(v.tint):im.clearTint()}

/* three-segment limb: hip -> knee -> ankle, matching the old canvas rigs */
function leg3(p,d,ox,l1,l2){const foot=rbI(p+'_foot',d),c2=Cn(0,l2,[foot]),c1=Cn(0,l1,[rbI(p+'_shin',d),c2]),c0=Cn(ox,0,[rbI(p+'_thigh',d),c1]);c0.c1=c1;c0.c2=c2;return c0}
function setLeg(c,hip,a1,a2){c.y=hip;c.rotation=a1;c.c1.rotation=a2;c.c2.rotation=-(a1+a2)}
function arm2(p,d,dx,dy,l){const a2=Cn(0,l,[rbI(p+'_farm',d)]),a1=Cn(dx,dy,[rbI(p+'_uarm',d),a2]),a0=Cn(0,0,[a1]);a0.a1=a1;a0.a2=a2;return a0}
function setArm(c,hip,lean,u,f){c.y=hip;c.rotation=lean;c.a1.rotation=u-lean;c.a2.rotation=f}

function mkClaw(){const armB=arm2('cb',1,-18,-84,44),legB=leg3('cb',1,-10,48,52),head=rbI('cb_head'),T=Cn(0,0,[rbI('cb_torso'),head]);head.setPosition(10,-100);
  const legF=leg3('cb',0,10,48,52),armF=arm2('cb',0,12,-84,44),eye=gI(48/.74,-196/.74,44/.74,'#ff3d6e',.85);
  const root=Cn(0,0,[armB,legB,T,legF,armF,eye]).setDepth(D.enemies);return{root,armB,legB,T,head,legF,armF,eye,sc:.74,objs:[root]}}
function updClaw(e,v){const wind=e.state==='wind',swing=e.state==='swing',mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/150):0,sw=Math.sin(lvT*9+e.seed)*.55*mv,hip=-118+(wind?10:0),lean=.18+(wind?-.12:swing?.32:0);
  let ua=.25+sw*.4,fa=-.6;if(wind){ua=2.5;fa=.4}else if(swing){ua=-.95;fa=-.25}
  setArm(v.armB,hip,lean,.15-sw*.4,-.5);setLeg(v.legB,hip,-sw,.25+Math.max(0,sw)*1.1);v.T.y=hip;v.T.rotation=lean;v.head.rotation=Math.sin(lvT*3+e.seed)*.06;
  setLeg(v.legF,hip,sw,.25+Math.max(0,-sw)*1.1);setArm(v.armF,hip,lean,ua,fa);return{warn:wind?e.y-270:0,wg:wind?[e.x+e.face*20,e.y-250,'#ff3d6e']:null,bar:e.y-262,sh:50}}
function mkGorilla(){const armB=arm2('go',1,-34,-124,78),legB=leg3('go',1,-26,52,58),head=rbI('go_head'),T=Cn(0,0,[rbI('go_torso'),head]);head.setPosition(46,-150);
  const legF=leg3('go',0,26,52,58),armF=arm2('go',0,54,-124,78),eye=gI(70/.72,-262/.72,52/.72,'#ff3a2a',.7);
  const root=Cn(0,0,[armB,legB,T,legF,armF,eye]).setDepth(D.enemies);return{root,armB,legB,T,legF,armF,eye,sc:.72,objs:[root]}}
function updGorilla(e,v){const wind=e.state==='wind',swing=e.state==='swing',mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/120):0,sw=Math.sin(lvT*6+e.seed)*.45*mv,hip=-134+(wind?12:swing?18:0),lean=wind?.05:.32;
  let ua=.12+sw*.5,fa=.2;if(wind){ua=3.05;fa=.15}else if(swing){ua=-.55;fa=-.45}
  setArm(v.armB,hip,lean,e.state==='walk'?.12-sw*.5:wind?2.55:ua,wind?.55:fa);setLeg(v.legB,hip,-sw,.2+Math.max(0,sw)*.8);v.T.y=hip;v.T.rotation=lean;
  setLeg(v.legF,hip,sw,.2+Math.max(0,-sw)*.8);setArm(v.armF,hip,lean,ua,fa);return{warn:wind?e.y-330:0,wg:wind?[e.x,e.y-300,'#ff3a2a']:null,bar:e.y-320,sh:84}}
function wkLeg(d,o){const foot=rbI('wk_foot',d),c2=Cn(0,112,[foot]),c1=Cn(0,104,[rbI('wk_shin',d),c2]),c0=Cn(o,0,[rbI('wk_thigh',d),c1]);c0.c1=c1;c0.c2=c2;return c0}
function mkWalker(){const gunB=rbI('wk_gun',1),legB=wkLeg(1,-46),hull=rbI('wk_hull'),legF=wkLeg(0,46),gunF=rbI('wk_gun'),eye=gI(170,-300,52,'#ff3a2a',.8),tip=gI(222,-300,160,'#ff8a2a',0);
  const root=Cn(0,0,[gunB,legB,hull,legF,gunF,eye,tip]).setDepth(D.enemies);return{root,gunB,legB,hull,legF,gunF,eye,tip,sc:.88,objs:[root]}}
function updWalker(e,v){const mv=e.state==='walk'?Math.min(1,Math.abs(e.vx)/110):0,ph=lvT*5+e.seed,sw=Math.sin(ph)*.32*mv,dip=e.state==='swing'?24:e.state==='wind'?-10:Math.abs(Math.sin(ph))*6*mv,hip=-227+dip;
  const L=(c,a)=>{c.y=hip;c.rotation=-.45+a;c.c1.rotation=.95-a*1.4;c.c2.rotation=-(.5-a*.4)};L(v.legB,-sw);L(v.legF,sw);v.hull.y=hip;
  const gt=e.state==='wind'?-.32:e.state==='swing'?.08:Math.sin(lvT*2+e.seed)*.04;v.gunB.setPosition(-50,hip-96).setRotation(gt);v.gunF.setPosition(72,hip-84).setRotation(gt);
  v.eye.setPosition(170,hip-70);v.tip.setPosition(72+Math.cos(gt)*150,hip-84+Math.sin(gt)*150);
  if(e.state==='wind'){v.tip.setTint(0xff8a2a).setAlpha(.6+.3*Math.sin(lvT*30)).setDisplaySize(160/.88,160/.88)}else if(e.state==='swing'){v.tip.setTint(0xfff0c8).setAlpha(.8).setDisplaySize(240/.88,240/.88)}else v.tip.setAlpha(0);
  return{warn:e.state==='wind'?e.y-370:0,bar:e.y-360,sh:110}}
function mkHound(){const back=Cn(0,0,[rbI('hd_leg',1).setPosition(-30,18),rbI('hd_leg',1).setPosition(50,18)]),tail=SC.add.image(-70,0,'hd_tail').setOrigin(84/90,60/70),head=rbI('hd_head');head.setPosition(62,-6);
  const front=Cn(0,0,[rbI('hd_body'),head,rbI('hd_leg').setPosition(-46,18),rbI('hd_leg').setPosition(36,18)]),eye=gI(96/.86,-108/.86,40/.86,'#ff3a2a',.85);
  const root=Cn(0,0,[back,tail,front,eye]).setDepth(D.enemies);return{root,back,tail,front,head,eye,sc:.86,objs:[root]}}
function updHound(e,v){const lp=e.state==='leap',wd=e.state==='wind',mv=Math.min(1,Math.abs(e.vx)/300),ph=lvT*14+e.seed,by=-86+(wd?16:0)+(lp?-26:0),tilt=lp?-.16:wd?.12:Math.sin(ph*2)*.03;
  const la=(x,p2)=>lp?(x>0?-1:1):wd?(x>0?.5:-.5):Math.sin(ph+p2)*.6*mv;
  for(const c of[v.back,v.front]){c.y=by;c.rotation=tilt}v.back.list[0].rotation=la(-30,Math.PI);v.back.list[1].rotation=la(50,0);v.front.list[2].rotation=la(-46,0);v.front.list[3].rotation=la(36,Math.PI);
  v.head.rotation=wd?.25:lp?-.2:Math.sin(ph)*.05;v.tail.setPosition(-70,by-6).setRotation(Math.sin(lvT*8)*.12);return{warn:wd?e.y-150:0,bar:e.y-150,sh:62}}
function mkDrone(){const th=gI(0,58,60,'#ff8a3a',.6);th.setDisplaySize(60,80);const legs=[[-24,0],[24,2],[0,4]].map(([x,o])=>{const l=rbI('dr_leg',x===0).setPosition(x,40);l.o=o;l.lx=x;return l}),body=rbI('dr_body'),eye=gI(6,-2,52,'#ff3a2a',.9),chg=gI(0,0,120,'#ff3a2a',0);
  const root=Cn(0,0,[th,...legs,body,eye,chg]).setDepth(D.drones);return{root,th,legs,body,chg,sc:.9,objs:[root]}}
function updDrone(e,v){const y=e.y-30+Math.sin(lvT*3+e.seed)*5;v.root.y=y;v.th.setAlpha(.55+Math.random()*.3);for(const l of v.legs)l.rotation=Math.sin(lvT*4+e.seed+l.o)*.25+(l.lx<0?.25:l.lx>0?-.25:0);
  v.body.rotation=Math.sin(lvT*2+e.seed)*.06;v.chg.setAlpha(e.t<.4?(.4-e.t)*2.2:0);return{bar:y-70,noShadow:1,ly:y}}
function mkCaster(){const jets=[gI(-30,4,60,'#7fd8ff',.7),gI(-22,4,60,'#7fd8ff',.7)];for(const j of jets)j.setDisplaySize(60,92);
  const legs=[[-12,1],[10,0]].map(([x,o])=>{const l=rbI('gn_leg',!o).setPosition(x,-8);l.o=o;return l}),head=rbI('gn_head').setPosition(4,-86),rifle=rbI('gn_rifle').setPosition(16,-52),mz=gI(0,0,40,'#ff4a3a',.5);
  const root=Cn(0,0,[...jets,rbI('gn_jet',1).setPosition(-36,-74),...legs,rbI('gn_torso'),head,rifle,mz]).setDepth(D.enemies);
  const tele=SC.add.ellipse(0,0,140,40).setStrokeStyle(5,0x7fd8ff,.6).setDepth(D.shadows).setBlendMode('ADD');return{root,jets,legs,head,rifle,mz,tele,sc:.86,objs:[root,tele]}}
function updCaster(e,v){const fl=Math.sin(lvT*2.5+e.seed)*10,y=e.y-60+fl,al=e.tp?Math.max(.05,e.tp/.35):1-(e.fade||0)*.8;v.root.y=y;v.root.setAlpha(al);
  const aim=clamp(Math.atan2((pl?pl.y-100:y)-(y-60),Math.abs((pl?pl.x:e.x)-e.x)+1),-.7,.5);for(const j of v.jets)j.setAlpha(.7*al*(.7+Math.random()*.3));
  for(const l of v.legs)l.rotation=Math.sin(lvT*3+l.o+e.seed)*.15+.12;v.head.rotation=aim*.3;v.rifle.rotation=aim;v.mz.setPosition(16+170*Math.cos(aim),-52+170*Math.sin(aim)).setDisplaySize(e.t<.5?140:46,e.t<.5?140:46).setAlpha(e.t<.5?1:.5);
  const tv=e.t<.7&&!e.tp;v.tele.setVisible(tv).setPosition(e.x,e.y);if(tv)v.tele.setAlpha(Math.min(1,(.7-e.t)*1.4));return{bar:y-e.h-20,sh:36,ly:y}}
function mkTurret(){const base=SC.add.image(-38,0,'tur_base').setOrigin(0,.5),gun=SC.add.image(22,0,'tur_gun').setOrigin(34/132,34/68),eye=gI(22,0,90,'#ff3a2a',.4);
  const root=Cn(0,0,[base,gun,eye]).setDepth(D.enemies);return{root,gun,eye,sc:1,objs:[root]}}
function updTurret_v(e,v){const y=e.y-45;v.root.y=y;v.gun.rotation=e.la||0;const aim=e.t<.7||e.n>0;v.eye.setPosition(22+Math.cos(e.la||0)*10,Math.sin(e.la||0)*10).setAlpha(aim?.7+.3*Math.sin(lvT*30):.3);return{bar:y-70,ly:y}}
const RIG={t:[mkTurret,updTurret_v],g:[mkClaw,updClaw],b:[mkGorilla,updGorilla],B:[mkWalker,updWalker],h:[mkHound,updHound],d:[mkDrone,updDrone],c:[mkCaster,updCaster]};
function mkEnemyView(e){const[mk]=RIG[e.type],v=mk();v.imgs=imgsOf(v.root);v.sh=e.fly?null:shadowObj();if(v.sh)v.objs.push(v.sh);return v}
function updEnemyView(e,v){const r=RIG[e.type][1](e,v);v.root.x=e.x;if(!e.fly&&e.type!=='c')v.root.y=e.y;v.root.setScale(e.face*v.sc,v.sc);flashRig(v,e.flash);
  if(v.sh)setShadow(v.sh,e.x,r.sh||50,surfaceBelow(e.x,e.y-4));
  if(r.warn)warnMark(e.x,r.warn);if(r.wg)OV.glows.push(r.wg);if(e.hp<e.max)OV.bars.push(e,r.bar);lightW(e.x,(r.ly||e.y)-e.h*.6,e.fly?170:130,.55)}

/* ---- Malakar ---- */
function mkBoss(){const spr=bossSprite('malakar',2.8,D.boss),aura=gI(0,0,620,'#ff3d6e',.2).setDepth(D.boss-.5),sh=shadowObj(),flI=gI(0,0,440,'#ffffff',0).setDepth(D.boss+.5),
    core=gI(0,0,140,'#ff3d6e',.5).setDepth(D.boss+.2);return{spr,aura,sh,flI,core,objs:[spr,aura,sh,flI,core]}}
function updBossView(b,v){const y=b.y+b.dy+b.hov,p3=b.phase===3,cr=p3?0xff1f4f:0xff3d6e,st=b.state;
  const fr=st==='dashWind'||st==='slashWind'?'wind':st==='dash'?'swing':st==='slash'?'slash':st==='barrage'||st==='cast'?'cast':st==='enter'?'idle0':idleFrame(b,Math.abs(b.mv||0)>40);
  v.spr.setFrame(fr).setPosition(b.x,y).setFlipX(b.face<0);if(b.flash>.06)v.spr.setTintFill(0xffffff);else if(p3)v.spr.setTint(0xffd0d8);else v.spr.clearTint();setShadow(v.sh,b.x,120,b.y);
  v.aura.setPosition(b.x,y-200).setTint(cr).setAlpha((p3?.34:.2)+Math.sin(lvT*3)*.05+(st==='dashWind'||st==='dash'||st==='slashWind'?.3:0));
  v.core.setPosition(b.x+b.face*4,y-260).setTint(cr).setAlpha(.35+.2*Math.sin(lvT*4));
  v.flI.setPosition(b.x,y-170).setAlpha(b.flash>0?b.flash*3:0);if(st==='dashWind'||st==='slashWind')warnMark(b.x,y-420);lightW(b.x,y-240,420,.95)}

/* ---- Tyko ---- */
const DV={};
function mkPlayerView(){const M=DINO,s=SC;DV.spr=s.add.sprite(0,0,'dino',0).setOrigin(M.ax/M.fw,M.ay/M.fh).setDepth(D.player);DV.sh=shadowObj();
  DV.aura=gI(0,0,220,'#5ce1ff',0).setDepth(D.player-.1);DV.slash=s.add.graphics().setDepth(D.player+.1).setBlendMode('ADD');
  DV.aegis=s.add.container(0,0,[gI(0,0,1,'#ffb030',.55).setDisplaySize(90,280),s.add.rectangle(0,0,20,220,0xffcc4a,.5).setStrokeStyle(4,0xfff0b0,1),s.add.rectangle(0,0,8,190,0xfff6d0,.8)]).setDepth(D.player+.2).setVisible(false);
  DV.shield=s.add.circle(0,0,118).setStrokeStyle(5,0x8fc8ff,.55).setFillStyle(0x8fc8ff,.12).setDepth(D.player+.2).setBlendMode('ADD').setVisible(false);
  DV.ghosts=[];for(let i=0;i<8;i++)DV.ghosts.push(s.add.sprite(0,0,'dino',0).setOrigin(M.ax/M.fw,M.ay/M.fh).setDepth(D.player-.2).setTintFill(0xa58cff).setVisible(false));DV.gi=0}
V.ghost=p=>{const g=DV.ghosts[DV.gi++%DV.ghosts.length];if(!g)return;g.setFrame(DINO.anims.run[2]).setPosition(p.x,p.y).setScale(p.face,1).setVisible(true).setAlpha(.45);SC.tweens.killTweensOf(g);SC.tweens.add({targets:g,alpha:0,duration:220,onComplete:()=>g.setVisible(false)})};
function dinoFrame(p){const A=DINO.anims;
  if(p.dead)return A.dead[Math.min(7,Math.floor((p.deadT||0)*12))];
  if(p.atk>0){const q=1-p.atk/.22;return p.combo===3?A.jump[q<.3?2:10]:A.jump[q<.25?3:5]}
  if(p.dashT>0)return A.run[2];
  if(!p.ground)return p.vy<-500?A.jump[4]:p.vy<0?A.jump[5]:p.vy<500?A.jump[7]:A.jump[8];
  if(p.landT>0)return A.jump[9+Math.min(2,Math.floor((.15-p.landT)/.05))];
  const v=Math.abs(p.vx);if(v>330)return A.run[Math.floor(p.run*1.1)%8];if(v>40)return A.walk[Math.floor(p.run*1.6)%10];return A.idle[Math.floor(lvT*12)%10]}
const CLAW=[[-1.25,1.0],[1.05,-1.2],[-1.6,1.4]];
function updPlayerView(){const p=pl,vis=!!p&&G.state!=='menu';for(const k of['spr','sh','aura','slash'])DV[k].setVisible(vis);if(!vis){DV.shield.setVisible(false);DV.aegis.setVisible(false);return}
  const lunge=p.atk>0?1+.06*Math.sin((1-p.atk/.22)*Math.PI):1,sx=(1+p.squash*.1)*lunge,sy=1-p.squash*.1;
  DV.spr.setFrame(dinoFrame(p)).setPosition(p.x,p.y).setScale(p.face*sx,sy).setAlpha(p.inv>0&&p.dashT<=0&&!p.dead&&Math.floor(p.inv*22)%2?.45:1);
  if(p.fury>0)DV.spr.setTint(0xffd0a0);else DV.spr.clearTint();
  const sup=p.sup||FY;setShadow(DV.sh,p.x,60*(1-Math.min(.5,(sup-p.y)/600)),sup);
  DV.aura.setPosition(p.x+p.face*10,p.y-100).setAlpha(p.en>=50&&!p.dead?.18+.08*Math.sin(lvT*5):0);
  DV.aegis.setVisible(p.aegis>0&&!p.dead).setPosition(p.x+p.face*110,p.y-95).setAlpha(p.aegis<.6&&Math.floor(lvT*16)%2?.3:1);if(p.aegis>0)lightW(p.x+p.face*110,p.y-95,200,.6);
  DV.shield.setVisible(p.shield>0&&!p.dead).setPosition(p.x,p.y-95).setRadius(118+Math.sin(lvT*6)*4);
  const g=DV.slash;g.clear();if(p.atk>0){const c=CLAW[(p.combo||1)-1],q=Math.min(1,(1-p.atk/.22)*1.5),a=p.atk/.22,big=p.combo===3,col=big?0xc9a8ff:0x7fe9ff;
    const a0=c[0],a1=c[0]+(c[1]-c[0])*q;let lo=Math.min(a0,a1),hi=Math.max(a0,a1);if(p.face<0){const l2=Math.PI-hi,h2=Math.PI-lo;lo=l2;hi=h2}
    const cx=p.x+p.face*(big?90:70),cy=p.y-100;g.lineStyle(big?80:56,col,.2*a+.06);g.beginPath();g.arc(cx,cy,big?150:120,lo,hi);g.strokePath();
    for(let i=0;i<3;i++){g.lineStyle(big?9:7,i===1?0xffffff:col,.75*a);g.beginPath();g.arc(cx,cy,(big?120:96)+i*(big?22:17),lo,hi);g.strokePath()}}
  if(!p.dead)lightW(p.x,p.y-100,280,.7)}

/* ---- shots, pickups, crates ---- */
function mkShotView(s){if(s.wave||s.cres){const c=SC.add.image(0,0,'crescent').setOrigin(.2,.5).setBlendMode('ADD').setDepth(D.shots).setTint(hexC(s.col)),g=gI(0,0,300,s.col,.6).setDepth(D.shots);return{c,g,objs:[c,g]}}
  const g=gI(0,0,s.r*6.4,s.col,.9).setDepth(D.shots),core=SC.add.circle(0,0,s.r*.6,0xffffff).setDepth(D.shots+.5);return{g,core,col:s.col,objs:[g,core]}}
function updShotView(s,v){if(s.wave||s.cres){if(v.col!==s.col){v.col=s.col;v.c.setTint(hexC(s.col));v.g.setTint(hexC(s.col))}const a=Math.min(1,s.life*2);v.c.setPosition(s.x-Math.sign(s.vx)*40,s.y).setScale(Math.sign(s.vx)*(s.r+30)/100,(s.r+30)/100).setAlpha(a);v.g.setPosition(s.x,s.y).setAlpha(a*.6);lightW(s.x,s.y,340,.9);return}
  if(v.col!==s.col){v.col=s.col;v.g.setTint(hexC(s.col))}v.g.setPosition(s.x,s.y);v.core.setPosition(s.x,s.y);lightW(s.x,s.y,150,.9)}
function mkPickView(k){const big=k.type==='sfang'||k.type==='lore',i=SC.add.image(0,0,'pk_'+k.type).setDepth(D.picks).setScale(big?1.5:1);let ring=null;if(k.type!=='coin'&&k.float){ring=SC.add.circle(0,0,34).setStrokeStyle(2.5,0xffffff,.55).setDepth(D.picks).setScale(big?1.5:1)}
  const objs=ring?[i,ring]:[i];if(big)objs.push(gI(k.x,k.y,240,PICK[k.type].col,.35).setDepth(D.picks-.1));return{i,ring,big,objs}}
function updPickView(k,v){const y=k.y+(k.float?Math.sin(lvT*3+k.x*.01)*8:0),blink=!k.float&&k.life<3&&Math.floor(k.life*8)%2;v.i.setPosition(k.x,y).setVisible(!blink);
  if(k.type==='coin')v.i.setScale(Math.max(.15,Math.abs(Math.cos(lvT*4+k.x))),1);if(v.ring)v.ring.setPosition(k.x,y).setRadius(34+Math.sin(lvT*4+k.x)*4);if(v.big)v.objs[2].setPosition(k.x,y).setAlpha(.3+.1*Math.sin(lvT*3));lightW(k.x,k.y,110,.55)}
function mkBoxView(b){const t=LV[G.lv].theme,i=SC.add.image(b.x,FY+2,'crate_'+t).setOrigin(.5,1).setDepth(D.crates),g=gI(b.x,FY-62,60,'#5ce1ff',.5).setDepth(D.crates+.5),cr=SC.add.graphics().setDepth(D.crates);return{i,g,cr,hp:2,objs:[i,g,cr]}}
function updBoxView(b,v){v.g.setAlpha(.45+.2*Math.sin(lvT*3+b.x));if(b.flash>0)v.i.setTintFill(0xffffff);else v.i.clearTint();
  if(b.hp<2&&v.hp===2){v.hp=1;v.cr.lineStyle(3,0x000000,.6);v.cr.beginPath();v.cr.moveTo(b.x-30,FY-90);v.cr.lineTo(b.x-6,FY-60);v.cr.lineTo(b.x-20,FY-30);v.cr.strokePath()}lightW(b.x,FY-60,110,.35)}

/* ---- per-frame overlay: health bars, warning marks, hazards ---- */
const OV={g:null,hz:null,bars:[],glows:[],marks:[],mi:0,hzT:[],lines:[]};
function ovInit(){OV.g=SC.add.graphics().setDepth(D.light+.5);OV.hz=SC.add.graphics().setDepth(D.hz);OV.hzA=SC.add.graphics().setDepth(D.hz).setBlendMode('ADD');
  for(let i=0;i<10;i++)OV.marks.push(SC.add.text(0,0,'!',{fontFamily:FD,fontStyle:'900',fontSize:'56px',color:'#ff3d3d',stroke:INK,strokeThickness:6}).setOrigin(.5,1).setDepth(D.texts).setVisible(false));
  OV.wg=[];for(let i=0;i<8;i++)OV.wg.push(gI(0,0,120,'#ff3d6e',0).setDepth(D.enemies+.5));
  for(let i=0;i<3;i++)OV.hzT.push(SC.add.text(0,0,'',{fontFamily:FU,fontStyle:'700',fontSize:'34px',color:'#ffd0dc'}).setOrigin(.5,1).setDepth(D.texts).setVisible(false))}
function warnMark(x,y){const m=OV.marks[OV.mi++];if(m)m.setPosition(x,y).setVisible(true)}
function ovUpdate(){const g=OV.g;g.clear();for(let i=0;i<OV.bars.length;i+=2){const e=OV.bars[i],y=OV.bars[i+1],w=Math.max(70,e.w+20),x=e.x-w/2,f=Math.max(0,e.hp/e.max);
    g.fillStyle(0x05040c,.75);g.fillRect(x-2,y-2,w+4,12);g.fillStyle(0xff3d6e,1);g.fillRect(x,y,w*f,8);g.fillStyle(0xffffff,.35);g.fillRect(x,y,w*f,2)}
  for(let i=OV.mi;i<OV.marks.length;i++)OV.marks[i].setVisible(false);
  OV.wg.forEach((o,i)=>{const w=OV.glows[i];if(w){o.setPosition(w[0],w[1]).setTint(hexC(w[2])).setAlpha(.5+.3*Math.sin(lvT*30))}else o.setAlpha(0)});
  const hg=OV.hz,ha=OV.hzA;hg.clear();ha.clear();let ti=0;
  for(const l of OV.lines){ha.lineStyle(10,0xff3d5a,l[4]*.35);ha.lineBetween(l[0],l[1],l[2],l[3]);ha.lineStyle(3,0xffd0d8,l[4]);ha.lineBetween(l[0],l[1],l[2],l[3])}OV.lines=[];
  for(const h of hz){if(h.kind==='rock'){if(h.t>0){hg.fillStyle(0xff8a3a,.22+.2*Math.sin(lvT*24));hg.fillEllipse(h.x,FY+4,150,30);if(h.t<.4){const y=FY-30-(h.t/.4)*900;hg.fillStyle(0x5a4c44,1);hg.fillCircle(h.x,y,30);hg.lineStyle(4,0x1a1418,1);hg.strokeCircle(h.x,y,30);hg.fillStyle(0x8a7a6a,1);hg.fillCircle(h.x-8,y-8,10)}}continue}
    if(h.kind==='fire'){const a=Math.min(1,h.act*1.5);ha.fillStyle(0xff6418,.35*a);ha.fillEllipse(h.x,FY-4,h.w*1.2,34);hg.fillStyle(0xffb040,.85*a);
      for(let i=0;i<3;i++){const fx=h.x-h.w*.35+i*h.w*.35,fh=(26+Math.sin(lvT*14+i*2+h.x)*10)*a;hg.fillTriangle(fx-12,FY,fx+12,FY,fx,FY-fh)}lightW(h.x,FY-30,180,.6*a);continue}
    if(h.kind==='quake'){const a=Math.min(1,h.act*2);ha.fillStyle(0xffb347,.5*a);ha.fillEllipse(h.x,FY-20,140,80);hg.fillStyle(0xfff0c8,a);hg.beginPath();hg.moveTo(h.x-34,FY);
      for(let i=0;i<5;i++)hg.lineTo(h.x-34+i*17,FY-(i%2?46:18));hg.lineTo(h.x+34,FY);hg.closePath();hg.fillPath();lightW(h.x,FY-20,180,.8);continue}
    if(h.kind==='pillar'){if(h.t>0){hg.fillStyle(0xff3d6e,.25+.25*Math.sin(lvT*30));hg.fillEllipse(h.x,GY+6,h.w,36)}else{const a=Math.min(1,h.act/.2);ha.fillStyle(0xff3d6e,.35*a);ha.fillRect(h.x-h.w/2,0,h.w,GY);ha.fillStyle(0xffd0dc,.8*a);ha.fillRect(h.x-h.w*.18,0,h.w*.36,GY);lightW(h.x,GY-300,420,1)}continue}
    const x0=cam-50,x1=cam+W+50;if(h.t>0){const al=.35+.3*Math.sin(lvT*24);hg.lineStyle(4,0xff3d6e,al);for(let x=x0;x<x1;x+=50){hg.lineBetween(x,h.y,x+30,h.y)}
      const t=OV.hzT[ti++];if(t)tx(t,h.low?'▲ JUMP':'▼ STAY LOW').setPosition(cam+W/2,h.y-50).setVisible(true).setAlpha(al+.3)}
    else{const a=Math.min(1,h.act/.2);ha.fillStyle(0xff3d6e,a);ha.fillRect(x0,h.y-38,x1-x0,76);ha.fillStyle(0xffffff,a);ha.fillRect(x0,h.y-10,x1-x0,20);for(let x=0;x<W;x+=300)lightS(x+150,h.y-camY,260,.8)}}
  for(let i=ti;i<OV.hzT.length;i++)OV.hzT[i].setVisible(false);OV.bars=[];OV.glows=[];OV.mi=0}

/* ---- the whole actor pass, once per rendered frame ---- */
function actorsUpdate(){FRAME++;updPlayerView();
  sync(en,mkEnemyView,updEnemyView);if(boss&&!boss.dead){if(boss.guard!=null)sync([boss],mkGuardView,updGuardView);else sync([boss],mkBoss,updBossView)}
  if(npc&&G.state!=='menu')sync([npc],mkNPCView,updNPCView);if(ally)sync([ally],mkAllyView,updAllyView);sync(shots,mkShotView,updShotView);sync(picks,mkPickView,updPickView);sync(boxes,mkBoxView,updBoxView);sweepViews();ovUpdate()}
</script>
