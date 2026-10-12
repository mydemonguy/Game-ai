<script>
"use strict";
/* ---------- view, part 1: parallax backdrops, weather, room geometry, machines, lamps, doors and fixtures ---------- */
const V={bgA:-1,bgW:0,bg:[],rm:[],lamps:[],ems:[],wems:[],doors:[],fans:[],signs:[],cols:[],gateV:[],cageV:[],fx:{}};
function vKill(list){for(const o of list)if(o&&o.destroy){if(SC)SC.tweens.killTweensOf(o);o.destroy()}list.length=0}
const glowImg=(x,y,w,h,col,a,depth,list)=>{const g=SC.add.image(x,y,'glow').setBlendMode('ADD').setTint(hexC(col)).setDisplaySize(w,h).setAlpha(a).setDepth(depth+.5);(list||V.rm).push(g);return g};

/* wrapping parallax strip: a few copies of one 2048px texture slid along (no per-frame texture uploads) */
function strip(key,y,depth,add){const n=Math.ceil(W/SW)+1,list=[];for(let k=0;k<n;k++)list.push(add(SC.add.image(k*SW,y,key).setOrigin(0).setScrollFactor(0).setDepth(depth)));return list}
function stripAt(list,px,y){const off=((px%SW)+SW)%SW;y+=list.oy||0;list.forEach((im,k)=>{im.x=Math.round(-off+k*SW);im.y=y})}
/* repeat a texture over a rectangle with plain images (cropped at the edges) */
function tiles(x,y,w,h,key,tw,th,depth,a){for(let ty=0;ty<h;ty+=th)for(let tx=0;tx<w;tx+=tw){const cw=Math.min(tw,w-tx),ch=Math.min(th,h-ty),im=SC.add.image(x+tx,y+ty,key).setOrigin(0).setDepth(depth);
    if(cw<tw||ch<th)im.setCrop(0,0,cw,ch);if(a!=null)im.setAlpha(a);V.rm.push(im)}}
function buildBG(a){vKill(V.bg);const s=SC,L=LV[a],t=L.theme,A=AMB[t],r=rng(L.len*11+7),add=o=>{V.bg.push(o);return o};themeTex(a);
  V.bgA=a;V.bgW=W;
  V.sky=add(s.add.image(-60,-60,skyTex(a)).setOrigin(0).setScrollFactor(0).setDepth(D.sky));
  for(let i=0;i<34;i++){const st=add(s.add.image(r()*W,r()*GY*.6,'flake').setScrollFactor(0).setDepth(D.stars).setScale(.12+r()*.22).setAlpha(.3));
    s.tweens.add({targets:st,alpha:{from:.1,to:.95},duration:500+r()*1800,yoyo:true,repeat:-1,delay:r()*2000})}
  V.clouds=[];if(t==='station'||t==='citadel')for(let i=0;i<9;i++){const c=add(s.add.image(0,0,'glow').setScrollFactor(0).setDepth(D.skyfx).setBlendMode('ADD'));
    c.d={x:r()*3200,y:t==='station'?420+r()*360:200+r()*300,w:260+r()*360,v:8+r()*18};c.setDisplaySize(c.d.w*2,c.d.w*.44).setAlpha(.06+r()*.08);V.clouds.push(c)}
  V.rays=[];for(let i=0;i<3;i++){const ry=add(s.add.image(0,0,'ray').setOrigin(0).setScrollFactor(0).setDepth(D.skyfx).setBlendMode('ADD').setTint(hexN(L.planet)));
    ry.d={x:r()*2600,w:80+r()*160,ph:r()*6,a:.05+r()*.05};ry.setScale(ry.d.w/90,1);V.rays.push(ry)}
  V.ships=[];for(let i=0;i<5;i++){const sh=add(s.add.image(0,0,'ship_'+t).setScrollFactor(0).setDepth(D.skyfx)),gl=add(s.add.image(0,0,'glow').setScrollFactor(0).setDepth(D.skyfx).setBlendMode('ADD').setTint(hexN(L.glow)));
    sh.d={x:r()*3000,y:90+r()*360,v:(60+r()*140)*(r()<.5?-1:1),sc:.4+r()*.6,s:r(),gl};sh.setScale(sh.d.sc*Math.sign(sh.d.v),sh.d.sc);gl.setDisplaySize(80*sh.d.sc,32*sh.d.sc).setAlpha(.7);V.ships.push(sh)}
  V.search=[];if(A.search)for(let i=0;i<3;i++){const b=add(s.add.image(W*(.2+i*.3),GY-40,'beam').setOrigin(.5,0).setScrollFactor(0).setDepth(D.skyfx).setBlendMode('ADD').setTint(hexN(A.search)).setAlpha(.16));b.setDisplaySize(150,GY*1.25);b.ph=i*2.1;V.search.push(b)}
  const TT=THEMED[t];V.far=strip('far_'+t,0,D.far,add);V.far.oy=TT.farTop||0;
  V.fog=add(s.add.image(0,GY-340,'fog_'+t).setOrigin(0).setScrollFactor(0).setDepth(D.fog).setDisplaySize(W,340));
  V.mid=strip('mid_'+t,0,D.mid,add);V.mid.oy=TT.midTop||0;V.fgb=strip('fgb_'+t,H-300,D.fg,add);V.fgt=strip('fgt_'+t,0,D.fg,add);
  buildWeather(a);gradeFor(a)}

