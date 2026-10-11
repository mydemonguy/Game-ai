<script>
"use strict";
/* ---------- world, part 1: abilities, save data, area layouts and room generation (Super Metroid-style grid of rooms) ---------- */
const ABIL=[
 {id:'dash',  name:'Comet Dash',     how:'Tap » to dash. Dash into cracked walls to smash them.',col:'#b48cff',gate:'crack'},
 {id:'double',name:'Sky Scales',     how:'Tap jump again in the air to double jump.',col:'#7fe9ff',gate:'ledge'},
 {id:'roar',  name:'Starburst Roar', how:'Tap ✦ when its ring is full. The roar melts laser gates.',col:'#5ce1ff',gate:'laser'},
 {id:'slam',  name:'Ground Slam',    how:'In the air, pull the stick down and strike. Slam the plate to open blast doors.',col:'#ffb347',gate:'blast'},
 {id:'plasma',name:'Plasma Claws',   how:'Your claws burn hotter. Claw void-crystal walls to break them.',col:'#ff5ad8',gate:'crystal'}];
const GATEHINT={crack:'Cracked wall. A dash could smash it.',ledge:'Too high to climb. Maybe with a double jump?',laser:'Laser gate. Only a Starburst roar melts it.',
  blast:'Blast door. The plate needs a Ground Slam.',crystal:'Void crystal. Claws bounce off it.'};
const freshMeta=()=>({ab:{},tanks:{},items:{},gates:{},cleared:{},map:{},areas:{},save:null,boss:0});
let META=freshMeta();try{const m=JSON.parse(localStorage.getItem('aetherfall_world')||'null');if(m&&m.ab&&m.map)META=Object.assign(freshMeta(),m)}catch(e){}
function saveMeta(){try{localStorage.setItem('aetherfall_world',JSON.stringify(META))}catch(e){}}
const hasAb=id=>!!META.ab[id];
const tankCount=()=>Object.keys(META.tanks).length;
const maxHP=()=>100+15*tankCount();
PICK.tank={name:'Energy Tank',col:'#ff5ad8',txt:'Energy Tank: +15 max HP'};

const CW=2560;           /* one map cell = 2560 x 1080 world units; rooms are whole numbers of cells */
const TANKS=[['high','laser'],['crack','slam'],['high','plasma'],['laser','high'],['slam','plasma'],['crack','high']];
function hstr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)%2147483646+1}
/* every area follows the same Super Metroid shape: entry → tall shaft hub with save / item / shrine side rooms → lockdown arena → gate corridor → arena → elevator (or boss) */
function buildArea(a){const hs=3+(a===2||a===4?1:0),bot=hs-1,id=k=>a+'-'+k,R=[];
  const room=(k,gx,gy,w,h,kind,doors)=>R.push({id:id(k),a,k,gx,gy,w,h,kind,doors:doors.map(([side,row,to])=>({side,row,to:id(to)}))});
  room(0,0,0,2,1,a===0?'start':'liftUp',[['R',0,1]]);
  room(1,2,0,1,hs,'shaft',[['L',0,0],['R',0,2],['R',1,3],['L',bot,4],['R',bot,5]]);
  room(2,3,0,1,1,'save',[['L',0,1]]);
  room(3,3,1,1,1,'item',[['L',0,1]]);
  room(4,0,bot,2,1,'shrine',[['R',0,1]]);
  room(5,3,bot,1,1,'arena',[['L',0,1],['R',0,6]]);
  room(6,4,bot,3,1,'gate',[['L',0,5],['R',0,7]]);
  room(7,7,bot,1,1,'arena',[['L',0,6],['R',0,8]]);
  room(8,8,bot,1,1,a<5?'liftDown':'boss',[['L',0,7]]);
  return R}
const AREAS=LV.map((L,a)=>buildArea(a));
const ROOMS={};AREAS.forEach(r=>r.forEach(o=>ROOMS[o.id]=o));
/* matching door on the other side of a connection */
function partnerDoor(room,door){const t=ROOMS[door.to],wr=room.gy+door.row;return t.doors.find(d=>d.to===room.id&&d.side!==door.side&&t.gy+d.row===wr)||t.doors.find(d=>d.to===room.id)}

