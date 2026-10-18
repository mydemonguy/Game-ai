<script>
"use strict";
/* ---------- same-Wi-Fi co-op ----------
   The host phone runs the whole world (rooms, robots, bosses, pickups, saves) and streams a snapshot 20 times a second.
   The joining phone simulates only its own dino, Kiro, so the controls feel instant, and tells the host where it is and what it hit.
   Transport: the Android bridge (window.AFNet), or a BroadcastChannel between two browser tabs for testing on a computer. */
const NET={role:null,conn:false,started:false,eid:0,sid:0,rq:0,rqSeen:-1,sendT:0,metaT:0,ev:[],found:{},realMeta:null,respawnT:0,hostState:'play',hc:[0,0],bnSeen:0,onFound:null,scanning:false};
let pl2=null,pRemote=null;
const NX=(()=>{if(window.AFNet)return{kind:'android',host:n=>AFNet.host(n),join:ip=>AFNet.join(ip),send:m=>AFNet.send(m),scan:on=>AFNet.scan(on),close:()=>AFNet.close(),ip:()=>AFNet.localIp()};
  let ch=null,me=null,bt=0;const peer=()=>me==='host'?'client':'host';
  const open=()=>{if(ch)return;try{ch=new BroadcastChannel('aetherfall-net')}catch(e){return}ch.onmessage=ev=>{const d=ev.data;if(!d||(d.to!==me))return;
    if(d.k==='beacon'){if(NET.scanning)NETJS.found(d.name,'local')}else if(d.k==='join'){if(me==='host'&&!NET.conn){clearInterval(bt);ch.postMessage({k:'ok',to:'client'});NETJS.event('connected','local')}}
    else if(d.k==='ok')NETJS.event('connected','local');else if(d.k==='m')NETJS.recvRaw('['+d.m+']');else if(d.k==='bye')NETJS.event('closed','')}};
  return{kind:'local',host:n=>{open();me='host';clearInterval(bt);bt=setInterval(()=>ch&&ch.postMessage({k:'beacon',name:n,to:'client'}),400)},
    join:()=>{open();me='client';ch&&ch.postMessage({k:'join',to:'host'})},send:m=>ch&&me&&ch.postMessage({k:'m',m,to:peer()}),
    scan:on=>{open();if(!me)me='client';NET.scanning=on},close:()=>{clearInterval(bt);if(ch&&me)ch.postMessage({k:'bye',to:peer()});me=null},ip:()=>'this computer'}})();
window.NETJS={recvRaw(s){let a;try{a=JSON.parse(s)}catch(e){return}for(const m of a)try{netRecv(m)}catch(err){console.error(err)}},
  event(t,info){if(t==='connected')netConnected(info);else if(t==='closed')netClosed('The other player left the game.');else if(t==='error')netError(info)},
  found(name,ip){NET.found[ip]=name;if(NET.onFound)NET.onFound()}};
const nsend=o=>{if(NET.conn)NX.send(JSON.stringify(o))};
const coop=()=>NET.conn&&NET.started;
/* host side: everyone the robots can see */
function players(){return pl2&&coop()&&!pl2.dead&&NET.role==='host'?[pl,pl2]:[pl]}
function nearestPl(x,y){if(!pl2||!coop()||NET.role!=='host'||pl2.dead)return pl;if(pl.dead)return pl2;return Math.abs(pl2.x-x)+Math.abs(pl2.y-y)*.6<Math.abs(pl.x-x)+Math.abs(pl.y-y)*.6?pl2:pl}
function withPl(p,fn){const o=pl;pl=p;try{return fn()}finally{pl=o}}
function offView(x,y){const far=(cx,cy)=>x<cx-300||x>cx+W+300||y<cy-300||y>cy+H+300;return far(cam,camY)&&(!pl2||!coop()||far(pl2.x-W*.4,pl2.y-H*.66))}