/* weather and floating motes: GPU particle emitters pinned to the screen */
function buildWeather(a){const s=SC,L=LV[a],t=L.theme,A=AMB[t],w=A.weather,add=o=>{V.bg.push(o);return o},lo=PQ()<1;V.splash=null;V.fogs=[];
  const zone=()=>({type:'random',source:new Phaser.Geom.Rectangle(-300,-140,W+700,60)});
  if(w==='rain'){add(s.add.particles(0,0,'streak',{emitZone:zone(),speedY:{min:1300,max:1750},speedX:A.heavy?-260:-120,lifespan:950,quantity:A.heavy?(lo?2:4):(lo?1:2),frequency:16,
      scaleX:.45,scaleY:{min:.5,max:1},alpha:A.heavy?.34:.24,rotate:A.heavy?9.8:4.6,tint:A.heavy?0xbed2ff:0xbedcd2}).setScrollFactor(0).setDepth(D.weather));
    V.splash=add(s.add.particles(0,0,'flake',{emitting:false,lifespan:280,speedY:{min:-160,max:-60},speedX:{min:-70,max:70},scale:{start:.55,end:.1},alpha:{start:.6,end:0},gravityY:700,tint:0xc8dcff}).setDepth(D.parts))}
  else if(w==='snow'){add(s.add.particles(0,0,'flake',{emitZone:zone(),speedY:{min:80,max:200},speedX:{min:-260,max:-90},lifespan:9000,quantity:1,frequency:lo?60:30,scale:{min:.3,max:.7},alpha:{min:.5,max:.85},tint:0xe6dcff,
      accelerationX:{min:-30,max:10}}).setScrollFactor(0).setDepth(D.weather))}
  else if(w==='ash'||w==='ash2'){add(s.add.particles(0,0,'dot',{emitZone:zone(),speedY:{min:50,max:120},speedX:{min:-60,max:20},lifespan:12000,quantity:1,frequency:lo?80:40,scale:{min:.2,max:.4},alpha:.7,tint:w==='ash'?0x786e64:0x5a3c3c}).setScrollFactor(0).setDepth(D.weather));
    add(s.add.particles(0,0,'glow',{emitZone:{type:'random',source:new Phaser.Geom.Rectangle(-100,H-80,W+200,80)},speedY:{min:-140,max:-60},speedX:{min:-40,max:40},lifespan:7000,frequency:lo?220:110,scale:{min:.04,max:.09},
      alpha:{start:1,end:0},blendMode:'ADD',tint:w==='ash'?0xff9a3a:0xff4a2a}).setScrollFactor(0).setDepth(D.weather))}
  else if(w==='debris'){add(s.add.particles(0,0,'px',{emitZone:{type:'random',source:new Phaser.Geom.Rectangle(W+40,0,40,H*.75)},speedX:{min:-90,max:-30},speedY:{min:-10,max:10},lifespan:40000,frequency:lo?900:450,
      scale:{min:.5,max:1.2},rotate:{start:0,end:720},alpha:.5,tint:0xc8d7f0}).setScrollFactor(0).setDepth(D.weather))}
  const M=MOTE[t],mc={emitZone:{type:'random',source:new Phaser.Geom.Rectangle(0,0,W,H)},lifespan:{min:3000,max:6000},frequency:lo?260:130,speedX:M.wind?{min:-700,max:-400}:{min:-20,max:20},speedY:M.wind?0:{min:M.v*.5,max:M.v*1.5},
    alpha:{onEmit:()=>0,onUpdate:(p,k,t)=>Math.sin(t*Math.PI)*(M.wind?.25:.55)},blendMode:'ADD',tint:hexN(M.col)};
  if(M.wind){mc.scaleX={min:3,max:6};mc.scaleY=.15}else mc.scale={min:.12,max:.3};
  add(s.add.particles(0,0,'dot',mc).setScrollFactor(0).setDepth(D.weather));
  if(A.fog){const r=rng(9);for(let i=0;i<7;i++){const f=add(s.add.image(0,0,'glow').setScrollFactor(0).setDepth(D.weather).setBlendMode('ADD').setTint(hexN(A.fog)));f.d={x:r()*3200,y:GY-60-r()*160,w:380+r()*420,v:10+r()*25};f.setDisplaySize(f.d.w*2,f.d.w*.4).setAlpha(.06+r()*.05);V.fogs.push(f)}}}

