<script>
"use strict";
/* ---------- world, part 3: drawing rooms, doors, lifts, gates, map ---------- */
let wallPat=null,wallPatA=-1;
function wallPattern(){if(wallPat&&wallPatA===G.lv)return wallPat;const P=PAL[LV[G.lv].theme],c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const D={light:shade(P.light,-.55),metal:shade(P.alt,-.45),dark:P.ink};for(let y=0;y<256;y+=128)for(let x=0;x<256;x+=128)plate(g,x+2,y+2,124,124,P,{c:16,m:D,rivets:1,seams:1});
  wallPat=X.createPattern(c,'repeat');wallPatA=G.lv;return wallPat}
function bakePlat(){const P=PAL[LV[G.lv].theme],c=document.createElement('canvas');c.width=160;c.height=46;const g=c.getContext('2d'),A={light:P.light,metal:P.alt,dark:P.ink};
  plate(g,0,0,160,20,P,{c:4,m:A});hazard(g,4,4,152,5);g.strokeStyle=P.ink;g.lineWidth=5;g.beginPath();g.moveTo(6,20);g.lineTo(40,44);g.lineTo(80,20);g.lineTo(120,44);g.lineTo(154,20);g.stroke();
  g.fillStyle=P.ink;g.fillRect(0,40,160,6);platB=c}
function drawRoomBack(){const o=ROOM;if(!o||o.h<2)return;X.save();X.globalAlpha=.86;X.fillStyle=wallPattern();X.fillRect(0,camY-20,RW,H+40);X.restore();
  const P=PAL[LV[G.lv].theme];for(const fx of[RW*.12,RW*.88]){pipeV(X,fx,camY-20,H+40,26,P,{light:shade(P.light,-.5),metal:shade(P.alt,-.4),dark:P.ink})}
  X.fillStyle='rgba(0,0,0,.25)';X.fillRect(0,camY-20,RW,H+40)}
function drawSolids(){const o=ROOM,L=bg.L,tilePat=bg.tilePat||(bg.tilePat=X.createPattern(bg.tile,'repeat'));
  for(const s of o.solids){if(s.x>cam+W||s.x+s.w<cam||s.y>camY+H||s.y+s.h<camY)continue;
    if(s.k==='floor'||s.k==='ledge'){X.save();X.translate(0,s.y);X.fillStyle=tilePat;X.fillRect(Math.max(s.x,cam-10),0,Math.min(s.w,W+20),Math.min(s.h,H));X.restore();
      X.save();X.globalCompositeOperation='lighter';X.fillStyle=rgba(L.glow,.45);X.fillRect(Math.max(s.x,cam-10),s.y-1,Math.min(s.w,W+20),3);X.restore();
      if(s.k==='ledge'){X.fillStyle=PAL[L.theme].ink;X.fillRect(s.x,s.y+s.h-6,s.w,6)}}
    else{X.fillStyle=wallPattern();const y0=Math.max(s.y,camY-10),y1=Math.min(s.y+s.h,camY+H+10);X.fillRect(s.x,y0,s.w,y1-y0);X.fillStyle='rgba(0,0,0,.35)';X.fillRect(s.x,y0,s.w,y1-y0);
      X.fillStyle=rgba(L.glow,.35);if(s.k==='wall')X.fillRect(s.x<0?s.x+s.w-3:s.x,y0,3,y1-y0);else X.fillRect(s.x,s.y+s.h-3,s.w,3)}}}