/* ---- lobby ---- */
const devName=()=>'Tyko '+((navigator.userAgent.match(/\b(SM-\w+|Pixel \w+|[A-Z]{2,}\w*-\w+)/)||[])[1]||'');
function coopCard(){showCard({ey:'Same Wi-Fi co-op',h:'Play together',b:`<p>Two phones on the same Wi-Fi network. One phone hosts the game from its own save; the other joins as <b style="color:#ffb07a">Kiro</b>, a second Starblood hatchling.</p><p>Robots go after whoever is closest. Everything you find counts for the host's save.</p>`,
  btns:[['Host a game',hostCard],['Join a game',joinCard],['Back',toTitle,1]]})}
function hostCard(){netReset();NET.role='host';NX.host(devName());const ip=NX.ip();
  showCard({ey:'Co-op · Hosting',h:'Waiting for Kiro',b:`<p>On the other phone open Aetherfall, then <b>Co-op → Join a game</b>. It should find this phone by itself.</p><p>If it doesn't, type this address on the other phone:</p><p style="font-size:1.5em;letter-spacing:.06em;color:#ffe08a"><b>${ip||'connect to Wi-Fi first'}</b></p>`,btns:[['Cancel',()=>{netLeave(true);coopCard()},1]]})}
function joinCard(){netReset();NET.role='client';NET.found={};NX.scan(true);
  const draw=()=>{if(NET.conn||NET.role!=='client'||G.state!=='menu')return;const ips=Object.keys(NET.found);
    showCard({ey:'Co-op · Join',h:'Find a game',b:ips.length?'<p>Games on this Wi-Fi:</p>':'<p>Looking for a game on this Wi-Fi… Make sure the other phone is hosting and on the same network.</p>',
      extra:`<label class="vol"><span>Or type the address</span><input id="ipIn" inputmode="decimal" placeholder="192.168.1.20" style="font:600 18px var(--ui);padding:8px 10px;border-radius:8px;border:1px solid rgba(180,140,255,.4);background:#0c0a1a;color:#ece7ff;width:12em"></label>`,
      btns:[...ips.map(ip=>['Join '+NET.found[ip].replace(/^Tyko\s*/,'')+(ip==='local'?'':' ('+ip+')'),()=>netJoin(ip)]),['Join address',()=>{const v=(document.getElementById('ipIn')||{}).value||'';if(v.trim())netJoin(v.trim())},1],['Back',()=>{netLeave(true);coopCard()},1]]})};
  NET.onFound=draw;draw()}
function netJoin(ip){NX.scan(false);NET.onFound=null;showCard({ey:'Co-op · Join',h:'Connecting…',b:`<p>Connecting to ${ip==='local'?'the other window':ip}…</p>`,btns:[['Cancel',()=>{netLeave(true);coopCard()},1]]});NX.join(ip)}
function netConnected(){NET.conn=true;sfxSave();
  if(NET.role==='host'){const sv=META.save;showCard({ey:'Co-op',h:'Kiro has joined!',b:'<p>Both phones are connected. Pick how to start. Progress goes to this phone\'s save.</p>',
      btns:[...(sv?[['Continue save',()=>startCoop('continue')]]:[]),['New game',()=>startCoop('new'),!!sv],['Cancel',()=>{netLeave(true);coopCard()},1]]})}
  else{nsend({t:'hi'});showCard({ey:'Co-op',h:'Connected!',b:'<p>Waiting for the host to start the game…</p>',btns:[['Leave',()=>{netLeave(true);coopCard()},1]]})}}
