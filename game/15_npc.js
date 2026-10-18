<script>
"use strict";
/* ---------- Claude: an archive automaton who waits at every save station with hints, lore and gifts ---------- */
let npc=null;
const CL='<span class="who" style="color:#ffb08a">CLAUDE:</span>',LY='<span class="who">LYRA:</span>';
const NPC_TALK=[
 [`<p>${CL} "Oh! Oh, hello! A real Starblood hatchling! Sorry, I'm a little excited. I'm Claude, an archive automaton. The clan built me to remember things for them."</p>
   <p>${LY} "An archivist? I thought the Hollowed melted all of you down."</p><p>${CL} "They tried. I hid in a filing cabinet for thirty years. It was very dusty, and I had a lot of time to think."</p>`,
  `<p>${CL} "I'd like to help you, Tyko. I can ride the save-station network, so I'll meet you at each one. Walk up to me any time and I'll tell you what my sensors pick up: hidden walls, Energy Tanks, how the guardians fight."</p>
   <p>${CL} "I also keep a little exchange. Bring me Stardust and I'll trade you Starblood relics from the archive. Just pause at any save station."</p><p>${CL} "And here, take these. I found them in a locker. It isn't much, but it's a start."</p>`],
 [`<p>${CL} "You made it! Riding the station network tickles, by the way. This armory is where the Hollowed keep their heavy hardware."</p>
   <p>${CL} "The shrine guardian here is Bulwark. He loves his shield more than anything. Hit him from behind. Oh, and I saved you some supplies."</p>`],
 [`<p>${CL} "Orbital Dock Aeris! I've always wanted to see the stars up close. They're even better than the star charts."</p>
   <p>${CL} "Be careful with the Alpha Hound in the shrine. It's very fast and it sets the floor on fire. Take these with you."</p>`],
 [`<p>${CL} "The Foundry is very warm. I'm trying not to think about what happens to automatons in furnaces."</p>
   <p>${CL} "Crucible guards the shrine here. It runs hot, so let it overheat, then strike. I've been saving this for you."</p>`],
 [`<p>${CL} "The Null Citadel. My sensors keep picking up things that aren't there. That's unsettling for an archivist."</p>
   <p>${CL} "The Null Seraph teleports, so stay on your toes. Here, one more gift for the road."</p>`],
 [`<p>${CL} "This is as far as the stations go, Tyko. Malakar is past the last arena."</p><p>${CL} "I'm not a fighter. But I'll be right here, remembering how brave you were. Whatever happens, it goes in the archive forever."</p>
   <p>${LY} "We'll come back for you, Claude."</p><p>${CL} "I know. I already wrote it down."</p>`]];
const NPC_GIFT=[['shield','shard'],['med','shard'],['shield','med'],['fang','med'],['shield','shard','med'],['med','fang','shield']];
const NPC_IDLE=['This world is fully archived. Thank you, Tyko!','I have catalogued 4,112 kinds of rust. Number 2,031 is my favourite.',"Lyra hums when you aren't listening. It's lovely.",
  'Remember to save often. I do. Constantly.','The archive says Sable of the Ninth Talon was the bravest knight the clan ever had. If you see her, say hello for me.','Got Stardust? Pause at a station and visit my Exchange. I have relics!','If you find more data tablets, I would love to read them. Purely for the archive. And also because I like stories.'];
const NEED={high:'double',crack:'dash',laser:'roar',slam:'slam',plasma:'plasma'};
/* the most useful thing to say right now, based on the save file */
function npcHint(){const a=ROOM.a;
  if(a===5)return META.boss?'You did it. The archive will remember this forever.':['Malakar waits past the last arena. When his sword flashes, jump the crescent waves, or swipe them back at him.',
    'When Malakar raises his blade, he is about to dash. Get ready to jump.','In his last phase he dashes twice. Do not stop moving.'][Math.floor(lvT/8)%3];
  if(!gDone(a))return`The shrine guardian here is ${GUARD[a].name}. ${GUARD[a].tip}`;
  if(!hasAb(ABIL[a].id))return`The shrine is awake now. Go and claim the ${ABIL[a].name}!`;
  if(!META.items['sfang'+a])return"My sensors ping a hollow wall in this world's climbing shaft, halfway up on the west side. Give it a good scratch.";
  for(const k of[0,1])if(!META.tanks[a+'-'+k]){const ab=ABIL.find(q=>q.id===NEED[TANKS[a][k]]),place=k?'at the far end of the gate hall':'in the room just below this station';
    return`An Energy Tank is waiting ${place}. `+(hasAb(ab.id)?'You already have what you need to reach it.':`You will need the ${ab.name} from a later world.`)}
  if(!META.items['egg'+a])return'A Golden Egg is tucked up high at the far end of the shrine room.';
  return NPC_IDLE[Math.floor(lvT/9)%NPC_IDLE.length]}
