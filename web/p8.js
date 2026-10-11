<script>
"use strict";
/* ---------- Metroid-style layer: catwalk platforms, abilities + gates, energy tanks, save stations, lockdowns, minimap ---------- */
const ABIL=[
 {id:'dash',  name:'Comet Dash',     how:'Tap » to dash. Dash into cracked walls to smash them.',col:'#b48cff',gate:'crack'},
 {id:'double',name:'Sky Scales',     how:'Tap jump again in the air to double jump.',col:'#7fe9ff',gate:'ledge'},
 {id:'roar',  name:'Starburst Roar', how:'Tap ✦ when its ring is full. The roar melts laser gates.',col:'#5ce1ff',gate:'laser'},
 {id:'slam',  name:'Ground Slam',    how:'In the air, pull the stick down and strike. Slam the plate to open blast doors.',col:'#ffb347',gate:'blast'},
 {id:'plasma',name:'Plasma Claws',   how:'Your claws burn hotter. Claw void-crystal walls to break them.',col:'#ff5ad8',gate:'crystal'}];
const GATEHINT={crack:'Cracked wall. A dash could smash it.',ledge:'Too high to climb. Maybe with a double jump?',laser:'Laser gate. Only a Starburst roar melts it.',
  blast:'Blast door. The plate needs a Ground Slam.',crystal:'Void crystal. Claws bounce off it.'};
let META={ab:{},tanks:{}};try{const m=JSON.parse(localStorage.getItem('aetherfall_meta')||'null');if(m&&m.ab)META=m}catch(e){}
function saveMeta(){try{localStorage.setItem('aetherfall_meta',JSON.stringify(META))}catch(e){}}
const hasAb=id=>!!META.ab[id];
const tankCount=()=>Object.keys(META.tanks).length;
const maxHP=()=>100+15*tankCount();
function grantUpTo(i){for(let k=0;k<Math.min(i,ABIL.length);k++)META.ab[ABIL[k].id]=1;saveMeta()}
let GEO={plats:[],gates:[],cages:[],stations:[],shrine:null},hintT=0,platB=null;
PICK.tank={name:'Energy Tank',col:'#ff5ad8',txt:'Energy Tank: +15 max HP'};

function mkGate(kind,x){const g={kind,x,broken:0};if(kind==='crack'){g.w=80;g.top=0}else if(kind==='ledge'){g.w=150;g.top=GY-330}else if(kind==='laser'){g.w=46;g.top=0}
  else if(kind==='blast'){g.w=90;g.top=0;g.plate=x-300}else{g.w=96;g.top=0;g.hp=4}return g}
function buildGeo(L,i){const r=rng(L.len*41+i*7+3),g={plats:[],gates:[],cages:[],stations:[],shrine:null},T=L.trig;
  const gx=i<5?Math.round((T[1]+T[2])/2+160):null,sx=Math.round((T[0]+T[1])/2);
  const TD=[['high','laser'],['crack','slam'],['high','plasma'],['laser','high'],['slam','plasma'],['crack','high']][i];
  const tx=[Math.round(L.len*.36),Math.round(L.len*.74)];
  const clear=x=>(gx==null||Math.abs(x-gx)>460)&&Math.abs(x-sx)>260&&tx.every((t,k)=>TD[k]!=='high'||Math.abs(x-t)>560)&&x<(L.boss?L.len-W-500:L.len-500);
  let x=760;while(x<L.len-600){if(clear(x)){const tiers=1+Math.floor(r()*3);let px=x;
      for(let t=0;t<tiers;t++){const w=240+Math.floor(r()*3)*80;g.plats.push({x:Math.round(px),y:GY-190-t*170,w});px+=(r()<.5?-1:1)*(130+r()*70)}}
    x+=700+r()*600}
  if(i<5){g.shrine={x:sx,ab:ABIL[i].id};g.gates.push(mkGate(ABIL[i].gate,gx));if(ABIL[i].gate==='laser')picks.push({x:gx-320,y:GY-80,type:'shard',float:1},{x:gx-420,y:GY-80,type:'shard',float:1})}
  TD.forEach((kind,k)=>{const id=i+'-'+k,t=tx[k];if(META.tanks[id])return;
    if(kind==='high'){const py=GY-410;g.plats.push({x:t-130,y:py,w:260,iso:1});picks.push({x:t,y:py-70,type:'tank',id,float:1})}
    else{const c={x:t,kind,hp:kind==='plasma'?3:1,broken:0};g.cages.push(c);picks.push({x:t,y:GY-80,type:'tank',id,float:1,cage:c})}});
  g.stations.push({x:520,t:0});const s2=L.boss?L.len-W-420:Math.round((T[2]+T[3])/2);g.stations.push({x:gx&&Math.abs(s2-gx)<300?s2+400:s2,t:0});
  return g}