function drawDoors(){const o=ROOM,P=PAL[LV[G.lv].theme];
  for(const d of o.doors){const x=d.side==='L'?0:RW,y=d.row*H+GY,near=Math.abs(pl.x-x)<420&&Math.abs(pl.y-y)<200,open=!lock&&near,dir=d.side==='L'?1:-1;
    d.op=(d.op||0)+((open?1:0)-(d.op||0))*.2;const hx=x+dir*14,hh=300*(1-d.op*.92);
    plate(X,x-(d.side==='L'?6:58)+(d.side==='L'?0:0),y-330,64,30,P,{c:6,m:{light:P.light,metal:P.alt,dark:P.ink}});
    const col=lock?'#ff3d3d':'#3d8bff',col2=lock?'#ffb0a0':'#bfe0ff';
    X.fillStyle=col;X.strokeStyle=INK;X.lineWidth=4;const bx=d.side==='L'?x+4:x-30;X.beginPath();X.ellipse(bx+13,y-300+hh/2,16,hh/2,0,0,7);X.fill();X.stroke();
    X.fillStyle=col2;X.fillRect(bx+8,y-300+8,5,Math.max(0,hh-16));glow(bx+13,y-150,90,col,.45,150);lightW(bx+13,y-150,220,.6)}}
function drawLift(){const l=ROOM.lift;if(!l)return;const P=PAL[LV[G.lv].theme],x=l.x,y=FY;plate(X,x-110,y-26,220,30,P,{c:8,m:{light:'#e8f4ff',metal:'#7fa0c8',dark:P.ink}});
  X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(0,y-420,0,y-26);g.addColorStop(0,'rgba(127,216,255,0)');g.addColorStop(1,'rgba(127,216,255,.35)');X.fillStyle=g;X.fillRect(x-90,y-420,180,394);X.restore();
  glow(x,y-20,140,'#7fd8ff',.5,30);lightW(x,y-160,320,.8);const hold=l.hold||0;
  X.textAlign='center';X.font=`700 26px ${FU}`;X.fillStyle='#bff0ff';X.fillText((l.dir>0?'▼ ':'▲ ')+'ELEVATOR · '+LV[ROOMS[l.to].a].name.toUpperCase(),x,y-450);
  if(hold>0){X.fillStyle='rgba(127,216,255,.8)';X.fillRect(x-80,y-430,160*Math.min(1,hold/1.1),6)}}
function drawPlats(){const o=ROOM;if(!platB)bakePlat();for(const s of o.plats){if(s.x>cam+W+60||s.x+s.w<cam-60||s.y<camY-60||s.y>camY+H+60)continue;
    const top=Math.floor(s.y/H)*H;X.strokeStyle=PAL[LV[G.lv].theme].ink;X.lineWidth=4;X.beginPath();X.moveTo(s.x+20,s.y);X.lineTo(s.x+20,top);X.moveTo(s.x+s.w-20,s.y);X.lineTo(s.x+s.w-20,top);X.stroke();
    for(let x=0;x<s.w;x+=160){const w=Math.min(160,s.w-x);X.drawImage(platB,0,0,w,46,s.x+x,s.y-2,w,46)}if(s.iso)glow(s.x+s.w/2,s.y+10,s.w*.6,'#ff5ad8',.25,20);lightW(s.x+s.w/2,s.y+30,s.w*.6,.25)}}
