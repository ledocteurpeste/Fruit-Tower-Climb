import { opts } from './state.js';

export const Audio_={
  ctx:null, master:null, musicGain:null, seqTimer:null, step:0, melody:null, bpm:132,
  init(){ if(this.ctx) return; try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    this.master=this.ctx.createGain(); this.master.gain.value=0.5; this.master.connect(this.ctx.destination);
    this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=0.18; this.musicGain.connect(this.master); },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  // Phones park the audio clock whenever the tab loses focus or the ringer
  // switch flips, and a parked interval never restarts itself — so poke the
  // context awake on every gesture and put the sequencer back if it died.
  kick(){ if(!this.ctx) return; this.resume();
    if(this.wantMusic && opts.music && !this.seqTimer) this.startMusic(); },
  tone(freq,dur,type,vol,slideTo,dest){ if(!this.ctx) return;
    // music rides its own gain, so muting sound effects must not mute the music
    if(dest===this.musicGain ? !opts.music : !opts.sfx) return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;
    o.type=type||'square'; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30,slideTo),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(dest||this.master); o.start(t); o.stop(t+dur+0.02); },
  noise(dur,vol){ if(!opts.sfx||!this.ctx) return;
    const n=Math.floor(this.ctx.sampleRate*dur), buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const g=this.ctx.createGain(); g.gain.value=vol||0.2; src.connect(g).connect(this.master); src.start(); },
  sfx(n){ if(!this.ctx) return; this.resume();
    switch(n){
      case 'jump': this.tone(420,0.16,'square',0.18,720); break;
      case 'coin': this.tone(880,0.07,'square',0.16); setTimeout(()=>this.tone(1320,0.1,'square',0.16),60); break;
      case 'tramp': this.tone(170,0.28,'sine',0.32,980); break;
      case 'hurt': this.tone(200,0.25,'sawtooth',0.22,90); break;
      case 'die': this.tone(400,0.5,'sawtooth',0.25,70); break;
      case 'splash': this.noise(0.4,0.22); this.tone(240,0.3,'sine',0.12,80); break;
      case 'check': this.tone(660,0.1,'triangle',0.2); setTimeout(()=>this.tone(990,0.16,'triangle',0.2),90); break;
      case 'fan': this.tone(300,0.12,'sawtooth',0.07,520); break;
      case 'swing': this.tone(500,0.3,'sine',0.14,260); break;
      case 'crack': this.noise(0.18,0.18); this.tone(160,0.2,'square',0.12,70); break;
      case 'extra': [523,659,784,1046].forEach((f,k)=>setTimeout(()=>this.tone(f,0.14,'triangle',0.22),k*70)); break;
      case 'click': this.tone(600,0.05,'square',0.14,760); break;
      case 'win': [523,659,784,1046,784,1046,1318].forEach((f,k)=>setTimeout(()=>this.tone(f,0.22,'triangle',0.26),k*130)); break;
      case 'level': [659,784,988,1318].forEach((f,k)=>setTimeout(()=>this.tone(f,0.18,'triangle',0.24),k*110)); break;
    } },
  setTheme(k){ const base=[0,2,4,7,9]; const root=[0,3,5][k]||0;
    const scale=[]; for(let o=0;o<3;o++) for(const s of base) scale.push(s+o*12+root);
    this.melody=[0,2,4,2, 5,4,2,0, 3,5,7,5, 4,2,0,2].map(ix=>scale[ix%scale.length]);
    this.bpm=[128,138,120][k]||130; },
  startMusic(){ this.wantMusic=true; if(!opts.music||!this.ctx) return; this.resume(); if(this.seqTimer) return;
    if(!this.melody) this.setTheme(0);
    const stepMs=60000/this.bpm/2; this.step=0;
    this.seqTimer=setInterval(()=>{ if(!opts.music) return;
      const semi=this.melody[this.step%this.melody.length], f=220*Math.pow(2,semi/12);
      this.tone(f,stepMs/1000*0.9,'triangle',0.16,null,this.musicGain);
      if(this.step%4===0) this.tone(f/2,stepMs/1000*1.8,'sine',0.14,null,this.musicGain);
      this.step++; }, stepMs); },
  stopMusic(){ this.wantMusic=false; if(this.seqTimer){ clearInterval(this.seqTimer); this.seqTimer=null; } }
};