function netError(info){if(G.state!=='menu')return;showCard({ey:'Co-op',h:'Could not connect',b:`<p>${NET.role==='host'?'This phone could not start hosting.':'The other phone did not answer.'} Check that both phones are on the same Wi-Fi network and try again.</p><p style="opacity:.6;font-size:.85em">${String(info).replace(/[<>&]/g,'')}</p>`,btns:[['Back',()=>{netLeave(true);coopCard()}]]})}
function netReset(){NX.close();NET.conn=false;NET.started=false;NET.role=null;NET.rqSeen=-1;NET.ev=[];pl2=null;pRemote=null}
/* leave co-op; the joining phone gets its own save back */
function netLeave(quiet){const wasClient=NET.role==='client'&&NET.started;nsend({t:'bye'});netReset();if(wasClient&&NET.realMeta){META=NET.realMeta;NET.realMeta=null}clearClientMaps();if(!quiet&&wasClient)toTitle()}
function netClosed(msg){const r=NET.role,st=NET.started;NET.conn=false;
  if(r==='host'){netReset();if(st&&G.state!=='menu'){showBanner('Kiro left the game','Back to solo',2.2)}else if(G.state==='menu')coopCard()}
  else{const had=NET.realMeta;netReset();if(had){META=had;NET.realMeta=null}clearClientMaps();if(st){toTitle();showCard({ey:'Co-op',h:'Disconnected',b:`<p>${msg} Your own save is untouched.</p>`,btns:[['OK',toTitle]]})}else if(G.state==='menu')coopCard()}}
function startCoop(mode){NET.started=true;if(mode==='new')beginSagaCoop();else continueGame();pl2=mkProxy();NET.rq++;showBanner('Co-op','Tyko and Kiro',2)}
function beginSagaCoop(){goFull();newRun()}
function mkProxy(){return{remote:1,p2:1,x:pl.x-120,y:pl.y,tx:pl.x-120,ty:pl.y,vx:0,vy:0,face:1,hp:100,max:maxHP(),en:30,inv:2,dead:0,deadT:0,shield:0,fury:0,aegis:0,atk:0,combo:1,dashT:0,ground:true,landT:0,run:0,squash:0,slam:0,hits:0,hurtT:0,sup:FY}}

/* ---- messages ---- */
function netRecv(m){
  if(NET.role==='host'){if(m.t==='s'&&pl2){const p=m.p;if(m.rq===NET.rq){pl2.tx=p.x;pl2.ty=p.y;if(Math.abs(pl2.x-p.x)>600||Math.abs(pl2.y-p.y)>600){pl2.x=p.x;pl2.y=p.y}}pStateIn(pl2,p,1);if(m.ev)hostEv(m.ev)}
    else if(m.t==='bye')netClosed('');return}
  if(m.t==='w'){if(!NET.started)clientStart(m);clientApply(m)}
  else if(m.t==='hurt'){if(pl&&!pl.dead)hurtPlayer(m.d,m.kx)}
  else if(m.t==='pick'){if(pl)applyPick({type:m.k,id:m.id,x:pl.x,y:pl.y-90})}
  else if(m.t==='bye')netClosed('The host ended the game.')}
/* the joining phone reports hits, roars and Guardian Arm shots; the host applies them as Kiro */
function hostEv(ev){for(const v of ev){
  if(v.t==='hit'){const tg=v.i==='b'?boss:en.find(e=>e.id===v.i);if(tg&&!tg.dead)withPl(pl2,()=>damage(tg,v.d,v.kb))}
  else if(v.t==='roar')withPl(pl2,()=>roarFx(pl2));
  else if(v.t==='arm')withPl(pl2,()=>armFx(pl2,v.i));
  else if(v.t==='slam')withPl(pl2,()=>slamAt(v.x));
  else if(v.t==='geo'){const b={x:v.b[0],y:v.b[1],w:v.b[2],h:v.b[3]};withPl(pl2,()=>{clawGeo(b);hitBoxesWith(b,new Set())})}}}