function drawFixtures(){const o=ROOM,P=PAL[LV[G.lv].theme],M={light:P.light,metal:P.alt,dark:P.ink};
  const sh=o.shrine;if(sh&&sh.ab){const A=ABIL.find(a=>a.id===sh.ab),got=hasAb(sh.ab);plate(X,sh.x-60,GY-40,120,40,P,{c:8,m:M});plate(X,sh.x-40,GY-60,80,24,P,{c:6});
    if(!got){const y=GY-150+Math.sin(lvT*2.5)*10;glow(sh.x,y,120,A.col,.75);X.fillStyle='#ffffff';X.beginPath();X.arc(sh.x,y,18,0,7);X.fill();
      X.strokeStyle=A.col;X.lineWidth=4;for(let i=0;i<3;i++){X.beginPath();X.arc(sh.x,y,28+i*10,lvT*2+i,lvT*2+i+2.2);X.stroke()}lightW(sh.x,y,320,.9)}}
  const st=o.station;if(st){const on=st.t>0;plate(X,st.x-70,GY-26,140,26,P,{c:6,m:M});for(const sx of[-56,44])plate(X,st.x+sx,GY-220,12,196,P,{c:3,m:M});plate(X,st.x-66,GY-236,132,22,P,{c:6});
    X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(0,GY-214,0,GY-26);g.addColorStop(0,'rgba(125,255,176,.05)');g.addColorStop(1,`rgba(125,255,176,${on?.5:.25})`);X.fillStyle=g;X.fillRect(st.x-44,GY-214,88,188);
    X.restore();glow(st.x,GY-30,90,'#7dffb0',on?.7:.4,20);X.fillStyle='#7dffb0';X.textAlign='center';X.font=`700 20px ${FU}`;X.fillText('SAVE',st.x,GY-244);lightW(st.x,GY-120,260,.7)}
  for(const g of o.gates){if(g.broken)continue;const x0=g.x-g.w/2,h=GY-g.top;
    if(g.kind==='crack'||g.kind==='ledge'){plate(X,x0,g.top,g.w,h,P,{c:12,seams:Math.floor(h/120),rivets:1});X.strokeStyle='rgba(0,0,0,.6)';X.lineWidth=4;
      if(g.kind==='crack')for(let y=g.top+120;y<GY;y+=210){X.beginPath();X.moveTo(x0+10,y);X.lineTo(x0+g.w*.45,y+40);X.lineTo(x0+g.w*.3,y+90);X.lineTo(x0+g.w-8,y+130);X.stroke();glow(x0+g.w*.45,y+40,30,'#ffd27a',.35)}
      else{hazard(X,x0,g.top,g.w,16);glow(g.x,g.top,60,'#7fe9ff',.4)}}
    else if(g.kind==='laser'){for(const ey of[0,GY-90]){plate(X,x0-24,ey,g.w+48,90,P,{c:10,rivets:1});hazard(X,x0-14,ey+(ey?8:66),g.w+28,14)}X.save();X.globalCompositeOperation='lighter';
      X.fillStyle='rgba(255,40,30,.18)';X.fillRect(x0-10,90,g.w+20,GY-180);for(let i=0;i<5;i++){const a=.45+.35*Math.sin(lvT*22+i*1.7);X.fillStyle=`rgba(255,${70+i*25},${60+i*10},${a})`;X.fillRect(x0+4+i*(g.w-8)/4-3,90,6,GY-180)}
      const sy=90+((lvT*700)%(GY-180));X.fillStyle='rgba(255,200,180,.7)';X.fillRect(x0-10,sy,g.w+20,4);X.restore();lightW(g.x,GY/2,340,.95);glow(g.x,GY/2,180,'#ff3d3d',.45,GY*.42)}
    else if(g.kind==='blast'){plate(X,x0,0,g.w,GY,P,{c:10,seams:6,rivets:1});X.fillStyle='#ff3d2a';for(let y=120;y<GY;y+=160){X.fillRect(g.x-8,y,16,16);glow(g.x,y+8,26,'#ff3d2a',.7)}
      plate(X,g.plate-60,GY-12,120,12,P,{c:4,m:{light:'#ffd27a',metal:'#c88a1a',dark:'#5a3a0a'}});glow(g.plate,GY-8,70,'#ffb347',.4+.2*Math.sin(lvT*4),16)}
    else{X.fillStyle='#2a0c2e';X.beginPath();X.moveTo(x0,GY);for(let y=GY;y>0;y-=90)X.lineTo(x0+((y/90)%2?18:-6),y);X.lineTo(x0+g.w,0);for(let y=0;y<GY;y+=90)X.lineTo(x0+g.w+((y/90)%2?-18:6),y);X.closePath();X.fill();
      X.strokeStyle='#ff5ad8';X.lineWidth=3;X.stroke();glow(g.x,GY/2,140,'#ff5ad8',.3+.1*Math.sin(lvT*3),GY*.45);lightW(g.x,GY/2,220,.6)}}
  for(const c of o.cages){if(c.broken)continue;const x0=c.x-70,y0=GY-170;
    if(c.kind==='laser'){X.save();X.globalCompositeOperation='lighter';for(let i=0;i<6;i++){X.fillStyle=`rgba(255,70,60,${.35+.2*Math.sin(lvT*18+i)})`;X.fillRect(x0+10+i*24,y0,4,170)}X.restore();plate(X,x0,y0-16,140,16,P,{c:4})}
    else if(c.kind==='crack'){X.globalAlpha=.88;plate(X,x0,y0,140,170,P,{c:14,seams:1});X.globalAlpha=1;X.strokeStyle='rgba(0,0,0,.6)';X.lineWidth=4;X.beginPath();X.moveTo(x0+20,y0+30);X.lineTo(x0+70,y0+80);X.lineTo(x0+50,y0+120);X.lineTo(x0+120,y0+160);X.stroke()}
    else if(c.kind==='slam'){plate(X,x0,y0+40,140,130,P,{c:40,rivets:1});X.fillStyle='#ffb347';X.fillRect(c.x-30,y0+30,60,10);glow(c.x,y0+34,40,'#ffb347',.5)}
    else{X.fillStyle='rgba(60,10,70,.85)';X.beginPath();X.moveTo(x0,GY);X.lineTo(x0+20,y0);X.lineTo(c.x,y0-30);X.lineTo(x0+120,y0);X.lineTo(x0+140,GY);X.fill();X.strokeStyle='#ff5ad8';X.lineWidth=3;X.stroke()}}}