/* ---- room contents, generated deterministically from the room id ---- */
function genRoom(o){if(o.gen)return o;const L=LV[o.a],a=o.a,r=rng(hstr(o.id)),RW=o.w*CW,RH=o.h*H,FY=(o.h-1)*H+GY;
  const S=[],plats=[],zones=[];o.RW=RW;o.RH=RH;o.FY=FY;
  S.push({x:-400,y:FY,w:RW+800,h:600,k:'floor'});S.push({x:-400,y:-400,w:RW+800,h:400,k:'ceil'});
  for(const side of['L','R']){const ds=o.doors.filter(d=>d.side===side).map(d=>d.row).sort((p,q)=>p-q);let y=-400;const x=side==='L'?-400:RW-40;
    for(const row of ds){const top=row*H+GY-300;if(top>y)S.push({x,y,w:440,h:top-y,k:'wall'});y=row*H+GY;
      if(row<o.h-1)S.push({x:side==='L'?-400:RW-340,y:row*H+GY,w:740,h:44,k:'ledge'})}
    S.push({x,y,w:440,h:RH+400-y,k:'wall'});
    for(const row of ds)zones.push([side==='L'?0:RW-520,side==='L'?520:RW])}
  o.solids=S;o.plats=plats;o.zones=zones;o.gates=[];o.cages=[];o.items=[];o.crates=[];o.coins=[];o.spawns=[];o.props=[];o.lamps=[];o.vents=[];o.waves=null;
  const free=x=>zones.every(z=>x<z[0]-60||x>z[1]+60);
  if(o.kind==='shaft'){const cols=[.26,.5,.74,.5];let k=0;for(let y=FY-205;y>GY+60;y-=205,k++){const cx=cols[k%4]*RW;plats.push({x:Math.round(cx-220),y,w:440})}
    for(const d of o.doors)if(d.row<o.h-1){const y=d.row*H+GY+205;plats.push({x:d.side==='L'?380:RW-800,y,w:420})}
    for(let row=0;row<o.h;row++)o.spawns.push({t:'d',x:RW*(.3+r()*.4),y:row*H+GY-330});o.spawns.push({t:'g',x:RW*.5,y:FY})}
  else{let x=700;while(x<RW-700){if(free(x)&&r()<.75){const tiers=1+Math.floor(r()*(o.kind==='arena'?2:3));let px=x;
        for(let t=0;t<tiers;t++){const w=240+Math.floor(r()*3)*80;plats.push({x:Math.round(px),y:FY-190-t*170,w});px+=(r()<.5?-1:1)*(130+r()*70)}}x+=760+r()*620}}
  /* props, lamps and vents along the bottom floor */
  const ks=PROPK[L.theme];let x=560;while(x<RW-560){if(free(x)&&o.kind!=='save'){o.props.push({x,k:ks[Math.floor(r()*ks.length)],v:Math.floor(r()*2),fy:FY})}x+=520+r()*620}
  for(let row=0;row<o.h;row++){let lx=380+r()*300;while(lx<RW-300){const v=r();o.lamps.push({x:lx,y:row*H+150+r()*100,y0:row*H,fy:row*H+GY,k:v<.18?'alarm':v<.3?'broken':'lamp',s:r()});lx+=640+r()*560}}
  for(let vx=900;vx<RW-400;vx+=1200+r()*1200)if(free(vx))o.vents.push({x:vx,t:1+r()*4,on:0,fy:FY});
  /* kind-specific content */
  const sp=(t,x)=>o.spawns.push({t,x,y:ETYPES[t].fly?FY-330-r()*120:FY});
  if(o.kind==='start'||o.kind==='liftUp'){if(o.kind==='liftUp')o.lift={x:420,dir:-1,to:(a-1)+'-8'};sp('g',RW*.62);sp('d',RW*.8);if(a>=2)sp('h',RW*.9);
    o.crates.push(RW*.42);o.coins.push(RW*.7)}
  else if(o.kind==='save'){o.station={x:RW*.5,t:0};o.plats.length=0}
  else if(o.kind==='item'){const t=TANKS[a][0],tid=a+'-0';o.plats.length=0;
    if(t==='high'){o.plats.push({x:RW*.5-130,y:GY-410,w:260,iso:1});o.items.push({type:'tank',id:tid,x:RW*.5,y:GY-480})}
    else{const c={x:RW*.5,kind:t,hp:t==='plasma'?3:1,broken:0};o.cages.push(c);o.items.push({type:'tank',id:tid,x:RW*.5,y:GY-80,cage:c})}sp('d',RW*.7)}
  else if(o.kind==='shrine'){o.shrine={x:520,ab:a<5?ABIL[a].id:null};if(a===5)o.shrine=null;sp('g',RW*.55);sp('g',RW*.75);sp('d',RW*.65);o.crates.push(RW*.35);o.coins.push(RW*.45);
    o.items.push({type:'egg',id:'egg'+a,x:RW*.86,y:GY-470})}
  else if(o.kind==='arena'){const n=L.waves.length,cut=n>3?2:1;o.waves=o.k===5?L.waves.slice(0,cut):L.waves.slice(cut);o.plats=o.plats.filter(p=>p.y<GY-300)}
  else if(o.kind==='gate'){if(a<5){const g=mkGate(ABIL[a].gate,Math.round(RW*.46));o.gates.push(g);if(g.kind==='laser')o.items.push({type:'shard',id:null,x:g.x-320,y:GY-80},{type:'shard',id:null,x:g.x-420,y:GY-80})}
    const t=TANKS[a][1],tid=a+'-1',tx=Math.round(RW*.8);
    if(t==='high'){o.plats=o.plats.filter(p=>Math.abs(p.x+p.w/2-tx)>600);o.plats.push({x:tx-130,y:GY-410,w:260,iso:1});o.items.push({type:'tank',id:tid,x:tx,y:GY-480})}
    else{const c={x:tx,kind:t,hp:t==='plasma'?3:1,broken:0};o.cages.push(c);o.items.push({type:'tank',id:tid,x:tx,y:GY-80,cage:c})}
    o.plats=o.plats.filter(p=>p.iso||o.gates.every(g=>Math.abs(p.x+p.w/2-g.x)>420));
    sp('g',RW*.25);sp('c',RW*.36);sp('d',RW*.3);if(a>=1){sp('h',RW*.62);sp('h',RW*.66)}sp('g',RW*.7);o.crates.push(RW*.18,RW*.58);o.coins.push(RW*.52)}
  else if(o.kind==='liftDown'){o.lift={x:RW*.5,dir:1,to:(a+1)+'-0'};o.plats.length=0}
  else if(o.kind==='boss'){o.plats.length=0}
  if(o.kind==='shaft')o.coins.push(RW*.5);
  o.gen=1;return o}
function mkGate(kind,x){const g={kind,x,broken:0};if(kind==='crack'){g.w=80;g.top=0}else if(kind==='ledge'){g.w=150;g.top=GY-330}else if(kind==='laser'){g.w=46;g.top=0}
  else if(kind==='blast'){g.w=90;g.top=0;g.plate=x-300}else{g.w=96;g.top=0;g.hp=4}return g}
</script>