function netHurtP2(d,kx){const p=pl;if(p.inv>0||p.dead)return;p.inv=.5;nsend({t:'hurt',d:Math.round(d*(hasR('stone')?.8:1)),kx:Math.round(kx)});burst(p.x,p.y-80,'#ff3d6e',8)}
function netHit(e,d,kb){NET.ev.push({t:'hit',i:e.isBoss?'b':e.id,d:Math.round(d),kb:Math.round(kb)});e.flash=.14;if(pl){pl.hits++;pl.hitsT=1.8}
  const hy=e.y-e.h*.55;sparks(e.x,hy,'#fff3c4',7,Math.sign(kb)||1);ring(e.x,hy,'#ffd27a',d>=30?130:80);sfxHit(d,e);buzz(8);if(d>=30)camKick(.015)}
/* a pickup Kiro touched on the host: save-file effects here, personal effects on Kiro's phone */
function hostP2Pick(k){if(k.type==='tank'&&k.id){META.tanks[k.id]=1;saveMeta()}else if(k.id&&['egg','core','sfang','lore'].includes(k.type)){META.items[k.id]=1;saveMeta();if(k.type==='egg')G.lives=Math.min(5,G.lives+1)}
  else if(k.type==='coin'){G.score+=250;addDust(2)}sfxPick(k.type);nsend({t:'pick',k:k.type,id:k.id||null});ftext(k.x,k.y-40,PICK[k.type].txt,PICK[k.type].col)}

/* ---- host: snapshot of the world, 20 times a second ---- */
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,r0=v=>Math.round(v);
const pState=p=>({x:r0(p.x),y:r0(p.y),vx:r0(p.vx),vy:r0(p.vy),f:p.face,a:r2(p.atk||0),co:p.combo||1,d:r2(p.dashT||0),g:p.ground?1:0,dd:p.dead?1:0,dt:r2(p.deadT||0),hp:r0(p.hp),mx:p.max,en:r0(p.en),
  sh:p.shield||0,fu:r1(p.fury||0),ru:r1(p.run||0),sq:r2(p.squash||0),lt:r2(p.landT||0),sl:p.slam||0,iv:r2(p.inv||0),ae:r1(p.aegis||0),su:r0(p.sup||FY)});
function pStateIn(o,p,keepPos){if(!keepPos){o.x=p.x;o.y=p.y}o.vx=p.vx;o.vy=p.vy;o.face=p.f;o.atk=p.a;o.combo=p.co;o.dashT=p.d;o.ground=!!p.g;o.dead=!!p.dd;o.deadT=p.dt;o.hp=p.hp;o.max=p.mx;o.en=p.en;
  o.shield=p.sh;o.fury=p.fu;o.run=p.ru;o.squash=p.sq;o.landT=p.lt;o.slam=p.sl;o.inv=Math.max(o.inv||0,p.iv);o.aegis=p.ae;o.sup=p.su}
