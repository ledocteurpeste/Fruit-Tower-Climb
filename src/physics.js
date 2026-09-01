import { player, world, run, opts, GRAV, JUMP, MOVE, TRAMP, AIR, CLIMB, resetPlayerTo } from './state.js';
import { hooks } from './hooks.js';

/* =========================================================================
   PHYSICS
   ========================================================================= */
export function aabbH(px,py,pz,s){ const eps=0.06;
  return Math.abs(px-s.x)<player.r+s.w/2-1e-4 && Math.abs(pz-s.z)<player.r+s.d/2-1e-4 &&
    (py+player.hh)>(s.y-s.h/2)+eps && (py-player.hh)<(s.y+s.h/2)-eps; }
export function aabbV(px,py,pz,s){ return Math.abs(px-s.x)<player.r+s.w/2-1e-4 && Math.abs(pz-s.z)<player.r+s.d/2-1e-4 &&
    (py-player.hh)<(s.y+s.h/2) && (py+player.hh)>(s.y-s.h/2); }
export function onDisc(px,pz,s){ const dx=px-s.x,dz=pz-s.z; return dx*dx+dz*dz < (s.r+player.r)*(s.r+player.r); }

export function die(kind){
  if(player.dead) return;
  player.dead=true; player.deadT=0; player.deadKind=kind;
  if(kind==='water') hooks.onSplash(player.x, player.z);
  hooks.sfx(kind==='water'?'splash':'die');
  if(!opts.cheat) run.lives--;
  if(!opts.cheat && run.lives<=0) run.running=false;
  hooks.onDie(kind);
}
export function respawn(){ resetPlayerTo(player.respawn); hooks.onRespawn(); hooks.showMsg('Try again! 💪',1200); }

export function updateDynamics(dt,t){
  for(const s of world.solids){
    s.dx=s.dy=s.dz=0;
    if(s.axis){ const p=Math.sin(t*s.mspd+s.ph)*s.amp;
      const px=s.x,py=s.y,pz=s.z;
      if(s.axis==='x') s.x=s.bx+p; else if(s.axis==='y') s.y=s.by+p; else s.z=s.bz+p;
      s.dx=s.x-px; s.dy=s.y-py; s.dz=s.z-pz; }
    if(s.spin){ s.pAng=s.ang; s.ang+=s.spin*dt; }
    if(s.riders) for(const c of s.riders){ c.x=s.x+c.ox; c.y=s.y+c.oy; c.z=s.z+c.oz; }
    if(s.crumb){
      if(s.timer>=0 && !s.dead){ s.timer+=dt;
        if(s.timer > (s.quick?0.20:0.42)){ s.dead=true; s.fall=0; hooks.sfx('crack'); } }
      if(s.dead){ s.fall+=dt; s.y=s.by-0.5*30*s.fall*s.fall; }
    }
  }
}

