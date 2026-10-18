<script>
"use strict";
/* ---------- HUD: its own Phaser scene drawn above the world camera (no post-processing, never scrolls) ---------- */
const FD='"Cinzel", Georgia, serif',FU='"Chakra Petch", "Segoe UI", sans-serif';
function showBanner(t,sub,dur){banner={t,sub,life:dur||2.2,max:dur||2.2}}
const HU={};
/* Phaser re-renders a Text whenever its content or style is set, so only touch them when something changed */
const tx=(o,v)=>{v=String(v);if(o._s!==v){o._s=v;o.setText(v)}return o},cc=(o,c)=>{if(o._c!==c){o._c=c;o.setColor(c)}return o};
class HudScene extends Phaser.Scene{
  constructor(){super({key:'hud',active:false})}
  create(){const s=this,T=(x,y,str,size,col,font,weight)=>s.add.text(x,y,str,{fontFamily:font||FU,fontStyle:weight||'700',fontSize:size+'px',color:col||'#ece7ff'});HU.s=s;
    HU.vg=s.add.image(0,0,'vig').setOrigin(0).setTint(0x000000).setAlpha(.38);HU.vig=s.add.image(0,0,'vig').setOrigin(0).setTint(0xff003c).setAlpha(0);
    HU.flash=s.add.rectangle(0,0,W,H,0xff2850,0).setOrigin(0);
    HU.g=s.add.graphics();
    HU.name=T(48,34,'TYKO',30,'#ece7ff',FD,'700');HU.hp=T(58,80,'',20,'#ffffff',FU,'600');HU.ae=T(48,142,'',20,'#9d97bd');
    HU.eggs=[];for(let i=0;i<5;i++)HU.eggs.push(s.add.image(0,51,'pk_egg').setScale(.42).setVisible(false));
    HU.ch=T(0,30,'',18,'#9d97bd',FU,'600').setOrigin(.5,0);HU.p2n=T(560,56,'',20,'#ffc49a',FU,'700').setVisible(false);HU.rift=T(528,143,'◆ RIFT MODE',18,'#ff4a6a',FU,'700').setOrigin(1,0).setVisible(false);
    HU.score=T(0,34,'',34,'#ece7ff').setOrigin(1,0);HU.scl=T(0,74,'SCORE',16,'#9d97bd',FU,'600').setOrigin(1,0);HU.dust=T(0,96,'',22,'#ffd27a',FU,'700').setOrigin(1,0);
    HU.map=s.add.graphics();HU.mapDot=s.add.circle(0,0,5,0xffffff);
    HU.combo=T(0,270,'',64,'#ffd27a',FD,'900').setOrigin(1,0);HU.combo2=T(0,340,'HIT COMBO',24,'#ece7ff').setOrigin(1,0);HU.combo3=T(0,368,'',24,'#5ce1ff').setOrigin(1,0);
    HU.bossN=T(0,120,'MALAKAR, THE VOID SOVEREIGN',30,'#ffd0dc',FD,'700').setOrigin(.5,0);
    HU.buffs=[['shield'],['fang']].map(([t])=>({i:s.add.image(0,208,'pk_'+t).setScale(.7),t:T(0,196,'',22,PICK[t].col)}));
    HU.hint=T(0,H-60,'',26,'rgba(236,231,255,.85)',FU,'600').setOrigin(.5,0);HU.seal=T(0,H-90,'◆ HATCHES SEALED ◆',26,'#ff6a5a').setOrigin(.5,0);
    HU.bnBack=s.add.rectangle(0,H/2-130,W,190,0x05040c,.45).setOrigin(0);HU.bn=T(0,H/2-30,'',96,'#ece7ff',FD,'900').setOrigin(.5,1);HU.bs=T(0,H/2+30,'',34,'#ffffff',FU,'600').setOrigin(.5,1);
    HU.dim=s.add.rectangle(0,0,W,H,0x05040c,0).setOrigin(0);HU.fade=s.add.rectangle(0,0,W,H,0x000000,0).setOrigin(0);
    HU.fps=T(10,H-26,'',16,'#9d97bd').setVisible(false);
    this.scale.on('resize',()=>this.layout());this.layout()}
  layout(){this.cameras.main.setSize(this.scale.width,this.scale.height).setOrigin(0,0).setZoom(RS);HU.vg.setDisplaySize(W,H);HU.vig.setDisplaySize(W,H);HU.flash.setSize(W,H);HU.dim.setSize(W,H);HU.fade.setSize(W,H);HU.bnBack.setSize(W,190)}
  update(){hudUpdate()}}