/* ---- physics helpers used by the player ---- */
function solidRects(){const o=[];for(const g of GEO.gates)if(!g.broken)o.push({x:g.x-g.w/2,y:g.top,w:g.w,h:GY-g.top,g});return o}
function geoPushX(p,x0){for(const s of solidRects()){if(p.y<=s.y+4)continue;if(p.x+40>s.x&&p.x-40<s.x+s.w){p.x=x0<=s.x+s.w/2?s.x-40:s.x+s.w+40;if(!(p.dashT>0))p.vx=0;
    if(hintT<=0&&!(s.g.kind==='crack'&&p.dashT>0)){hintT=3;ftext(p.x,p.y-210,GATEHINT[s.g.kind],'#ffd27a')}}}}
function geoLand(p,y0){let best=null;if(p.y>=GY)best=GY;if(p.vy<0)return best;
  for(const s of GEO.plats){if(p.dropT>0)break;if(p.x>s.x-26&&p.x<s.x+s.w+26&&y0<=s.y+2&&p.y>=s.y&&(best==null||s.y<best))best=s.y}
  for(const s of solidRects()){if(s.y<=0)continue;if(p.x>s.x-20&&p.x<s.x+s.w+20&&y0<=s.y+2&&p.y>=s.y&&(best==null||s.y<best))best=s.y}
  return best}
function surfaceBelow(x,y){let best=GY;for(const s of GEO.plats)if(x>s.x-10&&x<s.x+s.w+10&&s.y>=y-2&&s.y<best)best=s.y;
  for(const s of solidRects())if(s.y>0&&x>s.x&&x<s.x+s.w&&s.y>=y-2&&s.y<best)best=s.y;return best}
const onPlatform=p=>p.ground&&p.y<GY-2&&!solidRects().some(s=>s.y>0&&Math.abs(p.y-s.y)<3);

/* ---- breaking things ---- */
function breakGate(g){g.broken=1;shake=16;S.boom();buzz(40);const cx=g.x,cy=g.top>0?(g.top+GY)/2:GY-400,col=g.kind==='laser'?'#ff3d3d':g.kind==='crystal'?'#ff5ad8':'#ffd27a';
  for(let i=0;i<4;i++)burst(cx,cy-200+i*130,col,18,900);ring(cx,cy,col,260);G.score+=300;ftext(cx,cy-260,'Path open','#7dffb0',1)}
function breakCage(c){c.broken=1;shake=8;S.boom();buzz(25);burst(c.x,GY-80,'#ff5ad8',26,800);ring(c.x,GY-80,'#ff5ad8',180)}
function updGeo(dt){const p=pl;hintT-=dt;if(!p||p.dead)return;p.maxX=Math.max(p.maxX||0,p.x);
  if(p.dashT>0){const b={x:p.x-80,y:p.y-170,w:160,h:170};for(const g of GEO.gates)if(!g.broken&&g.kind==='crack'&&overlap(b,{x:g.x-g.w/2,y:g.top,w:g.w,h:GY-g.top}))breakGate(g);
    for(const c of GEO.cages)if(!c.broken&&c.kind==='crack'&&Math.abs(c.x-p.x)<110&&p.y>GY-200)breakCage(c)}
  for(const s of shots)if(s.friend&&s.wave){for(const g of GEO.gates)if(!g.broken&&g.kind==='laser'&&Math.abs(s.x-g.x)<s.r+40)breakGate(g);for(const c of GEO.cages)if(!c.broken&&c.kind==='laser'&&Math.abs(s.x-c.x)<s.r+60)breakCage(c)}
  const sh=GEO.shrine;if(sh&&!hasAb(sh.ab)&&Math.abs(p.x-sh.x)<90)grantAbility(sh.ab);
  for(const st of GEO.stations){st.t-=dt;if(!lock&&st.t<=0&&Math.abs(p.x-st.x)<70&&p.ground&&p.y>GY-4)useStation(st)}}