function drawGeo(){if(!ROOM)return;drawPlats();drawFixtures();drawLift();drawDoors()}

/* ---- the map: explored rooms on a pink grid, Super Metroid style ---- */
function drawAreaMap(g,a,ox,oy,cs,opt){opt=opt||{};const rooms=AREAS[a];
  for(const o of rooms){if(!META.map[o.id])continue;const x=ox+o.gx*cs,y=oy+o.gy*cs,w=o.w*cs,h=o.h*cs;
    g.fillStyle=o.kind==='save'?'#2a8a5a':o.kind==='boss'?'#8a1a3a':'#a8327a';g.fillRect(x+1,y+1,w-2,h-2);
    g.strokeStyle='rgba(255,200,240,.35)';g.lineWidth=1;for(let i=1;i<o.w;i++){g.beginPath();g.moveTo(x+i*cs,y+2);g.lineTo(x+i*cs,y+h-2);g.stroke()}for(let i=1;i<o.h;i++){g.beginPath();g.moveTo(x+2,y+i*cs);g.lineTo(x+w-2,y+i*cs);g.stroke()}
    g.strokeStyle='#ffd0f0';g.lineWidth=Math.max(2,cs*.07);g.strokeRect(x+1,y+1,w-2,h-2);
    for(const d of o.doors){const dy=y+d.row*cs+cs*.55;g.fillStyle='#ffe08a';g.fillRect(d.side==='L'?x-2:x+w-3,dy-cs*.14,5,cs*.28)}
    const ic=(t,col,ix)=>{g.fillStyle=col;g.font=`700 ${Math.round(cs*.5)}px ${FU}`;g.textAlign='center';g.fillText(t,x+(ix||w/2),y+cs*.68)};
    if(o.kind==='save')ic('S','#c8ffe0');if(o.lift)ic(o.lift.dir>0?'▼':'▲','#bff0ff');if(o.kind==='boss')ic('☠','#ffd0dc');
    if(o.shrine&&o.shrine.ab&&!hasAb(o.shrine.ab))ic('★','#ffe08a');
    genRoom(o);for(const it of o.items){if(!it.id||(it.type==='tank'?META.tanks[it.id]:META.items[it.id]))continue;g.fillStyle=it.type==='tank'?'#ff9ae8':'#ffe08a';g.beginPath();g.arc(x+it.x/o.RW*w,y+cs*.3,Math.max(2.5,cs*.1),0,7);g.fill()}}
  if(opt.me&&ROOM&&ROOM.a===a){const o=ROOM,px=ox+o.gx*cs+pl.x/o.RW*o.w*cs,py=oy+o.gy*cs+Math.min(o.h-.2,pl.y/H)*cs;if(Math.floor(lvT*3)%2){g.fillStyle='#ffffff';g.beginPath();g.arc(px,py-cs*.15,Math.max(3,cs*.13),0,7);g.fill()}}}