/* ---- the room itself ---- */
function emissive(x,y,e,sf,depth){const g=SC.add.image(x,y,'glow').setBlendMode('ADD').setTint(hexN(e.col)).setDepth(depth+(sf===1?0:.5));g.setDisplaySize(e.r*2,(e.ry||e.r)*2);g.e=e;g.bx=x;g.by=y;g.sf=sf;
  if(sf!==1)g.setScrollFactor(sf,.05);V.rm.push(g);(sf===1?V.ems:V.wems).push(g);return g}
V.room=function(o){vKill(V.rm);V.lamps=[];V.ems=[];V.wems=[];V.doors=[];V.fans=[];V.signs=[];V.cols=[];V.gateV=[];V.cageV=[];V.lift=null;V.shrine=null;V.station=null;V.conv=null;V.vault=null;
  if(V.bgA!==o.a||V.bgW!==W)buildBG(o.a);
  const s=SC,L=LV[o.a],t=L.theme,T=THEMED[t],P=PAL[t],A=AMB[t],add=x=>{V.rm.push(x);return x},r=rng(hstr(o.id)+5),ink=hexN(P.ink),gl=hexN(L.glow);
  /* machinery walls and holo signs behind the play plane */
  let x=150;const span=RW*.62+W+200;while(x<span){const i=Math.floor(r()*4),b=T.walls[i],top=GY+34-b.h;add(s.add.image(x,GY+34,'wl_'+t+i).setOrigin(0,1).setScrollFactor(.62,.05).setDepth(D.walls));
    for(const f of b.fans)V.fans.push(add(s.add.image(x+f.x,top+f.y,'fan_'+t).setScrollFactor(.62,.05).setDepth(D.walls).setScale(f.r/60)));
    for(const e of b.em)emissive(x+e.x,top+e.y,e,.62,D.walls);x+=700+r()*800}
  x=500;while(x<span){const txt=A.signs[Math.floor(r()*A.signs.length)],y=300+r()*220;
    const lab=add(s.add.text(x,y,txt,{fontFamily:FU,fontStyle:'700',fontSize:'30px',color:P.scr,backgroundColor:'rgba(5,6,12,.78)',padding:{x:22,y:9}}).setOrigin(.5).setScrollFactor(.62,.05).setDepth(D.signs));
    const bx=add(s.add.rectangle(x,y,lab.width,lab.height).setStrokeStyle(3,hexN(P.scr),.8).setScrollFactor(.62,.05).setDepth(D.signs));
    V.signs.push({lab,bx,s:r(),x,y,w:lab.width});x+=1200+r()*1400}
  /* tall shafts get a plated back wall */
  if(o.h>1){tiles(0,0,RW,RH,'wp_'+t,512,512,D.back,.9);
    for(const fx of[RW*.12,RW*.88])tiles(fx-17,0,34,RH,'pipev_'+t,34,512,D.back);add(s.add.rectangle(0,0,RW,RH,0,.3).setOrigin(0).setDepth(D.back))}
  /* machines standing on the floor */
  for(const p of o.props){const m=getMach(t,p.k,p.v);add(s.add.image(p.x,p.fy+4,m.key).setOrigin(.5,1).setDepth(D.props));for(const e of m.em)emissive(p.x-m.w/2+e.x,p.fy+4-m.h+e.y,e,1,D.props+.5)}
  /* ceiling lamps */
  for(const l of o.lamps){const alarm=l.k==='alarm',col=alarm?'#ff3d2a':P.acc2,c=hexN(col);
    add(s.add.rectangle(l.x,l.y0,4,l.y-l.y0,ink).setOrigin(.5,0).setDepth(D.lamps));add(s.add.image(l.x,l.y,'lamp_'+t).setOrigin(.5,0).setDepth(D.lamps));
    const o2={l,col};if(!alarm){o2.bulb=add(s.add.rectangle(l.x,l.y+26,56,6,0xfff6dc).setOrigin(.5,0).setDepth(D.lamps));
      o2.cone=add(s.add.image(l.x,l.y+30,'cone').setOrigin(.5,0).setBlendMode('ADD').setTint(c).setDepth(D.lamps+.5).setAlpha(.22));o2.cone.setDisplaySize(380,l.fy-(l.y+30));
      o2.pool=glowImg(l.x,l.fy+6,420,52,col,.35,D.lamps);o2.gl=glowImg(l.x,l.y+30,140,140,col,.8,D.lamps);if(A.weather==='rain')o2.wet=glowImg(l.x,l.fy+60,80,240,col,.25,D.solids+.2)}
    else{o2.bulb=add(s.add.circle(l.x,l.y+30,12,0x5a1a14).setDepth(D.lamps));o2.beam=add(s.add.image(l.x,l.y+30,'beam').setOrigin(.5,0).setBlendMode('ADD').setTint(c).setDepth(D.lamps+.5).setAlpha(.38).setVisible(false));
      o2.beam.setDisplaySize(200,(l.fy-l.y)*1.15);o2.gl=glowImg(l.x,l.y+30,120,120,col,.9,D.lamps).setVisible(false)}
    V.lamps.push(o2)}
  /* steam vent grates */
  for(const v of o.vents){add(s.add.rectangle(v.x,v.fy-6,80,8,ink).setOrigin(.5,0).setDepth(D.vents));for(let i=0;i<6;i++)add(s.add.rectangle(v.x-34+i*12,v.fy-5,6,5,0xffffff,.12).setOrigin(0).setDepth(D.vents))}
  /* floors, ledges and walls */
  for(const sd of o.solids){if(sd.k==='floor'||sd.k==='ledge'){const h=Math.min(sd.h,200);tiles(Math.max(sd.x,-200),sd.y,Math.min(sd.w,RW+400),h,'gt_'+t,512,200,D.solids);
      if(sd.h>200)add(s.add.rectangle(sd.x,sd.y+200,sd.w,sd.h-200,ink).setOrigin(0).setDepth(D.solids));
      add(s.add.rectangle(Math.max(sd.x,-200),sd.y-1,Math.min(sd.w,RW+400),3,gl,.45).setOrigin(0).setBlendMode('ADD').setDepth(D.solids+.5));
      if(sd.k==='ledge')add(s.add.rectangle(sd.x,sd.y+sd.h-6,sd.w,6,ink).setOrigin(0).setDepth(D.solids))}
    else{const y0=Math.max(sd.y,-300),h2=sd.y+sd.h-y0;tiles(sd.x,y0,sd.w,Math.min(h2,RH+300-y0),'wp_'+t,512,512,D.solids);add(s.add.rectangle(sd.x,sd.y,sd.w,sd.h,0,.35).setOrigin(0).setDepth(D.solids));
      if(sd.k==='wall')add(s.add.rectangle(sd.x<0?sd.x+sd.w-3:sd.x,sd.y,3,sd.h,gl,.35).setOrigin(0).setDepth(D.solids));else add(s.add.rectangle(sd.x,sd.y+sd.h-3,sd.w,3,gl,.35).setOrigin(0).setDepth(D.solids))}}
  if(A.conveyor){V.conv=add(s.add.container(0,FY).setDepth(D.solids+.2));for(let cx=-96;cx<RW+96;cx+=48)V.conv.add(s.add.image(cx,0,'conv_'+t).setOrigin(0))}
  /* catwalks with their hanging struts */
  const sg=add(s.add.graphics().setDepth(D.plats-.1));sg.lineStyle(4,ink,1);
  for(const p of o.plats){const top=Math.floor(p.y/H)*H;sg.lineBetween(p.x+20,p.y,p.x+20,top);sg.lineBetween(p.x+p.w-20,p.y,p.x+p.w-20,top);
    tiles(p.x,p.y-2,p.w,46,'pl_'+t,160,46,D.plats);if(p.iso)glowImg(p.x+p.w/2,p.y+10,p.w*1.2,40,'#ff5ad8',.25,D.plats)}
  /* hatches */
  for(const d of o.doors){const dx=d.side==='L'?0:RW,y=d.row*H+GY,bx=d.side==='L'?dx+4:dx-30,f=add(s.add.image(d.side==='L'?dx+29:dx-23,y-313,'dframe_'+t).setDepth(D.doors));
    const h=add(s.add.image(bx+13,y-300,'hatch').setOrigin(.5,0).setDepth(D.doors).setDisplaySize(32,300));const g=glowImg(bx+13,y-150,180,300,'#3d8bff',.45,D.doors);
    const sg=ROOMS[d.to].kind==='secret'?o.gates.find(q=>q.kind==='secret'):null;V.doors.push({d,h,g,f,bx,y,op:0,sg})}
  /* elevator */
  if(o.lift){const l=o.lift,x=l.x;add(s.add.image(x,FY+4,'lift_'+t).setOrigin(.5,1).setDepth(D.fixtures));
    add(s.add.image(x,FY-26,'vgrad').setOrigin(.5,1).setDisplaySize(180,394).setBlendMode('ADD').setTint(0x7fd8ff).setAlpha(.35).setDepth(D.fixtures+.5));glowImg(x,FY-20,280,60,'#7fd8ff',.5,D.fixtures);
    add(s.add.text(x,FY-450,(l.dir>0?'▼ ':'▲ ')+'ELEVATOR · '+LV[ROOMS[l.to].a].name.toUpperCase(),{fontFamily:FU,fontStyle:'700',fontSize:'26px',color:'#bff0ff'}).setOrigin(.5,1).setDepth(D.light+1));
    V.lift={bar:add(s.add.rectangle(x-80,FY-430,160,6,0x7fd8ff,.85).setOrigin(0,.5).setDepth(D.fixtures))}}
  /* ability shrine */
  const sh=o.shrine;if(sh&&sh.ab){const Ab=ABIL.find(q=>q.id===sh.ab);add(s.add.image(sh.x,GY,'shrine_'+t).setOrigin(.5,1).setDepth(D.fixtures));
    V.shrine={orb:glowImg(sh.x,GY-150,240,240,Ab.col,.75,D.fixtures),core:add(s.add.circle(sh.x,GY-150,18,0xffffff).setDepth(D.fixtures)),
      arcs:[0,1,2].map(i=>add(s.add.image(sh.x,GY-150,'arc').setTint(hexN(Ab.col)).setScale((28+i*10)/28).setDepth(D.fixtures))),ab:sh.ab,x:sh.x}}
  /* save station */
  const st=o.station;if(st){add(s.add.image(st.x,GY,'station_'+t).setOrigin(.5,1).setDepth(D.fixtures));
    V.station={col:add(s.add.image(st.x,GY-26,'vgrad').setOrigin(.5,1).setDisplaySize(88,188).setBlendMode('ADD').setTint(0x7dffb0).setDepth(D.fixtures+.5)),
      gl:glowImg(st.x,GY-30,180,40,'#7dffb0',.4,D.fixtures)};add(s.add.text(st.x,GY-244,'SAVE',{fontFamily:FU,fontStyle:'700',fontSize:'20px',color:'#7dffb0'}).setOrigin(.5,1).setDepth(D.light+1))}
  /* the hidden Starblood vault */
  if(o.kind==='secret'){const cx=RW*.5;glowImg(cx,GY-430,1000,760,'#ffe08a',.14,D.back);add(s.add.text(cx,GY-600,'✦',{fontFamily:FD,fontSize:'280px',color:'#ffe08a'}).setOrigin(.5).setAlpha(.16).setDepth(D.back+.5));
    add(s.add.text(cx,GY-330,'STARBLOOD VAULT',{fontFamily:FD,fontStyle:'700',fontSize:'34px',color:'#ffe08a'}).setOrigin(.5).setAlpha(.5).setDepth(D.back+.5));V.vault={x:cx}}
  /* ability gates */
  o.gates.forEach(g=>{if(g.broken)return;const x0=g.x-g.w/2,list=[],a2=q=>{list.push(q);return q};
    if(g.kind==='crack'){a2(s.add.image(x0,g.top,'g_crack_'+t).setOrigin(0).setDepth(D.fixtures));for(let y=g.top+120;y<GY;y+=210)a2(glowImg(x0+g.w*.45,y+40,60,60,'#ffd27a',.35,D.fixtures,list))}
    else if(g.kind==='ledge'){a2(s.add.image(x0,g.top,'g_ledge_'+t).setOrigin(0).setDepth(D.fixtures));a2(glowImg(g.x,g.top,120,120,'#7fe9ff',.4,D.fixtures,list))}
    else if(g.kind==='laser'){g.beams=[];a2(s.add.rectangle(x0-10,90,g.w+20,GY-180,0xff281e,.18).setOrigin(0).setBlendMode('ADD').setDepth(D.fixtures+.5));
      for(let i=0;i<5;i++)g.beams.push(a2(s.add.rectangle(x0+4+i*(g.w-8)/4,90,6,GY-180,Phaser.Display.Color.GetColor(255,70+i*25,60+i*10)).setOrigin(.5,0).setBlendMode('ADD').setDepth(D.fixtures+.5)));
      g.scan=a2(s.add.rectangle(x0-10,90,g.w+20,4,0xffc8b4,.7).setOrigin(0).setBlendMode('ADD').setDepth(D.fixtures+.5));
      for(const ey of[0,GY-90])a2(s.add.image(x0-24,ey,'g_lcap_'+t).setOrigin(0).setDepth(D.fixtures));a2(glowImg(g.x,GY/2,360,GY*.84,'#ff3d3d',.45,D.fixtures,list))}
    else if(g.kind==='blast'){a2(s.add.image(x0,0,'g_blast_'+t).setOrigin(0).setDepth(D.fixtures));g.lamps=[];for(let y=120;y<GY;y+=160)g.lamps.push(a2(glowImg(g.x,y+8,52,52,'#ff3d2a',.7,D.fixtures,list)));
      a2(s.add.image(g.plate,GY,'g_plate_'+t).setOrigin(.5,1).setDepth(D.fixtures));g.pg=a2(glowImg(g.plate,GY-8,140,32,'#ffb347',.5,D.fixtures,list))}
    else if(g.kind==='secret'){const hh=g.bot-g.top;g.img=a2(s.add.image(x0,g.top,'wp_'+t).setOrigin(0).setCrop(0,0,g.w,hh).setDepth(D.doors+.8));a2(s.add.rectangle(x0,g.top,g.w,hh,0,.35).setOrigin(0).setDepth(D.doors+.8));
      const cr=a2(s.add.graphics().setDepth(D.doors+.8));cr.lineStyle(3,0x000000,.55);cr.beginPath();cr.moveTo(x0+g.w*.7,g.top+40);cr.lineTo(x0+g.w*.5,g.top+110);cr.lineTo(x0+g.w*.62,g.top+160);cr.lineTo(x0+g.w*.42,g.top+240);cr.strokePath();
      cr.lineStyle(2,0xffffff,.1);cr.lineBetween(x0+g.w*.5,g.top+112,x0+g.w*.3,g.top+140);a2(s.add.rectangle(x0+g.w-3,g.top,3,hh,gl,.35).setOrigin(0).setDepth(D.doors+.8))}
    else{g.img=a2(s.add.image(x0-20,0,'g_crystal_'+t).setOrigin(0).setDepth(D.fixtures));g.cg=a2(glowImg(g.x,GY/2,280,GY*.9,'#ff5ad8',.35,D.fixtures,list))}
    for(const q of list)if(V.rm.indexOf(q)<0)V.rm.push(q);V.gateV.push({g,list})});
  o.cages.forEach(c=>{if(c.broken)return;const x0=c.x-70,y0=GY-170,list=[],a2=q=>{list.push(q);V.rm.push(q);return q};
    if(c.kind==='laser'){c.beams=[];for(let i=0;i<6;i++)c.beams.push(a2(s.add.rectangle(x0+10+i*24,y0,4,170,0xff463c,.5).setOrigin(0).setBlendMode('ADD').setDepth(D.fixtures+.5)));a2(s.add.image(c.x,y0,'c_lcap_'+t).setOrigin(.5,1).setDepth(D.fixtures))}
    else if(c.kind==='crack')a2(s.add.image(c.x,GY,'c_crack_'+t).setOrigin(.5,1).setDepth(D.fixtures));
    else if(c.kind==='slam'){a2(s.add.image(c.x,GY,'c_slam_'+t).setOrigin(.5,1).setDepth(D.fixtures));a2(glowImg(c.x,y0+34,80,80,'#ffb347',.5,D.fixtures,[]))}
    else a2(s.add.image(c.x,GY,'c_plasma_'+t).setOrigin(.5,1).setDepth(D.fixtures));V.cageV.push({c,list})});
  /* braced columns that sweep past in front */
  x=1800;const cspan=RW*1.55+W;while(x<cspan){V.cols.push(add(s.add.image(x,0,'fgcol_'+t).setOrigin(0).setScrollFactor(1.55,0).setDepth(D.fg).setAlpha(.85)));x+=3000+r()*1800}
  /* static room objects outside the view are skipped by the camera (cameraFilter), so the renderer never touches them */
  V.cull=[];for(const q of V.rm){if(!q.getBounds||q.type==='Graphics'||q.scrollFactorX!==1)continue;const b=q.getBounds();V.cull.push(q,b.x,b.y,b.right,b.bottom)}
  if(V.lastT&&V.lastT!==t)freeTheme(V.lastT);V.lastT=t};