function clawGeo(box){for(const g of GEO.gates)if(!g.broken&&g.kind==='crystal'&&overlap(box,{x:g.x-g.w/2,y:0,w:g.w,h:GY})){if(hasAb('plasma')){g.hp--;burst(g.x,box.y+80,'#ff5ad8',10,500);S.hit();if(g.hp<=0)breakGate(g)}else if(hintT<=0){hintT=2.5;ftext(g.x,GY-300,GATEHINT.crystal,'#ffd27a')}}
  for(const c of GEO.cages)if(!c.broken&&c.kind==='plasma'&&overlap(box,{x:c.x-70,y:GY-170,w:140,h:170})){if(hasAb('plasma')){c.hp--;S.hit();burst(c.x,GY-90,'#ff5ad8',8,400);if(c.hp<=0)breakCage(c)}else if(hintT<=0){hintT=2.5;ftext(c.x,GY-230,'Void crystal. Claws bounce off it.','#ffd27a')}}}
function slamAt(x){for(const g of GEO.gates)if(!g.broken&&g.kind==='blast'&&Math.abs(x-g.plate)<170)breakGate(g);for(const c of GEO.cages)if(!c.broken&&c.kind==='slam'&&Math.abs(x-c.x)<220)breakCage(c)}
function slamLand(p,y){p.slam=0;shake=Math.max(shake,14);S.boom();buzz(35);ring(p.x,y-10,'#ffb347',300);dust(p.x,y);dust(p.x+60,y);dust(p.x-60,y);
  for(let i=0;i<16;i++)parts.push({x:p.x+(Math.random()-.5)*300,y:y-6,vx:(Math.random()-.5)*500,vy:-300-Math.random()*400,life:.6,max:.6,col:'#ffb347',sz:6,g:1500});
  for(const e of en)if(!e.fly&&Math.abs(e.x-p.x)<280&&Math.abs(e.y-y)<60){damage(e,32*pdm(),Math.sign(e.x-p.x)*700);e.state='walk';e.t=1}
  if(boss&&!boss.dead&&Math.abs(boss.x-p.x)<300)damage(boss,40*pdm(),0);slamAt(p.x)}
function grantAbility(id){const A=ABIL.find(a=>a.id===id);META.ab[id]=1;saveMeta();hitStop=.45;shake=10;buzz([40,30,80]);
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>sfx(f,.35,'triangle',.07,0),i*120));
  for(let i=0;i<3;i++)ring(pl.x,pl.y-100,A.col,180+i*90);burst(pl.x,pl.y-100,A.col,40,900);showBanner(A.name+' acquired',A.how,4.2);padAbilities()}
function useStation(st){st.t=6;const p=pl;p.hp=p.max;p.en=Math.max(p.en,50);G.ck={lv:G.lv,x:st.x,waveI,score:G.score,cs:G.chapterStart,broken:GEO.gates.map(g=>g.broken),cages:GEO.cages.map(c=>c.broken)};
  sfx(660,.3,'sine',.06,330);setTimeout(()=>sfx(990,.3,'sine',.06,0),150);ring(st.x,GY-110,'#7dffb0',200);showBanner('Progress saved','Health restored',1.6)}
function restoreCk(){const ck=G.ck;G.lives=3;startLevel(ck.lv);G.score=ck.score;G.chapterStart=ck.cs!=null?ck.cs:G.chapterStart;waveI=ck.waveI;pl.x=ck.x+80;pl.maxX=ck.x;
  GEO.gates.forEach((g,i)=>g.broken=ck.broken[i]||g.broken);GEO.cages.forEach((c,i)=>c.broken=ck.cages[i]||c.broken);
  cam=Math.max(0,Math.min(arenaCam(),pl.x-W*.38));showBanner('Save station',LV[ck.lv].name,1.8)}
function padAbilities(){const d=document.querySelector('.act.dsh'),s=document.querySelector('.act.sp');if(d)d.hidden=!hasAb('dash');if(s)s.hidden=!hasAb('roar')}