export function physics(dt,t,inx,inz){
  const so=player.standingOn;
  if(so && !so.dead){
    if(so.dx||so.dy||so.dz){ player.x+=so.dx; player.y+=so.dy; player.z+=so.dz; }
    if(so.spin){ const da=so.ang-so.pAng, c=Math.cos(da), s2=Math.sin(da);
      const rx=player.x-so.x, rz=player.z-so.z;
      player.x=so.x+rx*c-rz*s2; player.z=so.z+rx*s2+rz*c; player.facing+=da; }
  }
  if(player.swing){ swingStep(dt,inx,inz); return; }

  const ctrl=player.onGround?1:AIR, accel=player.onGround?18:9;
  // a sluggish surface caps how fast you can get moving on it
  const spd = (so && so.slowMo) ? MOVE*so.slowMo : MOVE;
  player.vx += ((inx*spd)-player.vx)*Math.min(1,accel*dt)*ctrl;
  player.vz += ((inz*spd)-player.vz)*Math.min(1,accel*dt)*ctrl;
  // a treadmill carries you along whether or not you are pushing
  if(so && so.belt) player.z += so.belt*dt;

  for(const f of world.fans){ const dx=player.x-f.x,dz=player.z-f.z;
    if(dx*dx+dz*dz < f.r*f.r && player.y>f.y-1 && player.y<f.y+f.height){
      player.vy += f.dir*f.power*dt; if(Math.random()<0.12) hooks.sfx('fan'); } }

  player.vy += GRAV*dt; if(player.vy<-42) player.vy=-42;
  player.onGround=false; player.standingOn=null;

  // X / Z walls (boxes) — a climbable one also records the grip for the climb below
  let grip=null, gripAx='';
  player.x+=player.vx*dt;
  for(const s of world.solids){ if(s.type!=='box'||s.dead) continue;
    if(aabbH(player.x,player.y,player.z,s)){
      if(player.vx>0) player.x=s.x-s.w/2-player.r; else if(player.vx<0) player.x=s.x+s.w/2+player.r; player.vx=0;
      if(s.climb){ grip=s; gripAx='x'; } } }
  player.z+=player.vz*dt;
  for(const s of world.solids){ if(s.type!=='box'||s.dead) continue;
    if(aabbH(player.x,player.y,player.z,s)){
      if(player.vz>0) player.z=s.z-s.d/2-player.r; else if(player.vz<0) player.z=s.z+s.d/2+player.r; player.vz=0;
      if(s.climb){ grip=s; gripAx='z'; } } }
  // round platforms: push out radially when we're beside (not on top of) them
  for(const s of world.solids){ if(s.type!=='disc'||s.dead) continue;
    const dx=player.x-s.x, dz=player.z-s.z, dd=Math.hypot(dx,dz)||1, minD=s.r+player.r;
    if(dd<minD && (player.y+player.hh)>(s.y-s.h/2)+0.06 && (player.y-player.hh)<(s.y+s.h/2)-0.06){
      player.x=s.x+dx/dd*minD; player.z=s.z+dz/dd*minD;
      player.vx*=0.2; player.vz*=0.2; } }

  // ---- wall climbing: keep holding the stick into the face and you haul up it ----
  player.climbing=false;
  if(grip){
    // which way is "into the wall" depends on the face we're pressed against
    const side = gripAx==='x' ? Math.sign(player.x-grip.x) : Math.sign(player.z-grip.z);
    const into = gripAx==='x' ? -side*inx : -side*inz;
    const top = grip.y+grip.h/2;
    if(!player.climbHint){ player.climbHint=true; hooks.showMsg('Hold forward to climb! 🧗',1800); }
    if(into>0.3 && (player.y-player.hh) < top){
      player.climbing=true;
      player.vy=CLIMB;                       // steady haul; gravity ignored while gripping
      player.walk+=CLIMB*dt*1.7;             // hand over hand
      // face the wall, so the reaching arms land against it
      player.facing = gripAx==='x' ? Math.atan2(-side,0) : Math.atan2(0,-side);
      // hauled over the lip — step in onto the top of the wall
      if((player.y-player.hh)+player.vy*dt > top-0.10){
        if(gripAx==='x') player.x = grip.x + side*(grip.w/2-0.7);
        else             player.z = grip.z + side*(grip.d/2-0.7);
        player.y = top+player.hh-0.05; player.vy=0; player.climbing=false;
      }
    }
  }

  // Y — land / bonk
  player.y+=player.vy*dt;
  for(const s of world.solids){
    if(s.dead) continue;
    const top=s.y+s.h/2, bot=s.y-s.h/2;
    const hit = (s.type==='disc') ? onDisc(player.x,player.z,s) : aabbV(player.x,player.y,player.z,s);
    if(!hit) continue;
    if(s.type==='disc' && !(player.vy<=0 && (player.y-player.hh)<top && (player.y-player.hh)>top-0.7)) continue;
    if(player.vy<=0 && (player.y-player.hh)<top && (player.y-player.hh)>top-0.7){
      player.y=top+player.hh; player.vy=0; player.onGround=true; player.standingOn=s;
      if(s.tramp){ player.vy=TRAMP; player.onGround=false; player.standingOn=null; s.squash=0.001; hooks.sfx('tramp'); }
      else if(s.crumb && s.timer<0){ s.timer=0; }
    } else if(s.type==='box' && player.vy>0){ player.y=bot-player.hh; player.vy=0; }
  }
  postPhysics(t);
}

