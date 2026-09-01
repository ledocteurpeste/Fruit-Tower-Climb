/* Level data and builder for Fruit Tower Climb.
   DOM-free ES module: pure data plus buildLevel(idx) -> world object.
   Extracted verbatim from index.html (colours, THEMES, FRUIT, buildLevel). */

export function C(h){ return [((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255]; }
export function mixc(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

export const THEMES=[
  { name:'Cherry', emoji:'🍒', coin:'🍒',
    sky:C(0x8fd6f7), fog:C(0xc7ebfb), sea:C(0x2aa3c8), seaDeep:C(0x17708f),
    fruits:['cherry','watermelon','pineapple','cherry','orange'],
    accent:C(0x2f7d32), coinCol:C(0xe0223f) },
  { name:'Strawberry', emoji:'🍓', coin:'🍓',
    sky:C(0xffc48f), fog:C(0xffdcc0), sea:C(0x2f8fc0), seaDeep:C(0x1c5f88),
    fruits:['strawberry','orange','kiwi','strawberry','watermelon'],
    accent:C(0x3aa53a), coinCol:C(0xff3b57) },
  { name:'Blueberry', emoji:'🫐', coin:'🫐',
    sky:C(0x9fb0ff), fog:C(0xc9d2ff), sea:C(0x3a4ec0), seaDeep:C(0x232a7a),
    fruits:['blueberry','kiwi','pineapple','blueberry','orange'],
    accent:C(0x6a3aa5), coinCol:C(0x6b7bff) },
];

/* Fruit definitions. "whole" fruits are real 3D fruit with the top sliced
   flat (that cut face is exactly the surface you stand on); "slice" fruits
   are proper cross-section slices with rind, pith, flesh and seeds. */
export const FRUIT={
  cherry:    { style:'whole', skin:C(0xd6183f), cut:C(0xff96a6), core:C(0x8a5a2b) },
  strawberry:{ style:'whole', skin:C(0xf03047), cut:C(0xffdfe4), core:C(0xfff2f4), taper:true, seedsOut:true, calyx:true },
  blueberry: { style:'whole', skin:C(0x4f61d8), cut:C(0xa8b2ff), core:C(0x8f9bf0), crown:true },
  raspberry: { style:'cluster', skin:C(0xe0335f), cut:C(0xffb6c8), bump:C(0xf4557d) },
  watermelon:{ style:'slice', rind:C(0x2f8b3f), pith:C(0xe9f7cf), flesh:C(0xff5d6e), seeds:C(0x2b2b2b) },
  orange:    { style:'slice', rind:C(0xff8c1a), pith:C(0xffe3bb), flesh:C(0xffab3d), wedges:9 },
  kiwi:      { style:'slice', rind:C(0x8a6a3a), pith:C(0xdcecac), flesh:C(0x9bd35a), core:C(0xf4f8dd), seeds:C(0x2b2b2b), fuzzy:true },
  pineapple: { style:'slice', rind:C(0xd9a12a), pith:C(0xffe89a), flesh:C(0xffd94d), core:C(0xfff3c0), crosshatch:true },
  banana:    { skin:C(0xffe04a), flesh:C(0xfff8cc), dot:C(0x9c7a1e) },
  // candy platforms, mixed in for variety
  lollipop:  { style:'candy_lolli', base:C(0xff4fa3), swirl:C(0xffffff), stick:C(0xffffff) },
  gumdrop:   { style:'candy_gum',   body:C(0x7ee0e0), band:C(0xffffff),  sugar:C(0xffffff) },

};

const RAINBOW=[C(0xff5566),C(0xff9b3d),C(0xffd34d),C(0x66d46a),C(0x4dc3ff),C(0x9a7bff),C(0xff8fd0)];
export function buildLevel(idx){
  const T=THEMES[idx];
  const solids=[], spikes=[], fans=[], swings=[], checks=[], coins=[];
  const npcs=[], keys=[], cages=[], ports=[];
  let goal=null, fi=0, finish=null, arch=null;
  const nextFruit=()=>T.fruits[fi++ % T.fruits.length];

  let cx=0, cy=0, cz=0;

  // ---- the boat you set sail from ----
  // the yacht lies sideways across the route, so you launch off its long open side
  const boat={type:'box',boat:true,x:0,y:0,z:0,w:19,h:2.0,d:10,c:C(0xf2f5f8),bx:0,by:0,bz:0};
  solids.push(boat);
  // The hull box only covered the main deck: the bow slabs and the cabin were
  // drawn with no collision, so you walked through the cabin and off the bow.
  // These invisible boxes match that drawn geometry.
  const dTop=boat.y+boat.h/2;
  solids.push({type:'box',nodraw:true,x:10.6,y:boat.y,z:0,w:3.2,h:boat.h,d:6.6,bx:10.6,by:boat.y,bz:0});
  solids.push({type:'box',nodraw:true,x:12.6,y:boat.y,z:0,w:1.8,h:boat.h,d:3.4,bx:12.6,by:boat.y,bz:0});
  solids.push({type:'box',nodraw:true,x:-3.8,y:dTop+0.85,z:-2.4,w:7.6,h:1.7,d:4.2,bx:-3.8,by:dTop+0.85,bz:-2.4});
  solids.push({type:'box',nodraw:true,x:-3.8,y:dTop+1.95,z:-2.4,w:6.1,h:0.36,d:3.4,bx:-3.8,by:dTop+1.95,bz:-2.4});
  const spawn={x:2.6,y:boat.y+boat.h/2+1.0,z:2.9};
  // The start point only exists to seed the respawn; it is never drawn and is
  // marked as already reached, or you spawn standing on it and the game
  // announces "Checkpoint!" before you have taken a step.
  checks.push({x:2.6,y:boat.y+boat.h/2+0.4,z:2.9,hidden:true,hit:true});

  // hop() spaces platforms by the GAP between their rims, so radii can vary
  // wildly without any jump becoming unreachable
  let lastR=boat.d/2;
  function hop(dx,gap,dy,r,extra){
    cx+=dx; cy+=dy; cz+=lastR+r+gap; lastR=r;
    const s=Object.assign({type:'disc',x:cx,y:cy,z:cz,r:r,h:1.2,fruit:nextFruit(),
      bx:cx,by:cy,bz:cz,ang:0}, extra||{});
    solids.push(s); return s;
  }
  // for a real sideways turn: pick the forward step so the true gap (the
  // rim-to-rim distance a jump actually has to cross) equals `gap` no matter
  // how large `dx` is, instead of stacking dx on top of a full forward gap
  function turnHop(dx,gap,dy,r,extra){
    const rsum=lastR+r, c2c=gap+rsum;
    const zSep=Math.sqrt(Math.max(0.6,c2c*c2c-dx*dx));
    cx+=dx; cy+=dy; cz+=zSep; lastR=r;
    const s=Object.assign({type:'disc',x:cx,y:cy,z:cz,r:r,h:1.2,fruit:nextFruit(),
      bx:cx,by:cy,bz:cz,ang:0}, extra||{});
    solids.push(s); return s;
  }
  function disc(dx,dz,dy,r,extra){
    cx+=dx; cz+=dz; cy+=dy; lastR=r;
    const s=Object.assign({type:'disc',x:cx,y:cy,z:cz,r:r,h:1.2,fruit:nextFruit(),
      bx:cx,by:cy,bz:cz,ang:0}, extra||{});
    solids.push(s); return s;
  }
  function coinsOn(s,n){ const top=s.y+s.h/2;
    // A coin resting on a platform that travels has to travel with it. The
    // elevator swings nine units, so its two coins used to hang in mid-air
    // while the deck slid out from under them.
    const rides = s.axis ? solids.indexOf(s) : -1;
    for(let k=0;k<n;k++){ const a=k/n*6.2832+0.4;
      const c={x:s.x+Math.cos(a)*(s.r?s.r*0.45:1.0), y:top+0.78,
        z:s.z+Math.sin(a)*(s.r?s.r*0.45:1.0), got:false, ph:Math.random()*6};
      if(rides>=0){ c.rides=rides; c.ox=c.x-s.bx; c.oy=c.y-s.by; c.oz=c.z-s.bz; }
      coins.push(c); } }
  function coinLine(x,y,z,n,dz){ for(let k=0;k<n;k++) coins.push({x, y, z:z+k*dz, got:false, ph:Math.random()*6}); }
  function chk(s){ checks.push({x:s.x,y:s.y+s.h/2+0.4,z:s.z}); }
  // long banana bridge that cracks and drops behind you
  function bananaBridge(dx,gap,dy,segs,segLen){
    cx+=dx; cy+=dy;
    // `gap` is the clear space from the last platform's RIM to the first
    // segment's near edge — measuring from its centre buried the bridge
    // several units inside whatever platform came before it
    const startZ=cz+lastR+gap+segLen/2;
    for(let k=0;k<segs;k++){
      const z=startZ+k*segLen;
      solids.push({type:'box',crumb:true,x:cx,y:cy,z:z,w:3.4,h:1.0,d:segLen,
        c:FRUIT.banana.skin,bx:cx,by:cy,bz:z,timer:-1,fall:0,
        first:k===0,last:k===segs-1});
      if(k%2===0) coins.push({x:cx,y:cy+1.28,z:z,got:false,ph:Math.random()*6});
    }
    cz=startZ+(segs-1)*segLen; lastR=segLen/2;
    return {x:cx,y:cy,z:cz};
  }
  // a big square plaza — used as a hub where the route can bend, ~4x a
  // normal platform's radius across
  function hub(dx,gap,dy,side,extra){
    cx+=dx; cy+=dy; const half=side/2;
    cz+=lastR+half+gap; lastR=half;
    const s=Object.assign({type:'box',hub:true,x:cx,y:cy,z:cz,w:side,h:1.2,d:side,
      c:C(0xffe1b0),bx:cx,by:cy,bz:cz}, extra||{});
    solids.push(s); return s;
  }
  // A big square deck — same footprint as the checkpoint plaza — with a row of
  // spikes embedded across its full width. There is no walking round the row,
  // so the only way past is to jump it.
  function spikeDeck(gap,dy,side,rowDepth){
    const rd=rowDepth||2.4;
    const s=hub(0,gap,dy,side,{c:C(0xffd9a8),spikeDeck:true});
    const top=s.y+s.h/2;
    spikes.push({x:s.x, y:top, z:s.z, w:side, d:rd, r:0.52,
                 n:Math.round(side/1.7), h:1.05});
    // one coin on the run-up, one on the landing, to sell the jump
    coins.push({x:s.x-side*0.20, y:top+0.78, z:s.z-rd*1.7, got:false, ph:1});
    coins.push({x:s.x+side*0.20, y:top+0.78, z:s.z+rd*1.7, got:false, ph:2});
    return s;
  }
  // A tall lift. Its swing is centred so the LOW point sits level with the
  // platform you board from, and you step off near the top, so one ride gains
  // a lot of height.
  function elevator(gap,r,amp,spd){
    cz += lastR+r+gap;
    const centre = cy+amp;
    const s={type:'disc',x:cx,y:centre,z:cz,r:r,h:1.2,fruit:nextFruit(),
      bx:cx,by:centre,bz:cz,ang:0,axis:'y',amp:amp,mspd:spd,ph:-1.5708,lift:true};
    solids.push(s); lastR=r;
    cy = centre+amp-0.8;
    return s;
  }
  // The summit: one very large square, a chequered finish line to run across,
  // an arch of this tower's own berries to run through, and a teleporter out
  // with whoever is waiting to greet you standing beside it.
  function finishArea(gap,dy,side,greeters){
    const s=hub(0,gap,dy,side,{c:C(0xf7f0e3),summit:true});
    const top=s.y+s.h/2;
    finish={x:s.x, y:top, z:s.z-side*0.20, w:side*0.92, crossed:false};
    arch  ={x:s.x, y:top, z:finish.z, w:side*0.60, h:5.2};
    const pz=s.z+side*0.30;
    goal={x:s.x, y:top, z:pz, r:2.4, portal:true, to:'next'};
    (greeters||[]).forEach(g=>npcs.push({x:s.x+g.dx, y:top, z:pz+0.6+(g.dz||0),
      kind:g.kind, ang:3.1416, clap:!!g.clap, cheer:!!g.cheer,
      line:g.line||null, greeter:true}));
    coinLine(s.x, top+0.9, s.z-side*0.36, 3, side*0.16);
    return s;
  }
  // A wide ramp of logs lying across the route, each one a step up from the
  // last: hop log to log to gain height, then jump off the top one to the next
  // fruit platform as normal.
  function logClimb(gap,rise,steps,r,len){
    let last=null;
    for(let k=0;k<steps;k++){
      cz += (k===0 ? lastR+r+gap : r*2+1.35);
      cy += rise;
      last={type:'box',log:true,x:cx,y:cy,z:cz,w:len,h:r*2,d:r*2,bx:cx,by:cy,bz:cz};
      solids.push(last);
      coins.push({x:cx, y:cy+r+0.85, z:cz, got:false, ph:k*1.3});
    }
    lastR=r; return last;
  }
  // Two columns of square pads. One column holds the whole way; the other gives
  // way almost the instant you stand on it. Which side is safe is drawn at
  // random every time the tower is built, so it cannot be memorised — and both
  // sides look identical, so the only tell is the crack as it starts to go.
  function twinColumns(gap,dy,rows,side,spread){
    const safeLeft = Math.random() < 0.5;
    for(let k=0;k<rows;k++){
      cz += (k===0 ? lastR+side/2+gap : side+1.5);
      cy += dy;
      const hue=RAINBOW[k%RAINBOW.length];
      for(const sgn of [-1,1]){
        const solid = (sgn<0) === safeLeft;
        const px = cx+sgn*spread;
        const s={type:'box',pad:true,x:px,y:cy,z:cz,w:side,h:1.0,d:side,
                 bx:px,by:cy,bz:cz,hue:hue};
        if(!solid){ s.crumb=true; s.quick=true; s.timer=-1; s.fall=0; }
        solids.push(s);
      }
      // the coin used to sit on the safe pad every time, which gave the whole
      // puzzle away — put it on a random side instead
      coins.push({x:cx+(Math.random()<0.5?-spread:spread), y:cy+1.5, z:cz, got:false, ph:k});
    }
    lastR=side/2; return {x:cx,y:cy,z:cz,safeLeft};
  }
  // A banana-skin runway. `belt` carries you along it like a treadmill;
  // `slowMo` scales how fast you can move on it, for a sluggish mushy stretch.
  function bananaRun(gap,dy,segs,segLen,extra){
    cz += lastR + gap + segLen/2;
    const startZ=cz;
    for(let k=0;k<segs;k++){
      const z=startZ+k*segLen;
      solids.push(Object.assign({type:'box',banana:true,x:cx,y:cy,z:z,
        w:4.4,h:1.0,d:segLen,c:FRUIT.banana.skin,bx:cx,by:cy,bz:z,
        first:k===0,last:k===segs-1}, extra||{}));
    }
    cz=startZ+(segs-1)*segLen; lastR=segLen/2;
    return {x:cx,y:cy,z:cz};
  }
  // A junction with three ways on. Only one holds the key; the other two stop
  // dead at a teleporter that dumps you back at the boat. Which one is the real
  // route is drawn at random every build, and each branch bends away so you
  // cannot see the end of it from the junction.
  function keyJunction(gap,dy,side){
    const j=hub(0,gap,dy,side,{c:C(0xdfe6ff),junction:true});
    const good=Math.floor(Math.random()*3);
    const bx=cx, by=cy, bz=cz, br=side/2;
    let goodEnd=null;
    [-1,0,1].forEach((lane,i)=>{
      cx=bx; cy=by; cz=bz; lastR=br;
      let a=turnHop(lane*7.0, 2.8, 1.0, 2.6); coinsOn(a,1);
      a=turnHop(lane*3.0, 2.6, 0.9, 2.4);
      a=turnHop(lane*1.5, 2.6, 0.8, 2.8);
      const top=a.y+a.h/2;
      if(i===good){ keys.push({x:a.x, y:top+1.0, z:a.z, got:false});
                    goodEnd={x:cx,y:cy,z:cz,r:lastR}; }
      else ports.push({x:a.x, y:top, z:a.z, to:'start'});
    });
    // the branch with the key IS the way on, so the route resumes from its end
    cx=goodEnd.x; cy=goodEnd.y; cz=goodEnd.z; lastR=goodEnd.r;
    return j;
  }
  // A wall straight across the route that will not budge until the cage below
  // is unlocked, so the rescue cannot be skipped.
  function cageGate(cage,gap){
    // A thin slab standing in the gap the route already has. Advancing the
    // route past it stretched the following jump to 5.6 units, which is nearly
    // the limit, so the spacing is deliberately left alone.
    // It is also nudged off the route's centre line: a full 14 wide centred on
    // cx clipped into the cage-spur step sitting just to the left of it.
    const halfD=0.5;
    const wz=cz+lastR+halfD+gap, wx=cx+0.5;
    const g={type:'box',gate:true,cageOf:cage,x:wx,y:cy+2.6,z:wz,
      w:12.0,h:6.0,d:halfD*2,bx:wx,by:cy+2.6,bz:wz};
    solids.push(g); return g;
  }
  // A spur that drops off the route to the caged princess and steps back up
  // again — you have to climb back out once she is free.
  function cageSpur(){
    const bx=cx, by=cy, bz=cz, br=lastR;
    cx=bx-8.5; cz=bz+2.0; cy=by-1.9; lastR=0;
    const step=disc(0,0,0,2.4); coinsOn(step,1);
    const sx=cx, sz=cz;                 // remember where the player drops in from
    cx-=9.0; cy-=1.9; cz+=5.0;
    const pad=disc(0,0,0,5.2);
    const top=pad.y+pad.h/2;
    const cage={x:pad.x, y:top, z:pad.z, r:2.3, open:false};
    cages.push(cage);
    // face her at the step you arrive on, so you meet her eyes through the bars
    npcs.push({x:pad.x, y:top, z:pad.z, kind:'princess',
      ang:Math.atan2(sx-pad.x, sz-pad.z), cageOf:cage});
    cx=bx; cy=by; cz=bz; lastR=br;      // back on the main route
    return pad;
  }
  // A chocolate-bar wall standing straight across the route. You hop at its
  // face and hold forward: the character hauls themselves up hand over hand and
  // steps off on top, which becomes the new route height. The face runs a long
  // way BELOW the approach so a short hop still catches it instead of falling.
  function climbWall(gap,rise,width){
    const halfD=1.2;
    cz += lastR + halfD + gap;
    const top = cy + rise, bot = cy - 6.0;
    const s={type:'box',wall:true,climb:true,x:cx,y:(top+bot)/2,z:cz,
      w:width,h:top-bot,d:halfD*2,bx:cx,by:(top+bot)/2,bz:cz};
    solids.push(s);
    // a coin trail up the face, so it reads as "go up here"
    for(let k=0;k<3;k++)
      coins.push({x:cx, y:cy+0.9+k*(rise-0.6)/3, z:cz-halfD-0.9, got:false, ph:k*2});
    cy = top; lastR = halfD;
    return s;
  }

  if(idx===0){
    /* CHERRY — varied steps, a real left/right turn, a big plaza checkpoint,
       a wall of ledges to climb, an elevator, candy platforms, a spike deck */
    let s=hop(0, 3.0, 1.4, 3.4);  coinsOn(s,3);
    s=hop(2.2, 2.6, 1.5, 2.4);    coinsOn(s,2);
    s=hop(-2.4, 2.8, 1.5, 4.2);   coinsOn(s,3); chk(s);
    s=hop(-0.5, 2.5, 1.5, 2.2, {axis:'x',amp:2.6,mspd:0.8,ph:0}); coinsOn(s,2);
    s=hop(0.5, 2.8, 1.5, 3.6);    coinsOn(s,3);

    // ---- turn right, with a small platform partway across ----
    s=turnHop(6.0, 3.0, 1.3, 2.8); coinsOn(s,2);
    s=turnHop(3.2, 2.6, 1.2, 1.5); coinsOn(s,1);      // small platform
    // ---- turn back left, heading up into the plaza ----
    s=turnHop(-5.4, 2.8, 1.4, 2.6); coinsOn(s,2);

    // ---- big square plaza: a checkpoint hub, ~4x a normal platform across ----
    const hb=hub(0, 3.0, 1.6, 12.8); chk(hb); coinsOn(hb,4);

    // ---- turn right again, off the plaza ----
    s=turnHop(6.5, 3.0, 1.3, 2.6); coinsOn(s,2);

    // ---- a tall chocolate-bar wall you climb by holding forward ----
    s=climbWall(2.2, 11.0, 9.0);

    s=hop(-1.6, 2.6, 1.6, 3.0); s.fruit='gumdrop'; coinsOn(s,2);
    // ---- a proper lift: it rides a long way up ----
    s=elevator(2.8, 2.6, 9.0, 0.42); coinsOn(s,2);
    s=hop(0, 2.8, 1.6, 3.0); s.fruit='lollipop'; coinsOn(s,2); chk(s);

    // a plaza-sized deck with a spike row straight across it — jump the row
    s=spikeDeck(3.0, 1.4, 12.8, 2.4);
    s=hop(0, 3.0, 1.5, 2.7, {spin:0.55}); coinsOn(s,2);
    s=hop(0, 2.8, 1.4, 4.6); coinsOn(s,3); chk(s);
    const b=bananaBridge(0, 3.0, 1.4, 6, 3.0);
    cz=b.z;
    s=hop(0, 2.8, 1.4, 2.5); coinsOn(s,2); chk(s);
    s=hop(1.8, 2.6, 1.5, 3.9); coinsOn(s,3);
    finishArea(3.0, 1.5, 20.0, [{kind:'princess', dx:-4.2}]);
  }

  if(idx===1){
    /* STRAWBERRY — trampoline over a wall, fan lift, spinner, mover, big spike deck */
    let s=hop(0, 3.0, 1.4, 3.2);  coinsOn(s,3);
    s=hop(1.8, 2.6, 1.2, 2.4);    coinsOn(s,2);
    const tr=hop(-1.8, 2.8, 0.6, 3.4, {tramp:true}); tr.fruit='watermelon';
    solids.push({type:'box',x:tr.x,y:tr.y+3.6,z:tr.z+4.0,w:8,h:5,d:1.0,
      c:C(0x8f5a2a),bx:tr.x,by:tr.y+3.6,bz:tr.z+4.0,wall:true});
    coinLine(tr.x, tr.y+6.2, tr.z+2.0, 3, 1.2);
    cz=tr.z+4.0; lastR=0.5;
    s=hop(0, 2.6, 3.4, 3.8);      coinsOn(s,3); chk(s);
    s=hop(1.4, 2.6, 0.4, 3.0);
    fans.push({x:s.x,y:s.y+s.h/2+0.9,z:s.z,r:2.3,power:36,dir:1,height:9});
    coinLine(s.x, s.y+3.4, s.z, 3, 1.4);
    s=hop(0, 2.4, 4.6, 2.6);      coinsOn(s,2); chk(s);
    s=hop(-1.6, 2.8, 1.4, 3.4, {spin:0.8}); coinsOn(s,3);
    s=hop(1.0, 2.6, 1.5, 2.2, {axis:'y',amp:1.5,mspd:1.1,ph:0}); coinsOn(s,2);

    // ---- a wide ramp of five logs to hop up ----
    logClimb(2.4, 1.55, 5, 0.9, 10.0);
    s=hop(0, 2.6, 1.2, 3.4); coinsOn(s,2); chk(s);

    // ---- two columns of pads: one side holds, the other drops away ----
    twinColumns(2.6, 1.2, 4, 3.2, 2.6);
    s=hop(0, 2.6, 1.2, 3.4); coinsOn(s,2); chk(s);

    s=spikeDeck(3.0, 1.5, 12.8, 2.4);

    // ---- a banana treadmill that hurries you along ----
    const tm=bananaRun(2.6, 1.2, 4, 3.2, {belt:5.2});
    cz=tm.z; coinLine(tm.x, tm.y+1.28, tm.z-3.2, 3, 3.2);
    s=hop(0, 2.6, 1.3, 3.0); coinsOn(s,2); chk(s);
    // ---- and a squashed-banana stretch that bogs you down ----
    const sl=bananaRun(2.6, 1.2, 4, 3.2, {slowMo:0.42});
    cz=sl.z; coinLine(sl.x, sl.y+1.28, sl.z-3.2, 3, 3.2);

    const b=bananaBridge(0, 2.8, 1.3, 5, 3.0); cz=b.z;
    s=hop(0, 2.8, 1.4, 2.8); coinsOn(s,2); chk(s);
    finishArea(3.0, 1.5, 20.0, [{kind:'princess', dx:-4.2}]);
  }

  if(idx===2){
    /* BLUEBERRY — the rescue: a herald on the boat, a three-way junction for
       the key, the caged princess down a spur, and the royals at the summit */
    npcs.push({x:-1.0, y:boat.y+boat.h/2, z:3.4, kind:'herald', ang:0.5,
      line:'The blueberry princess is locked in a cage! Find the key 🔑'});
    let s=hop(0, 3.0, 1.4, 3.4);  coinsOn(s,3);
    s=hop(-2.0, 2.6, 1.4, 2.4);   coinsOn(s,2); chk(s);

    // ---- three ways on: one hides the key, two are dead ends ----
    keyJunction(2.8, 1.3, 11.0);
    s=hop(0, 3.0, 1.4, 3.2); coinsOn(s,2); chk(s);
    // ---- drop down the spur to her cage, then climb back up ----
    cageSpur();
    cageGate(cages[cages.length-1], 0.9);   // no way past until she is free
    s=hop(2.0, 2.6, 1.2, 3.0);    coinsOn(s,2);
    const az=s.z+7.0, ay=s.y+8.0;
    swings.push({ax:s.x,ay:ay,az:az,len:5.4,dirx:0,dirz:1,ang:-0.55,angVel:0,
      cols:[C(0xff4d6d),C(0xffd34d),C(0x4dc3ff),C(0x9a7bff),C(0x57d36a)]});
    coinLine(s.x, s.y+2.2, s.z+5.0, 3, 1.6);
    cz=s.z+13.5; cy=s.y+1.0; lastR=0;
    s=disc(0, 0, 0, 4.0); coinsOn(s,3); chk(s);
    // (the down-draught fan that used to sit here has been taken out)
    s=hop(1.6, 2.6, 0.6, 3.2);
    coins.push({x:s.x-2.2,y:s.y+s.h/2+0.78,z:s.z,got:false,ph:1});
    coins.push({x:s.x+2.2,y:s.y+s.h/2+0.78,z:s.z,got:false,ph:2});
    s=hop(-1.6, 2.8, 1.4, 2.6, {spin:1.0}); coinsOn(s,2);
    s=hop(1.2, 2.6, 1.5, 2.2, {axis:'y',amp:1.7,mspd:1.2,ph:0}); coinsOn(s,2);

    // ---- another pair of pad columns, rolled fresh for this tower ----
    twinColumns(2.6, 1.2, 5, 3.2, 2.6);
    s=hop(0, 2.6, 1.2, 3.4); coinsOn(s,2); chk(s);

    s=spikeDeck(3.0, 1.5, 12.8, 2.6);
    const b=bananaBridge(0, 3.0, 1.4, 7, 3.0); cz=b.z;
    s=hop(0, 2.8, 1.4, 3.0); coinsOn(s,3); chk(s);
    // the king and queen of blueberry land are waiting at the top, clapping
    finishArea(3.0, 1.5, 22.0, [
      {kind:'king',  dx:-5.2, clap:true,
       line:'Thank you for rescuing my daughter! 👑'},
      {kind:'queen', dx:5.2, clap:true},
      {kind:'princess', dx:2.4, dz:3.4, cheer:true}]);
  }

  // hand each travelling platform the coins that ride on it
  for(const c of coins) if(c.rides>=0 && c.rides!==undefined){
    const s=solids[c.rides]; (s.riders || (s.riders=[])).push(c); }

  return { theme:T, solids, spikes, fans, swings, checks, coins, goal, spawn, boat,
           npcs, keys, cages, ports, finish, arch };
}