/* ---- drawing ---- */
function bakePlat(){const P=PAL[LV[G.lv].theme],c=document.createElement('canvas');c.width=160;c.height=46;const g=c.getContext('2d'),A={light:P.light,metal:P.alt,dark:P.ink};
  plate(g,0,0,160,20,P,{c:4,m:A});hazard(g,4,4,152,5);g.strokeStyle=P.ink;g.lineWidth=5;g.beginPath();g.moveTo(6,20);g.lineTo(40,44);g.lineTo(80,20);g.lineTo(120,44);g.lineTo(154,20);g.stroke();
  g.fillStyle=P.ink;g.fillRect(0,40,160,6);platB=c}
function drawGeo(){const P=PAL[LV[G.lv].theme];if(!platB)bakePlat();
  for(const s of GEO.plats){if(s.x>cam+W+100||s.x+s.w<cam-100)continue;X.strokeStyle=P.ink;X.lineWidth=4;X.beginPath();X.moveTo(s.x+20,s.y);X.lineTo(s.x+20,0);X.moveTo(s.x+s.w-20,s.y);X.lineTo(s.x+s.w-20,0);X.stroke();
    for(let x=0;x<s.w;x+=160){const w=Math.min(160,s.w-x);X.drawImage(platB,0,0,w,46,s.x+x,s.y-2,w,46)}if(s.iso){glow(s.x+s.w/2,s.y+10,s.w*.6,'#ff5ad8',.25,20)}
    lightW(s.x+s.w/2,s.y+30,s.w*.6,.25)}
  const sh=GEO.shrine;if(sh&&sh.x>cam-200&&sh.x<cam+W+200){const A=ABIL.find(a=>a.id===sh.ab),got=hasAb(sh.ab);plate(X,sh.x-60,GY-40,120,40,P,{c:8,m:{light:P.light,metal:P.alt,dark:P.ink}});
    plate(X,sh.x-40,GY-60,80,24,P,{c:6});if(!got){const y=GY-150+Math.sin(lvT*2.5)*10;glow(sh.x,y,120,A.col,.75);X.fillStyle='#ffffff';X.beginPath();X.arc(sh.x,y,18,0,7);X.fill();
      X.strokeStyle=A.col;X.lineWidth=4;for(let i=0;i<3;i++){X.beginPath();X.arc(sh.x,y,28+i*10,lvT*2+i,lvT*2+i+2.2);X.stroke()}lightW(sh.x,y,320,.9);
      X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(0,GY-60,0,y);g.addColorStop(0,rgba(A.col,.35));g.addColorStop(1,rgba(A.col,0));X.fillStyle=g;X.fillRect(sh.x-40,y,80,GY-60-y);X.restore()}}
  for(const st of GEO.stations){if(st.x<cam-200||st.x>cam+W+200)continue;const on=st.t>0;plate(X,st.x-70,GY-26,140,26,P,{c:6,m:{light:P.light,metal:P.alt,dark:P.ink}});
    for(const sx of[-56,44])plate(X,st.x+sx,GY-220,12,196,P,{c:3,m:{light:P.light,metal:P.alt,dark:P.ink}});plate(X,st.x-66,GY-236,132,22,P,{c:6});
    X.save();X.globalCompositeOperation='lighter';const g=X.createLinearGradient(0,GY-214,0,GY-26);g.addColorStop(0,'rgba(125,255,176,.05)');g.addColorStop(1,`rgba(125,255,176,${on?.5:.25})`);X.fillStyle=g;X.fillRect(st.x-44,GY-214,88,188);
    X.restore();glow(st.x,GY-30,90,'#7dffb0',on?.7:.4,20);X.fillStyle='#7dffb0';X.textAlign='center';X.font=`700 20px ${FU}`;X.fillText('SAVE',st.x,GY-244);lightW(st.x,GY-120,260,.7)}
  for(const g of GEO.gates){if(g.broken||g.x<cam-300||g.x>cam+W+300)continue;const x0=g.x-g.w/2,h=GY-g.top;
    if(g.kind==='crack'||g.kind==='ledge'){plate(X,x0,g.top,g.w,h,P,{c:12,seams:Math.floor(h/120),rivets:1});X.strokeStyle='rgba(0,0,0,.6)';X.lineWidth=4;
      if(g.kind==='crack')for(let y=g.top+120;y<GY;y+=210){X.beginPath();X.moveTo(x0+10,y);X.lineTo(x0+g.w*.45,y+40);X.lineTo(x0+g.w*.3,y+90);X.lineTo(x0+g.w-8,y+130);X.stroke();glow(x0+g.w*.45,y+40,30,'#ffd27a',.35)}
      else{hazard(X,x0,g.top,g.w,16);glow(g.x,g.top,60,'#7fe9ff',.4)}}
    else if(g.kind==='laser'){for(const ey of[0,GY-90]){plate(X,x0-24,ey,g.w+48,90,P,{c:10,rivets:1});hazard(X,x0-14,ey+(ey?8:66),g.w+28,14)}X.save();X.globalCompositeOperation='lighter';
      X.fillStyle='rgba(255,40,30,.18)';X.fillRect(x0-10,90,g.w+20,GY-180);
      for(let i=0;i<5;i++){const a=.45+.35*Math.sin(lvT*22+i*1.7);X.fillStyle=`rgba(255,${70+i*25},${60+i*10},${a})`;X.fillRect(x0+4+i*(g.w-8)/4-3,90,6,GY-180);X.fillStyle=`rgba(255,240,230,${a*.8})`;X.fillRect(x0+4+i*(g.w-8)/4-1,90,2,GY-180)}
      const sy=90+((lvT*700)%(GY-180));X.fillStyle='rgba(255,200,180,.7)';X.fillRect(x0-10,sy,g.w+20,4);X.restore();
      lightW(g.x,GY/2,340,.95);glow(g.x,GY/2,180,'#ff3d3d',.45,GY*.42)}
    else if(g.kind==='blast'){plate(X,x0,0,g.w,GY,P,{c:10,seams:6,rivets:1});X.fillStyle='#ff3d2a';for(let y=120;y<GY;y+=160){X.fillRect(g.x-8,y,16,16);glow(g.x,y+8,26,'#ff3d2a',.7)}
      plate(X,g.plate-60,GY-12,120,12,P,{c:4,m:{light:'#ffd27a',metal:'#c88a1a',dark:'#5a3a0a'}});glow(g.plate,GY-8,70,'#ffb347',.4+.2*Math.sin(lvT*4),16)}
    else{X.fillStyle='#2a0c2e';X.beginPath();X.moveTo(x0,GY);for(let y=GY;y>0;y-=90)X.lineTo(x0+((y/90)%2?18:-6),y);X.lineTo(x0+g.w,0);for(let y=0;y<GY;y+=90)X.lineTo(x0+g.w+((y/90)%2?-18:6),y);X.closePath();X.fill();
      X.strokeStyle='#ff5ad8';X.lineWidth=3;X.stroke();glow(g.x,GY/2,140,'#ff5ad8',.3+.1*Math.sin(lvT*3),GY*.45);lightW(g.x,GY/2,220,.6)}}
  for(const c of GEO.cages){if(c.broken||c.x<cam-200||c.x>cam+W+200)continue;const x0=c.x-70,y0=GY-170;
    if(c.kind==='laser'){X.save();X.globalCompositeOperation='lighter';for(let i=0;i<6;i++){X.fillStyle=`rgba(255,70,60,${.35+.2*Math.sin(lvT*18+i)})`;X.fillRect(x0+10+i*24,y0,4,170)}X.restore();plate(X,x0,y0-16,140,16,P,{c:4})}
    else if(c.kind==='crack'){X.globalAlpha=.88;plate(X,x0,y0,140,170,P,{c:14,seams:1});X.globalAlpha=1;X.strokeStyle='rgba(0,0,0,.6)';X.lineWidth=4;X.beginPath();X.moveTo(x0+20,y0+30);X.lineTo(x0+70,y0+80);X.lineTo(x0+50,y0+120);X.lineTo(x0+120,y0+160);X.stroke()}
    else if(c.kind==='slam'){plate(X,x0,y0+40,140,130,P,{c:40,rivets:1});X.fillStyle='#ffb347';X.fillRect(c.x-30,y0+30,60,10);glow(c.x,y0+34,40,'#ffb347',.5)}
    else{X.fillStyle='rgba(60,10,70,.85)';X.beginPath();X.moveTo(x0,GY);X.lineTo(x0+20,y0);X.lineTo(c.x,y0-30);X.lineTo(x0+120,y0);X.lineTo(x0+140,GY);X.fill();X.strokeStyle='#ff5ad8';X.lineWidth=3;X.stroke()}}
  if(lock){const xs=[cam+40,cam+W-(touchy?RSAFE-40:60)+20];X.save();X.globalCompositeOperation='lighter';for(const x of xs){for(let i=0;i<3;i++){X.fillStyle=`rgba(255,50,40,${.18+.12*Math.sin(lvT*14+i*2)})`;X.fillRect(x-6+i*6,0,3,GY)}
      const sy=(lvT*600)%GY;X.fillStyle='rgba(255,120,100,.5)';X.fillRect(x-14,sy,28,6)}X.restore()}}