function drawMinimap(){if(!ROOM)return;const cs=40,cols=7,rows=3,mw=cols*cs,mh=rows*cs,mx=W/2-mw/2,my=56,o=ROOM;
  const cx=o.gx+Math.min(o.w-1,Math.floor(pl.x/CW)),cy=o.gy+Math.min(o.h-1,Math.floor(pl.y/H));
  X.save();X.fillStyle='rgba(5,4,12,.72)';X.fillRect(mx-4,my-4,mw+8,mh+8);X.beginPath();X.rect(mx,my,mw,mh);X.clip();
  X.strokeStyle='rgba(120,200,255,.12)';X.lineWidth=1;for(let i=0;i<=cols;i++){X.beginPath();X.moveTo(mx+i*cs,my);X.lineTo(mx+i*cs,my+mh);X.stroke()}for(let i=0;i<=rows;i++){X.beginPath();X.moveTo(mx,my+i*cs);X.lineTo(mx+mw,my+i*cs);X.stroke()}
  drawAreaMap(X,o.a,mx+(Math.floor(cols/2)-cx)*cs,my+(1-cy)*cs,cs,{me:1});X.restore();X.strokeStyle='rgba(236,231,255,.35)';X.lineWidth=2;X.strokeRect(mx-4,my-4,mw+8,mh+8)}
function mapCardHTML(){return`<canvas id="mapc" width="1100" height="520" style="width:auto;height:auto;max-width:100%;max-height:min(44vh,300px);background:#0a0814;border:1px solid rgba(180,140,255,.35)"></canvas>`}
function paintMapCard(){const c=document.getElementById('mapc');if(!c)return;const g=c.getContext('2d'),a=G.lv,rooms=AREAS[a];let mw=0,mh=0;for(const o of rooms){mw=Math.max(mw,o.gx+o.w);mh=Math.max(mh,o.gy+o.h)}
  const cs=Math.min((c.width-80)/mw,(c.height-90)/mh),ox=(c.width-mw*cs)/2,oy=60;g.fillStyle='#0a0814';g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(120,200,255,.1)';g.lineWidth=1;for(let i=0;i<=mw;i++){g.beginPath();g.moveTo(ox+i*cs,oy);g.lineTo(ox+i*cs,oy+mh*cs);g.stroke()}for(let i=0;i<=mh;i++){g.beginPath();g.moveTo(ox,oy+i*cs);g.lineTo(ox+mw*cs,oy+i*cs);g.stroke()}
  drawAreaMap(g,a,ox,oy,cs,{me:1});g.fillStyle='#ece7ff';g.font=`700 30px ${FD}`;g.textAlign='left';g.fillText(LV[a].name.toUpperCase(),24,40);
  const t=[0,1].filter(k=>META.tanks[a+'-'+k]).length;g.textAlign='right';g.font=`600 22px ${FU}`;g.fillStyle='#ff9ae8';g.fillText(`Energy Tanks ${t}/2`,c.width-24,40)}
function abilitiesHTML(){return `<div class="keys">${ABIL.map(a=>`<kbd style="color:${hasAb(a.id)?a.col:'#55507a'}">${hasAb(a.id)?'◆':'◇'} ${a.name}</kbd><span>${hasAb(a.id)?a.how:'Not found yet'}</span>`).join('')}
  <kbd style="color:#ff5ad8">Energy Tanks</kbd><span>${tankCount()} of 12 found · max health ${maxHP()}</span></div>`}
</script>