function cullRoom(){const C=V.cull;if(!C)return;const id=SC.cameras.main.id,x0=cam-160,x1=cam+W+160,y0=camY-160,y1=camY+H+160;
  for(let i=0;i<C.length;i+=5){const o=C[i];if(C[i+3]>x0&&C[i+1]<x1&&C[i+4]>y0&&C[i+2]<y1)o.cameraFilter&=~id;else o.cameraFilter|=id}}
function C_dirty(){}

/* ---- per-frame updates for the backdrop and the room ---- */
function bgUpdate(dt){if(V.bgW!==W){buildBG(G.lv);if(ROOM)V.room(ROOM)}const L=LV[G.lv],A=AMB[L.theme],vy=-Math.min(140,camY*.06);
  V.sky.x=-60-Math.min(260,cam*.02);V.sky.y=-60+vy*.3+(A.heat?Math.sin(lvT*2.2)*2:0);
  for(const c of V.clouds)c.setPosition(((c.d.x-cam*.06-lvT*c.d.v)%3200+3200)%3200-400,c.d.y+vy*.4);
  for(const r of V.rays){r.setPosition(((r.d.x-cam*.08)%2600+2600)%2600-150+Math.sin(lvT*.25+r.d.ph)*20,vy*.4);r.setAlpha(r.d.a*(.75+.25*Math.sin(lvT*.6+r.d.ph)))}
  for(const sh of V.ships){const d=sh.d,span=W+900,x=((d.x+lvT*d.v-cam*.06)%span+span)%span-450,y=d.y+Math.sin(lvT*.7+d.s*9)*10+vy*.4,dir=Math.sign(d.v);sh.setPosition(x,y);d.gl.setPosition(x-dir*92*d.sc,y+2*d.sc)}
  for(const b of V.search)b.setRotation(Math.PI+Math.sin(lvT*.35+b.ph)*.55).setY(GY-40+vy);
  stripAt(V.far,cam*.12,vy);V.fog.y=GY-340+vy;stripAt(V.mid,cam*.35,vy*1.3);
  stripAt(V.fgb,cam*1.3,H-300+(Math.max(0,RH-H)-camY)*1.3);stripAt(V.fgt,cam*1.35,-camY*1.35);
  for(const f of V.fogs)f.setPosition(((f.d.x-cam*.9-lvT*f.d.v)%3400+3400)%3400-500,f.d.y-camY*.9);
  if(V.splash&&ROOM&&FY>camY&&FY<camY+H+50&&Math.random()<.8)for(let i=0;i<(AMB[L.theme].heavy?3:1);i++)V.splash.emitParticleAt(cam+Math.random()*W,FY-2);
  if(V.conv)V.conv.x=-((lvT*120)%48)}