function drawMinimap(){const L=bg.L,p=pl,mw=620,mh=44,mx=W/2-mw/2,my=58,sx=mw/L.len,sy=mh/(GY-280);
  X.fillStyle='rgba(5,4,12,.62)';X.fillRect(mx-6,my-4,mw+12,mh+10);X.strokeStyle='rgba(236,231,255,.25)';X.lineWidth=2;X.strokeRect(mx-6,my-4,mw+12,mh+10);
  const ex=Math.min(L.len,(p.maxX||p.x)+W);X.fillStyle='rgba(236,231,255,.35)';X.fillRect(mx,my+mh,ex*sx,2);
  for(const s of GEO.plats)if(s.x<ex)X.fillRect(mx+s.x*sx,my+mh-(GY-s.y)*sy,Math.max(2,s.w*sx),2);
  for(const g of GEO.gates)if(!g.broken&&g.x<ex){X.fillStyle=g.kind==='laser'?'#ff3d3d':g.kind==='crystal'?'#ff5ad8':'#ffd27a';X.fillRect(mx+g.x*sx-2,my+(g.top>0?mh-(GY-g.top)*sy:0),4,g.top>0?(GY-g.top)*sy:mh)}
  for(const st of GEO.stations)if(st.x<ex){X.fillStyle='#7dffb0';X.fillRect(mx+st.x*sx-3,my+mh-8,6,6)}
  for(const k of picks)if(k.type==='tank'&&k.x<ex){X.fillStyle='#ff5ad8';X.beginPath();X.arc(mx+k.x*sx,my+mh-(GY-k.y)*sy,3.5,0,7);X.fill()}
  if(GEO.shrine&&!hasAb(GEO.shrine.ab)&&GEO.shrine.x<ex){X.fillStyle='#ffe08a';X.fillRect(mx+GEO.shrine.x*sx-3,my+mh-14,6,6)}
  L.trig.forEach((t,i)=>{X.fillStyle=i<waveI?L.glow:'rgba(236,231,255,.6)';X.fillRect(mx+t*sx-1,my+mh-4,2,6)});
  if(L.boss){X.fillStyle='#ff3d6e';X.fillRect(mx+(L.len-W/2)*sx-3,my+4,6,mh-8)}else{X.fillStyle=L.glow;X.fillRect(mx+(L.len-150)*sx-2,my+4,4,mh-8)}
  const px=mx+p.x*sx,py=my+mh-(GY-p.y)*sy;X.fillStyle='#ffffff';X.beginPath();X.moveTo(px+p.face*7,py-6);X.lineTo(px-p.face*5,py-12);X.lineTo(px-p.face*5,py);X.closePath();X.fill()}
function abilitiesHTML(){const t=LV.map((L,i)=>[0,1].filter(k=>META.tanks[i+'-'+k]).length);
  return `<div class="keys">${ABIL.map(a=>`<kbd style="color:${hasAb(a.id)?a.col:'#55507a'}">${hasAb(a.id)?'◆':'◇'} ${a.name}</kbd><span>${hasAb(a.id)?a.how:'Not found yet'}</span>`).join('')}
    <kbd style="color:#ff5ad8">Energy Tanks</kbd><span>${tankCount()} of 12 found · max health ${maxHP()} · ${t.map((n,i)=>`${['I','II','III','IV','V','VI'][i]}: ${n}/2`).join('  ')}</span></div>`}
</script>