const idOf=o=>o._id||(o._id=++NET.sid);
function snapshot(){const st=G.state==='play'?(G.paused?'pause':TRANS.on?'trans':'play'):G.state;
  const o={t:'w',st,r:ROOM?ROOM.id:null,rq:NET.rq,c:[r0(cam),r0(camY)],lk:lock?1:0,sc:G.score,lv:G.lives,sh:r0(shake),p:pState(pl),
    en:en.map(e=>({i:e.id,k:e.type,x:r0(e.x),y:r0(e.y),f:e.face,s:e.state,vx:r0(e.vx||0),t:r2(e.t||0),hp:r0(e.hp),mx:r0(e.max),fd:r2(e.fade||0),tp:r2(e.tp||0),la:r2(e.la||0),n:e.n||0,w:e.wall||0,sd:r1(e.seed||0)})),
    s:shots.map(s=>({i:idOf(s),x:r0(s.x),y:r0(s.y),vx:r0(s.vx),vy:r0(s.vy),r:s.r,c:s.col,w:s.wave?1:0,cr:s.cres?1:0,l:r2(s.life),f:s.friend?1:0})),
    k:picks.map(k=>({i:idOf(k),x:r0(k.x),y:r0(k.y),k:k.type,f:k.float?1:0,l:r1(k.life||99)})),
    h:hz.map(h=>({i:idOf(h),k:h.kind,x:r0(h.x||0),y:r0(h.y||0),t:r2(h.t||0),a:r2(h.act||0),w:h.w||0,lo:h.low?1:0,d:h.dir||0})),
    x:boxes.map(b=>({i:idOf(b),x:r0(b.x),hp:b.hp,fl:r2(b.flash||0)}))};
  const b=boss;if(b&&!b.dead)o.b={g:b.guard,x:r0(b.x),y:r0(b.y),f:b.face,fr:b.fr||null,sp:r2(b.spin||0),fa:r2(b.fadeT||0),wk:b.weak||0,ph:b.phase,gu:b.guarding?1:0,s:b.state,t:r2(b.t||0),hp:r0(b.hp),mx:r0(b.max),
    vx:r0(b.vx||0),oy:r0(b.oy||0),dy:r0(b.dy||0),hv:r0(b.hov||0),mv:r0(b.mv||0),ax:r0(b.ax||0),ay:r0(b.ay||0),n:b.name||'',w:b.w,h:b.h,sd:r1(b.seed||0),dn:b.dead?1:0};
  if(ally)o.a={x:r0(ally.x),y:r0(ally.y),f:ally.face,s:ally.state,oy:r0(ally.oy||0),ln:ally.line||'',lt:r1(ally.lt||0),sd:r1(ally.seed||0)};
  if(banner)o.bn={i:banner.nid||(banner.nid=++NET.sid),t:banner.t,s:banner.sub||'',l:r1(banner.life)};
  if((NET.metaT-=1)<=0){NET.metaT=20;o.m={ab:META.ab,tanks:META.tanks,guards:META.guards,eq:META.eq,relics:META.relics,dust:META.dust,items:META.items,hard:META.hard||0}}
  return o}
function netHostTick(dt){if(NET.role!=='host'||!coop())return;NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=.05;nsend(snapshot())}}
/* host: smooth Kiro's reported position */
function hostProxyTick(dt){if(!pl2||!coop())return;const L=Math.min(1,dt*20);pl2.x+=(pl2.tx-pl2.x)*L;pl2.y+=(pl2.ty-pl2.y)*L;pl2.inv=Math.max(0,pl2.inv-dt)}

/* ---- joining phone ---- */
const CM={en:new Map(),s:new Map(),k:new Map(),h:new Map(),x:new Map()};
function clearClientMaps(){for(const k in CM)CM[k].clear()}
function clientStart(m){NET.started=true;NET.realMeta=META;META=freshMeta();if(m.m)Object.assign(META,m.m);META.arm=NET.realMeta.arm!=null?-1:-1;
  pl=newPlayer();pl.p2=1;pl.max=maxHP();pl.hp=pl.max;pRemote={face:1,x:0,y:0,tx:0,ty:0};G.state='play';G.paused=false;hideCard();padShow(true);clearInput();NET.rqSeen=-1;
  G.score=m.sc;G.lives=m.lv;showBanner('Co-op','You are Kiro',2)}