function roomUpdate(dt){if(!ROOM)return;const o=ROOM,P=PAL[LV[G.lv].theme];cullRoom();
  for(const f of V.fans)f.rotation+=dt*5;
  for(const g of V.ems){const e=g.e,p=e.blink?(Math.sin(lvT*3+g.bx*.01+e.x)>-.3?1:.25):(.8+.2*Math.sin(lvT*2+e.y));g.setAlpha(e.a*p);lightW(g.bx,g.by,e.r*2.4+40,Math.min(1,e.a*1.3*p))}
  for(const g of V.wems){const e=g.e,p=e.blink?(Math.sin(lvT*3+g.bx*.01+e.x)>-.3?1:.25):(.8+.2*Math.sin(lvT*2+e.y));g.setAlpha(e.a*p);const sx=g.bx-cam*.62;if(sx>-100&&sx<W+100)lightS(sx,g.by-camY*.05,e.r*1.8,e.a*p)}
  for(const s of V.signs){const on=Math.sin(lvT*13+s.s*50)>-.92||Math.sin(lvT*.7+s.s*9)>.2;s.lab.setAlpha(on?1:.3);s.bx.setAlpha(on?1:.35);const sx=s.x-cam*.62;if(on&&sx>-200&&sx<W+200)lightS(sx,s.y-camY*.05,s.w,.35)}
  for(const q of V.lamps){const l=q.l;if(l.fy<camY-60||l.y0>camY+H+60)continue;
    if(l.k==='alarm'){const v=lock;q.beam.setVisible(v);q.gl.setVisible(v);q.bulb.fillColor=v?0xff5a3a:0x5a1a14;if(v){const dx=Math.cos(lvT*5+l.s*6);q.beam.setRotation(-Math.atan2(dx*420,l.fy-l.y));lightW(l.x+dx*300,l.fy-120,320,.7);lightW(l.x,l.y+30,160,.8)}continue}
    let on=1;if(l.k==='broken'){on=Math.sin(lvT*23+l.s*40)*Math.sin(lvT*7.3+l.s*9)>-.15?1:0;if(!on&&Math.random()<.25)part(l.x+(Math.random()-.5)*30,l.y+26,(Math.random()-.5)*260,Math.random()*120,.5,'#ffd27a',4,1500)}
    q.cone.setVisible(!!on);q.pool.setVisible(!!on);q.gl.setVisible(!!on);if(q.wet)q.wet.setVisible(!!on);q.bulb.fillColor=on?0xfff6dc:0x4a4436;if(on){lightW(l.x,l.y+40,300,.9);lightW(l.x,l.fy-40,330,.75)}}
  for(const q of V.doors){if(q.sg){const hid=!q.sg.broken;if(q.hid!==hid){q.hid=hid;for(const k of[q.h,q.g,q.f])k.setVisible(!hid)}if(hid)continue}const d=q.d,x=d.side==='L'?0:RW,near=pl&&Math.abs(pl.x-x)<420&&Math.abs(pl.y-q.y)<200,open=!lock&&near;q.op+=((open?1:0)-q.op)*Math.min(1,dt*12);
    q.h.setDisplaySize(32,Math.max(8,300*(1-q.op*.92)));const col=lock?0xff3d3d:0x3d8bff;q.h.setTint(col);q.g.setTint(col);lightW(q.bx+13,q.y-150,220,.6)}
  if(o.lift&&V.lift){lightW(o.lift.x,FY-160,320,.8);V.lift.bar.setVisible((o.lift.hold||0)>0).setScale(Math.min(1,(o.lift.hold||0)/1.1),1)}
  if(V.shrine){const q=V.shrine,got=hasAb(q.ab)||!gDone(ROOM.a),y=GY-150+Math.sin(lvT*2.5)*10;for(const k of[q.orb,q.core,...q.arcs])k.setVisible(!got).setY(y);q.arcs.forEach((a,i)=>a.setRotation(lvT*2+i));if(!got)lightW(q.x,y,320,.9)}
  if(V.vault)lightW(V.vault.x,GY-420,760,.65);
  if(V.station){const st=o.station,on=st.t>0;V.station.col.setAlpha(on?.55:.3);V.station.gl.setAlpha(on?.7:.4);lightW(st.x,GY-120,260,.7)}
  for(const q of V.gateV){const g=q.g;if(g.broken){if(q.list.length)vKill(q.list);continue}
    if(g.kind==='laser'){g.beams.forEach((b,i)=>b.setAlpha(.45+.35*Math.sin(lvT*22+i*1.7)));g.scan.y=90+((lvT*700)%(GY-180));lightW(g.x,GY/2,340,.95)}
    else if(g.kind==='blast'){g.lamps.forEach((b,i)=>b.setAlpha(Math.sin(lvT*4+i)>0?.8:.3));g.pg.setAlpha(.4+.2*Math.sin(lvT*4))}
    else if(g.kind==='secret'){g.flash=(g.flash||0)-dt;if(g.flash>0)g.img.setTintFill(0xffffff);else if(g.img.isTinted)g.img.clearTint()}
    else if(g.kind==='crystal'){g.cg.setAlpha(.3+.1*Math.sin(lvT*3));g.flash=(g.flash||0)-dt;if(g.img){if(g.flash>0)g.img.setTintFill(0xffffff);else g.img.clearTint()}lightW(g.x,GY/2,220,.6)}}
  for(const q of V.cageV){const c=q.c;if(c.broken){if(q.list.length)vKill(q.list);continue}if(c.kind==='laser')c.beams.forEach((b,i)=>b.setAlpha(.35+.2*Math.sin(lvT*18+i)))}
  const xs=[];if(pl)xs.push(pl.x-cam);for(const e of en)xs.push(e.x-cam);if(boss&&!boss.dead)xs.push(boss.x-cam);
  for(const c of V.cols){const x=c.x-cam*1.55+20,w=96,near=xs.some(sx=>Math.abs(x+w/2-sx)<w/2+110);c.setAlpha(c.alpha+((near?.22:.85)-c.alpha)*Math.min(1,dt*12))}}
V.steam=function(dt){if(!ROOM)return;for(const v of ROOM.vents){v.t-=dt;if(v.on>0){v.on-=dt;if(Math.random()<.7)part(v.x+(Math.random()-.5)*50,v.fy-8,(Math.random()-.5)*60,-260-Math.random()*160,1,'rgba(200,215,235,.3)',30+Math.random()*24,-60,'norm');lightW(v.x,v.fy-80,160,.25)}
  else if(v.t<=0){v.on=.8;v.t=3+Math.random()*4;if(pl&&Math.abs(v.x-pl.x)<1100)sfxVent(v.x)}}};
</script>