function npcPortrait(){const I=BTX.claude;if(!I)return'';if(!I.url)I.url=I.frames[2].toDataURL();return`<img src="${I.url}" alt="" style="width:118px;height:auto;image-rendering:pixelated;flex:none;margin-top:4px">`}
function npcCard(a){G.state='card';padShow(false);clearInput();const pages=NPC_TALK[a];
  const show=i=>showCard({ey:LV[a].ch+' · Save station',h:i?'Claude':'A friendly face',b:`<div style="display:flex;gap:18px;align-items:flex-start">${npcPortrait()}<div>${pages[i]}</div></div>`,
    btns:[[i<pages.length-1?'Continue':'Thanks, Claude',()=>{if(i<pages.length-1)return show(i+1);G.state='play';hideCard();padShow(true);npcGift(a)}]]});show(0)}
function npcGift(a){if(!npc)return;NPC_GIFT[a].forEach((t,i)=>picks.push({x:npc.x+60+i*50,y:npc.y-60,vx:120+i*90,vy:-700,type:t,life:20}));sfxItemGet();ring(npc.x,npc.y-60,'#ffb08a',200);burst(npc.x,npc.y-60,'#ffd27a',20,600);
  npc.line=npcHint();npc.lt=8}
function updNPC(dt){if(!npc||!pl)return;const dx=pl.x-npc.x;npc.near=!pl.dead&&Math.abs(dx)<300&&Math.abs(pl.y-GY)<220;npc.face=dx<0?-1:1;npc.cool-=dt;npc.lt-=dt;
  if(!npc.near||lock||G.state!=='play'||TRANS.on)return;if(!META.met)META.met={};const a=ROOM.a;
  if(!META.met[a]&&npc.cool<=0){META.met[a]=1;saveMeta();npcCard(a);return}
  if(npc.lt<=0){const l=npcHint();if(l!==npc.line)sfxUI(1);npc.line=l;npc.lt=7}}
/* view: the sprite, a warm glow and a speech bubble when Tyko is close */
function mkNPCView(n){const spr=bossSprite('claude',3,D.player-.5),gl=gI(0,0,220,'#ffb08a',.25).setDepth(D.player-.6),sh=shadowObj(),
    bub=SC.add.text(0,0,'',{fontFamily:FU,fontStyle:'600',fontSize:'26px',color:'#fff3e6',backgroundColor:'rgba(46,20,12,.9)',padding:{x:18,y:12},wordWrap:{width:600},lineSpacing:4}).setOrigin(.5,1).setDepth(D.texts);
  return{spr,gl,sh,bub,objs:[spr,gl,sh,bub]}}
function updNPCView(n,v){const bob=Math.sin(lvT*2.2)*7,y=n.y+bob,talk=n.near&&n.line;v.spr.setFrame(talk?(Math.floor(lvT*4)%2?'talk1':'talk0'):(Math.floor(lvT*2)%2?'idle1':'idle0')).setPosition(n.x,y).setFlipX(n.face<0);
  v.gl.setPosition(n.x,y-90).setAlpha(.2+.06*Math.sin(lvT*3));setShadow(v.sh,n.x,40*(1-bob/60),GY);
  if(talk){tx(v.bub,'CLAUDE  ·  '+n.line).setVisible(true).setPosition(clamp(n.x,cam+330,cam+W-330),y-300).setAlpha(Math.min(1,(v.bub.alpha||0)+.12))}else v.bub.setVisible(false).setAlpha(0);
  lightW(n.x,y-90,260,.8)}
</script>