function clientApply(m){if(m.m){const arm=META.arm;Object.assign(META,m.m);META.arm=arm;padAbilities()}
  NET.hostState=m.st;G.score=m.sc;G.lives=m.lv;NET.hc=m.c;
  if(m.r&&m.rq!==NET.rqSeen&&ROOMS[m.r]){NET.rqSeen=m.rq;const hp=pl.hp,en0=pl.en;enterRoom(m.r,{x:clamp(m.p.x-110,120,ROOMS[m.r].w*CW-120),y:m.p.y});pl.hp=hp;pl.en=en0;clearClientMaps();
    pRemote.x=pRemote.tx=m.p.x;pRemote.y=pRemote.ty=m.p.y}
  if(!ROOM||ROOM.id!==m.r)return;
  lock=!!m.lk;shake=Math.max(shake,(m.sh||0)*.6);
  pStateIn(pRemote,m.p,1);pRemote.tx=m.p.x;pRemote.ty=m.p.y;if(Math.abs(pRemote.x-m.p.x)>500){pRemote.x=m.p.x;pRemote.y=m.p.y}
  en=syncMap(CM.en,m.en,d=>{const T=ETYPES[d.k]||ETYPES.g;return{id:d.i,type:d.k,x:d.x,y:d.y,w:T.w,h:T.h,fly:T.fly,heavy:T.heavy,flash:0,hy:d.y}},(o,d)=>{
      if(d.hp<o.hp&&o.hp!=null){o.flash=.14;ftext(o.x,o.y-o.h-10,Math.round(o.hp-d.hp),o.hp-d.hp>=30?'#ffd27a':'#fff',o.hp-d.hp>=30);burst(o.x,o.y-o.h*.55,'#ffd27a',5,450)}
      o.tx=d.x;o.ty=d.y;o.face=d.f;o.state=d.s;o.vx=d.vx;o.t=d.t;o.hp=d.hp;o.max=d.mx;o.fade=d.fd;o.tp=d.tp;o.la=d.la;o.n=d.n;o.wall=d.w;o.seed=d.sd},
    o=>{burst(o.x,o.y-o.h/2,'#ff4fd8',26,800);ring(o.x,o.y-o.h/2,'#ff4fd8',160);souls(o.x,o.y-o.h/2);explode(o);sfxEnemyDie(o)});
  if(m.b){const d=m.b;if(!boss||boss._g!==d.g){boss={isBoss:true,_g:d.g,guard:d.g,x:d.x,y:d.y,flash:0,seed:d.sd};if(d.g!=null)bossTex(GUARD[d.g].art);musicFor()}
    const b=boss;if(d.hp<b.hp){b.flash=.14;ftext(b.x,b.y-b.h-20,Math.round(b.hp-d.hp),'#ffd27a',b.hp-d.hp>=30)}
    Object.assign(b,{tx:d.x,ty:d.y,face:d.f,fr:d.fr,spin:d.sp,fadeT:d.fa,weak:d.wk,phase:d.ph,guarding:d.gu,state:d.s,t:d.t,hp:d.hp,max:d.mx,vx:d.vx,oy:d.oy,dy:d.dy,hov:d.hv,mv:d.mv,ax:d.ax,ay:d.ay,name:d.n,w:d.w,h:d.h})}
  else if(boss){boss=null;musicFor()}
  shots=syncMap(CM.s,m.s,d=>({x:d.x,y:d.y,_new:1}),(o,d)=>{if(o._new&&!d.f){o._new=0;sfxEnemy('shot',{x:d.x,y:d.y,type:'d'})}Object.assign(o,{tx:d.x,ty:d.y,vx:d.vx,vy:d.vy,r:d.r,col:d.c,wave:!!d.w,cres:!!d.cr,life:d.l,friend:!!d.f})});
  picks=syncMap(CM.k,m.k,d=>({x:d.x,y:d.y}),(o,d)=>Object.assign(o,{tx:d.x,ty:d.y,type:d.k,float:!!d.f,life:d.l}));
  hz=syncMap(CM.h,m.h,d=>({x:d.x,y:d.y}),(o,d)=>{if(o.t>0&&d.t<=0&&d.k!=='fire'&&d.k!=='quake'){S.boom();if(d.k==='rock')burst(d.x,FY-20,'#c8b8a0',14,600)}Object.assign(o,{kind:d.k,x:d.x,y:d.y,t:d.t,act:d.a,w:d.w,low:!!d.lo,dir:d.d})});
  boxes=syncMap(CM.x,m.x,d=>({x:d.x,hp:d.hp}),(o,d)=>{if(d.hp<o.hp)sfxCrate(d.hp<=0?1:0);Object.assign(o,{x:d.x,hp:d.hp,flash:d.fl})},o=>{burst(o.x,FY-50,'#ffd27a',18,700);debris(o.x,FY-90,'crate')});
  if(m.a){if(!ally){ally={x:m.a.x,y:m.a.y,w:90,h:200};bossTex('sable')}Object.assign(ally,{tx:m.a.x,ty:m.a.y,face:m.a.f,state:m.a.s,oy:m.a.oy,line:m.a.ln,lt:m.a.lt,seed:m.a.sd})}else ally=null;
  if(m.bn&&m.bn.i!==NET.bnSeen){NET.bnSeen=m.bn.i;showBanner(m.bn.t,m.bn.s,m.bn.l)}}