function hudUpdate(){const g=HU.g,p=pl,play=G.state!=='menu'&&!!p&&!!ROOM;g.clear();HU.map.clear();HU.vg.setVisible(FX.quality==='high');
  const all=[HU.p2n,HU.dust,HU.rift,HU.name,HU.hp,HU.ae,HU.ch,HU.score,HU.scl,HU.mapDot,HU.combo,HU.combo2,HU.combo3,HU.bossN,HU.hint,HU.seal,...HU.eggs,...HU.buffs.map(b=>b.i),...HU.buffs.map(b=>b.t)];
  if(!play){for(const o of all)o.setVisible(false);HU.vig.setAlpha(0);shA(HU.flash,0);shA(HU.dim,0);HU.bnBack.setVisible(false);HU.bn.setVisible(false);HU.bs.setVisible(false);shA(HU.fade,TRANS.on?transA():0);return}
  for(const o of[HU.name,HU.hp,HU.ae,HU.ch,HU.score,HU.scl])o.setVisible(true);
  const L=LV[G.lv],bar=(x,y,w,h,v,c1,c2)=>{g.fillStyle(0x05040c,.7);g.fillRect(x-3,y-3,w+6,h+6);const f=clamp(v,0,1);g.fillGradientStyle(c1,c2,c1,c2,1);g.fillRect(x,y,w*f,h);g.lineStyle(2,0xece7ff,.35);g.strokeRect(x-3,y-3,w+6,h+6)};
  bar(48,80,480,24,p.hp/p.max,0xff3d6e,0xff8a4c);tx(HU.hp,Math.ceil(p.hp)+' / '+p.max);
  bar(48,116,480,14,p.en/100,0x3a7cff,0x5ce1ff);g.fillStyle(0xece7ff,.8);g.fillRect(48+239,113,2,20);
  const rdy=p.en>=50&&hasAb('roar');tx(HU.ae,rdy?'✦ STARBURST READY':'AETHER');cc(HU.ae,rdy?'#5ce1ff':'#9d97bd');
  if(G.rush){tx(HU.rift,'◆ BOSS RUSH  '+fmtT(G.rush.t));HU.rift.setVisible(true)}else{tx(HU.rift,'◆ RIFT MODE');HU.rift.setVisible(!!META.hard)}{const c=coop(),o=c?(NET.role==='client'?pRemote:pl2):null;tx(HU.name,c&&NET.role==='client'?'KIRO':'TYKO');HU.p2n.setVisible(!!o);
    if(o){tx(HU.p2n,(NET.role==='client'?'P1 · TYKO':'P2 · KIRO')+(o.dead?'  ·  DOWN':''));cc(HU.p2n,NET.role==='client'?'#a8ffd0':'#ffc49a');bar(560,84,220,14,(o.hp||0)/(o.max||100),NET.role==='client'?0x3dff9a:0xff8a4c,NET.role==='client'?0xa8ffd0:0xffd08a)}}
  const nx=48+HU.name.width+30;HU.eggs.forEach((e,i)=>e.setVisible(i<G.lives).setX(nx+i*34));
  tx(HU.ch,L.ch.toUpperCase()+'  ·  '+L.name.toUpperCase()).setX(W/2);
  tx(HU.score,G.score.toLocaleString()).setX(W-(touchy?210:48));HU.scl.setX(W-(touchy?210:48));tx(HU.dust,'◆ '+(META.dust||0)).setVisible(true).setX(W-(touchy?210:48));
  if(!(boss&&!boss.dead))drawMinimap();else HU.mapDot.setVisible(false);
  const bf=[];if(p.shield>0)bf.push(['shield',`${p.shield}× · ${Math.ceil(p.shieldT)}s`]);if(p.fury>0)bf.push(['fang',`${Math.ceil(p.fury)}s`]);
  HU.buffs.forEach(b=>{b.i.setVisible(false);b.t.setVisible(false)});bf.forEach(([t,lab],i)=>{const b=HU.buffs.find(q=>q.i.texture.key==='pk_'+t),bx=72+i*170;b.i.setVisible(true).setPosition(bx,208);tx(b.t,lab).setVisible(true).setPosition(bx+30,196)});
  if(p.hits>=3){const m=1+Math.min(4,Math.floor(p.hits/10)),pop=Math.min(1,(1.8-p.hitsT)*8),a=Math.min(1,p.hitsT*2);
    tx(HU.combo,p.hits).setVisible(true).setX(W-60).setAlpha(a).setScale(1+(1-pop)*.25);HU.combo2.setVisible(true).setX(W-60).setAlpha(a);tx(HU.combo3,'×'+m+' SCORE').setVisible(m>1).setX(W-60).setAlpha(a)}
  else{HU.combo.setVisible(false);HU.combo2.setVisible(false);HU.combo3.setVisible(false)}
  const bv=boss&&!boss.dead&&boss.state!=='enter';HU.bossN.setVisible(bv).setX(W/2);if(bv){tx(HU.bossN,boss.name?boss.name.toUpperCase():'MALAKAR, THE VOID SOVEREIGN');const bw=900,bx=W/2-bw/2;bar(bx,164,bw,20,boss.hp/boss.max,0x7a0a2a,0xff3d6e);for(const m of(boss.guard!=null?[.5]:[.55,.25])){g.fillStyle(0xffffff,.6);g.fillRect(bx+bw*m-1,161,2,26)}}
  HU.seal.setVisible(lock&&!!ROOM.arena&&!boss&&Math.floor(lvT*2)%2===1).setX(W/2);
  const hint=G.lv===0&&lvT<10&&ROOM.id==='0-0';if(hint)tx(HU.hint,touchy?'Slide on the left side to move   ·   ▲ jump   ·   ⚔ strike   ·   walk into hatches to explore   ·   II map':'A / D move   ·   W jump   ·   J strike   ·   S drop   ·   walk into hatches to explore   ·   Esc map');HU.hint.setVisible(hint).setX(W/2);
  if(banner){const a=Math.min(1,banner.life*2,(banner.max-banner.life)*4);HU.bnBack.setVisible(true).setAlpha(a).setSize(W,banner.sub?190:150);
    if(HU.bnFor!==banner){HU.bnFor=banner;HU.bn.setShadow(0,0,L.glow,30,false,true);tx(HU.bn,banner.t.toUpperCase());tx(HU.bs,(banner.sub||'').toUpperCase());cc(HU.bs,L.glow)}
    HU.bn.setVisible(true).setX(W/2).setAlpha(a);HU.bs.setVisible(!!banner.sub).setX(W/2).setAlpha(a)}
  else{HU.bnBack.setVisible(false);HU.bn.setVisible(false);HU.bs.setVisible(false)}
  shA(HU.flash,flashT>0?Math.min(1,flashT*1.4):0);
  HU.vig.setAlpha(p.hp<30?.55+Math.sin(lvT*5)*.2:0);
  shA(HU.dim,G.state==='over'?.5:0);shA(HU.fade,TRANS.on?transA():0)}