export function postPhysics(t){
  const sp=Math.hypot(player.vx,player.vz);
  if(sp>0.6){ player.facing=Math.atan2(player.vx,player.vz); player.walk+=sp*0.055; }

  // Only the thorn row itself hurts, and only if you failed to clear it: the
  // box used to be the deck's whole danger footprint plus the player's radius,
  // which killed you standing nowhere near a spike.
  for(const k of world.spikes){ const th=k.h||1.05;
    if(Math.abs(player.x-k.x) < k.w/2 &&
       Math.abs(player.z-k.z) < k.d/2-0.15 &&
       (player.y-player.hh) < k.y+th*0.65){ die(); return; } }

  if(!player.swing && player.swingCd<=0 && player.vy<7){
    for(const sw of world.swings){ const h=swingHandle(sw);
      if(Math.hypot(player.x-h.x,player.y-h.y,player.z-h.z)<2.1){
        player.swing=sw; sw.angVel=0.7; hooks.sfx('swing');
        hooks.showMsg('Hold on! Tap JUMP to let go 🎈',1500); break; } }
  }

  // let them fall all the way to the sea — the splash is the payoff
  if(player.y < -1.0) die('water');

  for(const c of world.coins){ if(c.got) continue;
    if(Math.abs(player.x-c.x)<1.2 && Math.abs(player.z-c.z)<1.2 && Math.abs(player.y-c.y)<1.6){
      c.got=true; run.coinsLevel++; run.coinsForLife++; hooks.sfx('coin'); hooks.onCoin(c);
      if(run.coinsForLife>=50){ run.coinsForLife-=50; run.lives++; hooks.sfx('extra'); hooks.showMsg('Extra life! ❤',1400); } } }

  for(const ck of world.checks){ if(!ck.hit && Math.abs(player.x-ck.x)<2.6 && Math.abs(player.z-ck.z)<2.6 && Math.abs(player.y-ck.y)<2.2){
      ck.hit=true; player.respawn={x:ck.x,y:ck.y+0.7,z:ck.z}; hooks.sfx('check'); hooks.showMsg('Checkpoint! ✔',1200); hooks.onCheckpoint(ck); } }

  const near=(o,rad,vert)=>Math.hypot(player.x-o.x,player.z-o.z)<rad &&
                           Math.abs(player.y-o.y)<(vert||3.0);

  // somebody with something to tell you
  for(const n of world.npcs){ if(n.said||!n.line) continue;
    if(near(n,3.6)){ n.said=true; hooks.showMsg(n.line,3200); } }

  // the key
  for(const k of world.keys){ if(k.got) continue;
    if(near(k,2.0)){ k.got=true; player.hasKey=true;
      hooks.sfx('extra'); hooks.showMsg('You found the key! 🔑',1800); } }

  // her cage — the key opens it, otherwise it just rattles
  for(const c of world.cages){ if(c.open) continue;
    if(near(c,c.r+1.8,3.6)){
      if(player.hasKey){ c.open=true;
        const pr=world.npcs.find(n=>n.cageOf===c);
        if(pr) pr.cheer=true;
        // the wall barring the route above her opens at the same moment
        for(const g of world.solids) if(g.gate && g.cageOf===c) g.dead=true;
        hooks.sfx('win'); hooks.showMsg('You freed the princess! 👑 The way up is open',2600); }
      else if(!c.told){ c.told=true; hooks.showMsg('It’s locked — find the key! 🔒',1900); } } }

  // dead-end teleporters send you back to the boat
  for(const p of world.ports){
    if(p.to==='start' && near(p,1.8,2.8)){
      hooks.sfx('splash'); hooks.showMsg('Dead end! Back to the start 🌀',1900);
      resetPlayerTo(world.spawn); return; } }

  // crossing the finish line: throw your arms up
  const F=world.finish;
  if(F && !F.crossed && player.z>F.z && Math.abs(player.x-F.x)<F.w/2 &&
     Math.abs(player.y-F.y)<3.2){
    F.crossed=true; player.celebrateUntil=t+2.4; hooks.sfx('level');
    hooks.showMsg('Finish! 🎉',1700);
    for(const n of world.npcs) if(n.greeter && !n.cheer) n.clap=true; }

  const g=world.goal;
  if(g){ const dx=player.x-g.x,dz=player.z-g.z;
    if(dx*dx+dz*dz<g.r*g.r && Math.abs(player.y-g.y)<3.2) hooks.onLevelComplete(); }
}

/* --------------------------- Balloon swing --------------------------- */
export function swingHandle(sw){ return { x:sw.ax+Math.sin(sw.ang)*sw.dirx*sw.len, y:sw.ay-Math.cos(sw.ang)*sw.len,
  z:sw.az+Math.sin(sw.ang)*sw.dirz*sw.len }; }
export function swingStep(dt,inx,inz){
  const sw=player.swing, pump=(sw.dirz? inz : inx);
  sw.angVel += (-(GRAV/sw.len)*Math.sin(sw.ang) + pump*1.25)*dt;
  sw.angVel *= 0.999; sw.ang += sw.angVel*dt;
  const h=swingHandle(sw);
  player.x=h.x; player.y=h.y; player.z=h.z;
  const tang=Math.cos(sw.ang)*sw.angVel*sw.len;
  player.vx=tang*sw.dirx; player.vz=tang*sw.dirz; player.vy=Math.sin(sw.ang)*sw.angVel*sw.len;
  player.facing=Math.atan2(sw.dirx||0.001, sw.dirz||0.001);
}
export function releaseSwing(){ const sw=player.swing; if(!sw) return; player.swing=null; player.swingCd=0.9;
  const tang=Math.cos(sw.ang)*sw.angVel*sw.len;
  player.vx=tang*sw.dirx + sw.dirx*3; player.vz=tang*sw.dirz + sw.dirz*3;
  player.vy=Math.max(6.5, Math.abs(sw.angVel*sw.len)*0.5+4.5);
  hooks.sfx('jump');
}
export function tryJump(){ if(!run.running||player.dead) return;
  if(player.swing){ releaseSwing(); return; }
  if(player.onGround){ player.vy=JUMP; player.onGround=false; player.standingOn=null; hooks.sfx('jump'); } }