function syncMap(map,arr,make,upd,gone){const seen=new Set(),out=[];for(const d of arr||[]){let o=map.get(d.i);if(!o){o=make(d);map.set(d.i,o)}upd(o,d);seen.add(d.i);out.push(o)}
  for(const [k,o] of map)if(!seen.has(k)){map.delete(k);if(gone)gone(o)}return out}
function clientUpdate(dt){if(banner){banner.life-=dt;if(banner.life<=0)banner=null}
  lvT+=dt;shake*=Math.pow(.015,dt);if(shake<.4)shake=0;flashT-=dt;const L=Math.min(1,dt*16);
  for(const e of en){e.x+=(e.tx-e.x)*L;e.y+=(e.ty-e.y)*L;e.flash-=dt;if(e.type==='t'&&e.t<.7&&!e.n){const px=e.x+(e.wall||1)*22,py=e.y-45,wa=(e.wall||1)>0?e.la:Math.PI-e.la,c=Math.cos(wa),s=Math.sin(wa);OV.lines.push([px+c*62,py+s*62,px+c*1760,py+s*1760,e.t<.25?.85:.35])}}
  if(boss){boss.x+=(boss.tx-boss.x)*L;boss.y+=(boss.ty-boss.y)*L;boss.flash-=dt;if(boss.state==='aim')OV.lines.push([boss.x+boss.face*140,boss.y-boss.h*.55,boss.ax,boss.ay,boss.t>.25?.45:.95])}
  if(pRemote){pRemote.x+=(pRemote.tx-pRemote.x)*L;pRemote.y+=(pRemote.ty-pRemote.y)*L}
  if(ally){ally.x+=(ally.tx-ally.x)*L;ally.y+=(ally.ty-ally.y)*L}
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.x+=(s.tx-s.x)*L*.3;s.y+=(s.ty-s.y)*L*.3}
  for(const k of picks){k.x+=(k.tx-k.x)*L;k.y+=(k.ty-k.y)*L}
  const p=pl;if(p.dead){p.deadT+=dt;NET.respawnT-=dt;if(NET.respawnT<=0){p.dead=0;p.hp=p.max;p.inv=2.5;const rx=clamp(pRemote.x-120,120,RW-120);plTeleport(rx,pRemote.y);ring(p.x,p.y-90,'#ffe08a',200);sfxRevive();showBanner('Back on your feet','',1.2)}}
  else{updPlayerPre(dt);plPush();physStep(dt);plPull();updPlayerPost(dt)}
  if(p.x<75||p.x>RW-75){const nx=clamp(p.x,75,RW-75);PHY.pb.x=nx-42;p.x=nx;PHY.pb.velocity.x=0;p.vx=0}
  if(lock||boss){cam+=(NET.hc[0]-cam)*Math.min(1,dt*6);camY+=(NET.hc[1]-camY)*Math.min(1,dt*6)}else updCamera(dt);
  updAtmos(dt);
  NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=1/30;nsend({t:'s',rq:NET.rqSeen,p:pState(p),ev:NET.ev.length?NET.ev:undefined});NET.ev=[]}
  if(NET.hostState!=='play'&&NET.hostState!=='trans'&&!banner)showBanner(NET.hostState==='pause'?'Host paused':NET.hostState==='over'?'Tyko is down':'Waiting for host','',.6);
  clearP()}
</script>