/* full-screen rectangles are hidden instead of drawn at zero alpha */
function shA(r,a){r.setVisible(a>.003);if(a>.003)r.fillAlpha=a}
function transA(){const d=transDur();return TRANS.phase===0?Math.min(1,TRANS.t/d):Math.max(0,1-TRANS.t/.25)}
/* minimap: explored rooms of this world on a 7x3 grid around Tyko */
function drawMinimap(){const g=HU.map,cs=40,cols=7,rows=3,mw=cols*cs,mh=rows*cs,mx=W/2-mw/2,my=56,o=ROOM;
  const cx=o.gx+Math.min(o.w-1,Math.floor(pl.x/CW)),cy=o.gy+Math.min(o.h-1,Math.floor(pl.y/H)),ox=mx+(Math.floor(cols/2)-cx)*cs,oy=my+(1-cy)*cs;
  g.fillStyle(0x05040c,.72);g.fillRect(mx-4,my-4,mw+8,mh+8);g.lineStyle(1,0x78c8ff,.12);for(let i=0;i<=cols;i++)g.lineBetween(mx+i*cs,my,mx+i*cs,my+mh);for(let i=0;i<=rows;i++)g.lineBetween(mx,my+i*cs,mx+mw,my+i*cs);
  for(const r of AREAS[o.a]){if(!META.map[r.id])continue;let x=ox+r.gx*cs,y=oy+r.gy*cs,w=r.w*cs,h=r.h*cs;const x2=Math.min(x+w,mx+mw),y2=Math.min(y+h,my+mh);x=Math.max(x,mx);y=Math.max(y,my);if(x2<=x||y2<=y)continue;
    g.fillStyle(r.kind==='save'?0x2a8a5a:r.kind==='boss'?0x8a1a3a:0xa8327a,1);g.fillRect(x+1,y+1,x2-x-2,y2-y-2);g.lineStyle(2,0xffd0f0,1);g.strokeRect(x+1,y+1,x2-x-2,y2-y-2)}
  g.lineStyle(2,0xece7ff,.35);g.strokeRect(mx-4,my-4,mw+8,mh+8);
  const px=ox+o.gx*cs+pl.x/o.RW*o.w*cs,py=oy+o.gy*cs+Math.min(o.h-.2,pl.y/H)*cs-cs*.15;HU.mapDot.setVisible(Math.floor(lvT*3)%2===0).setPosition(clamp(px,mx,mx+mw),clamp(py,my,my+mh))}
</script>
