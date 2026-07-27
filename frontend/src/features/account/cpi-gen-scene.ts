/**
 * Canvas scene: CPI certificate issuance animation.
 * Ported from cpi-certificate.html for the Velora Vue cabinet.
 */
// @ts-nocheck


export const CPI_GEN_W = 1920
export const CPI_GEN_H = 1080
export const CPI_GEN_TOTAL = 330
const W = CPI_GEN_W
const H = CPI_GEN_H
const TOTAL = CPI_GEN_TOTAL
/** @type {CanvasRenderingContext2D | null} */
let ctx = null
/** @type {string} */
let holderName = 'Cliente Velora'
/**
 * @param {CanvasRenderingContext2D} c
 * @param {string} [name]
 */
export function setCpiGenContext(c, name) {
  ctx = c
  if (name && String(name).trim()) holderName = String(name).trim()
}

/* ---------- helpers ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const easeOut=t=>1-Math.pow(1-t,3);
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeBack=t=>{const c=1.70158+1;return 1+ c*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2);};
function I(f,f0,f1,v0,v1,ease){
  if(f1===f0) return f<f0?v0:v1;
  let t=clamp((f-f0)/(f1-f0),0,1); t=ease?ease(t):t; return v0+(v1-v0)*t;
}
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function circ(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
const F='"DejaVu Sans", sans-serif';
function txt(s,x,y,size,weight,color,align,ls){
  ctx.save();ctx.font=`${weight} ${size}px ${F}`;ctx.fillStyle=color;
  ctx.textAlign=align||'left';ctx.textBaseline='alphabetic';
  if(ls)ctx.letterSpacing=ls;
  ctx.fillText(s,x,y);ctx.restore();
}
function tw(s,size,weight,ls){ctx.save();ctx.font=`${weight} ${size}px ${F}`;if(ls)ctx.letterSpacing=ls;const w=ctx.measureText(s).width;ctx.restore();return w;}

/* palette */
const C={brand:'#1b39c4',brand2:'#3f6bff',deep:'#122a8f',ink:'#101f47',mid:'#2b3765',
  muted:'#8a95bd',faint:'#aeb7d6',line:'#e6ebf8',track:'#e7ebf6',
  lite:'#e7eeff',lite2:'#dbe4ff',lite3:'#b9c9ff',
  ok:'#12b76a',okSoft:'#e9f9f0',okLine:'#bfe9d3',
  skin:'#f4d3b6',skinSh:'#e5bb98',hair:'#39322e',shirt:'#3f5bd0',shirtDk:'#2f47ad',
  gold1:'#fff6c8',gold2:'#fbd763',gold3:'#eeb63a',gold4:'#cd8f1d'};

/* ---------- icon glyphs (centered, size s) ---------- */
function gShield(x,y,s){const k=s/24;ctx.beginPath();
  ctx.moveTo(x,y-9.1*k);ctx.lineTo(x+8*k,y-6.3*k);ctx.lineTo(x+8*k,y-0.2*k);
  ctx.bezierCurveTo(x+8*k,y+4.8*k,x+4.4*k,y+8.1*k,x,y+9.2*k);
  ctx.bezierCurveTo(x-4.4*k,y+8.1*k,x-8*k,y+4.8*k,x-8*k,y-0.2*k);
  ctx.lineTo(x-8*k,y-6.3*k);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-3.3*k,y+0.2*k);ctx.lineTo(x-0.8*k,y+2.7*k);ctx.lineTo(x+3.5*k,y-2.1*k);ctx.stroke();}
function gBolt(x,y,s){const k=s/24;ctx.beginPath();
  ctx.moveTo(x+1.6*k,y-9.4*k);ctx.lineTo(x-6.7*k,y+1.5*k);ctx.lineTo(x-1.5*k,y+1.5*k);
  ctx.lineTo(x-2.5*k,y+9.4*k);ctx.lineTo(x+5.7*k,y-1.4*k);ctx.lineTo(x+0.5*k,y-1.4*k);ctx.closePath();ctx.fill();}
function gGlobe(x,y,s){const k=s/24;ctx.beginPath();ctx.arc(x,y,8.9*k,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-8.5*k,y-2.4*k);ctx.lineTo(x+8.5*k,y-2.4*k);
  ctx.moveTo(x-8.5*k,y+2.4*k);ctx.lineTo(x+8.5*k,y+2.4*k);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y,3.8*k,8.9*k,0,0,7);ctx.stroke();}
function gLock(x,y,s){const k=s/24;ctx.beginPath();ctx.roundRect(x-7.4*k,y-1.6*k,14.8*k,10.6*k,2.6*k);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y-1.9*k,3.7*k,Math.PI,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y+2.6*k);ctx.lineTo(x,y+5.2*k);ctx.stroke();}
function gReceipt(x,y,s){const k=s/24;ctx.beginPath();
  ctx.moveTo(x-5.8*k,y-9*k);ctx.lineTo(x+5.8*k,y-9*k);ctx.lineTo(x+5.8*k,y+9*k);
  ctx.lineTo(x+2.9*k,y+7.2*k);ctx.lineTo(x,y+9*k);ctx.lineTo(x-2.9*k,y+7.2*k);ctx.lineTo(x-5.8*k,y+9*k);
  ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-2.6*k,y-3.6*k);ctx.lineTo(x+2.6*k,y-3.6*k);
  ctx.moveTo(x-2.6*k,y+0.4*k);ctx.lineTo(x+2.6*k,y+0.4*k);ctx.stroke();}
function gClock(x,y,s){const k=s/24;ctx.beginPath();ctx.arc(x,y,8.9*k,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y-4.8*k);ctx.lineTo(x,y);ctx.lineTo(x+3.4*k,y+2.2*k);ctx.stroke();}
function gBankMini(x,y,s){const k=s/24;ctx.beginPath();
  ctx.moveTo(x-8.4*k,y-2.6*k);ctx.lineTo(x,y-7.8*k);ctx.lineTo(x+8.4*k,y-2.6*k);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-9.2*k,y+8.4*k);ctx.lineTo(x+9.2*k,y+8.4*k);ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-5.6*k,y);ctx.lineTo(x-5.6*k,y+6*k);
  ctx.moveTo(x,y);ctx.lineTo(x,y+6*k);
  ctx.moveTo(x+5.6*k,y);ctx.lineTo(x+5.6*k,y+6*k);ctx.stroke();}
function gUserMini(x,y,s){const k=s/24;ctx.beginPath();ctx.arc(x,y-3.4*k,3.9*k,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-7.2*k,y+8*k);ctx.bezierCurveTo(x-7.2*k,y+1.8*k,x+7.2*k,y+1.8*k,x+7.2*k,y+8*k);ctx.stroke();}
function gCheck(x,y,s){const k=s/24;ctx.beginPath();
  ctx.moveTo(x-6.5*k,y+0.6*k);ctx.lineTo(x-2*k,y+5.2*k);ctx.lineTo(x+6.8*k,y-4.6*k);ctx.stroke();}
function gCard(x,y,s){const k=s/24;ctx.beginPath();ctx.roundRect(x-9.4*k,y-6.4*k,18.8*k,12.8*k,2.6*k);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-9.4*k,y-2*k);ctx.lineTo(x+9.4*k,y-2*k);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-6*k,y+2.4*k);ctx.lineTo(x-2.6*k,y+2.4*k);ctx.stroke();}

/* ---------- background ---------- */
function drawBG(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#ffffff');g.addColorStop(.55,'#f4f7fd');g.addColorStop(1,'#e9eefa');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const r=ctx.createRadialGradient(W*.5,-140,60,W*.5,-140,900);
  r.addColorStop(0,'rgba(63,107,255,.13)');r.addColorStop(1,'rgba(63,107,255,0)');
  ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
  // faint dot grid
  ctx.save();ctx.fillStyle='rgba(27,57,196,.045)';
  for(let x=120;x<W-80;x+=44)for(let y=300;y<780;y+=44){ctx.beginPath();ctx.arc(x,y,1.4,0,7);ctx.fill();}
  ctx.restore();
}
function shadowEllipse(x,y,rx,ry,a){ctx.save();ctx.globalAlpha=a;
  const g=ctx.createRadialGradient(x,y,2,x,y,rx);
  g.addColorStop(0,'rgba(27,57,196,.28)');g.addColorStop(1,'rgba(27,57,196,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill();ctx.restore();}

/* ---------- PEOPLE ---------- */
const PEOPLE={
  f:{name:'Мария Попеску',iban:'IBAN •• 8291',style:'bob',
     hair:'#e3b465',hairHi:'#f6dda0',browC:'#c0954f',eyeC:'#7d6445',
     shirt:'#3f5bd0',shirtDk:'#2b41a0',
     jaw:0.95,chin:60,sh:78,brow:4.2,browW:11,lash:1,stub:0,tie:0,neck:1,lip:'#a8514c'},
  m:{name:'Андрей Попеску',iban:'IBAN •• 8291',style:'crop',
     hair:'#2b241f',hairHi:'#403630',browC:'#2b241f',eyeC:'#2b241f',
     shirt:'#2e5fc0',shirtDk:'#1f4499',
     jaw:1.07,chin:63,sh:91,brow:6.0,browW:13,lash:0,stub:.15,tie:1,neck:0,lip:'#96524b'}
};
let G='f';
const P=()=>PEOPLE[G];

function facePath(fw,chin){
  ctx.beginPath();
  ctx.moveTo(-fw,-16);
  ctx.bezierCurveTo(-fw,-54,-36,-69,0,-69);
  ctx.bezierCurveTo(36,-69,fw,-54,fw,-16);
  ctx.bezierCurveTo(fw,20,fw*0.56,chin,0,chin);
  ctx.bezierCurveTo(-fw*0.56,chin,-fw,20,-fw,-16);
  ctx.closePath();
}
function drawHand(x,y,sd,open){
  ctx.save();ctx.translate(x,y);ctx.rotate(sd*(1-open)*0.45);
  ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#b8825c';
  ctx.beginPath();ctx.ellipse(0,4,16,17,0,0,7);ctx.fill();ctx.restore();
  const pg=ctx.createRadialGradient(-5,-7,2,0,0,21);
  pg.addColorStop(0,'#fae0c9');pg.addColorStop(1,C.skin);
  ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(0,0,17,19,0,0,7);ctx.fill();
  ctx.restore();
}
function drawHairBob(p){
  ctx.fillStyle=p.hair;
  ctx.beginPath();
  ctx.moveTo(-59,8);
  ctx.bezierCurveTo(-74,-32,-58,-76,0,-76);
  ctx.bezierCurveTo(58,-76,74,-32,59,8);
  ctx.lineTo(48,8);ctx.bezierCurveTo(53,-24,37,-44,20,-42);
  ctx.bezierCurveTo(-7,-37,-35,-46,-47,-17);
  ctx.bezierCurveTo(-51,-6,-49,3,-48,8);ctx.closePath();ctx.fill();
  // side strands
  ctx.beginPath();ctx.moveTo(-59,5);ctx.quadraticCurveTo(-72,32,-59,54);
  ctx.quadraticCurveTo(-48,34,-48,5);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(59,5);ctx.quadraticCurveTo(72,32,59,54);
  ctx.quadraticCurveTo(48,34,48,5);ctx.closePath();ctx.fill();
  // fringe sweep + highlight
  ctx.fillStyle=p.hairHi;
  ctx.beginPath();ctx.moveTo(-42,-30);
  ctx.quadraticCurveTo(-16,-62,26,-52);
  ctx.quadraticCurveTo(-4,-50,-34,-22);ctx.closePath();ctx.fill();
}
function drawHairCrop(p){
  ctx.fillStyle=p.hair;
  ctx.beginPath();
  ctx.moveTo(-60,-4);
  ctx.bezierCurveTo(-66,-48,-42,-78,0,-78);
  ctx.bezierCurveTo(42,-78,66,-48,60,-4);
  ctx.lineTo(51,-4);
  ctx.bezierCurveTo(54,-32,42,-50,14,-48);
  ctx.bezierCurveTo(-14,-46,-42,-52,-49,-22);
  ctx.lineTo(-51,-4);ctx.closePath();ctx.fill();
  // side part highlight
  ctx.fillStyle=p.hairHi;
  ctx.beginPath();ctx.moveTo(-30,-62);
  ctx.quadraticCurveTo(6,-74,40,-56);
  ctx.quadraticCurveTo(4,-62,-24,-52);ctx.closePath();ctx.fill();
}

/* ---------- PERSON ---------- */
function drawPerson(f){
  const p=P();
  const app=I(f,T.fade[0]+10,T.fade[1]+14,0,1,easeOut);
  const rise=I(f,T.fade[0]+10,T.fade[1]+14,30,0,easeBack);
  const br=Math.sin(f/26)*3;
  const arm=I(f,T.arms[0],T.arms[1],0,1,easeBack);
  const smile=I(f,T.smile[0],T.smile[1],0,1,easeOut);
  let blink=0;
  T.blinks.forEach(b=>{const t=f-b;if(t>=0&&t<7)blink=Math.max(blink,Math.sin(t/7*Math.PI));});

  ctx.save();ctx.globalAlpha=app;ctx.translate(PER.x,PER.y+rise);
  shadowEllipse(0,26,150,24,app);
  ctx.lineJoin='round';ctx.lineCap='round';
  const s0=p.sh;

  /* --- torso --- */
  ctx.save();ctx.translate(0,br*0.5);
  const tg=ctx.createLinearGradient(-s0,-180,s0,-10);
  tg.addColorStop(0,'#4d67d8');tg.addColorStop(.45,p.shirt);tg.addColorStop(1,p.shirtDk);
  ctx.fillStyle=tg;ctx.beginPath();
  ctx.moveTo(-s0,-166);
  ctx.bezierCurveTo(-s0-16,-152,-s0-24,-90,-s0-26,-20);
  ctx.quadraticCurveTo(0,-4,s0+26,-20);
  ctx.bezierCurveTo(s0+24,-90,s0+16,-152,s0,-166);
  ctx.bezierCurveTo(s0*.6,-186,-s0*.6,-186,-s0,-166);ctx.closePath();ctx.fill();
  // fold lines
  ctx.strokeStyle='rgba(0,0,0,.10)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-s0*.72,-140);ctx.quadraticCurveTo(-s0*.5,-108,-s0*.66,-70);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s0*.72,-140);ctx.quadraticCurveTo(s0*.5,-108,s0*.66,-70);ctx.stroke();
  // neck
  ctx.fillStyle=C.skin;rr(-21,-214,42,50,15);ctx.fill();
  ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#b8825c';
  ctx.beginPath();ctx.ellipse(0,-206,22,12,0,0,7);ctx.fill();ctx.restore();
  // shoulder yoke
  ctx.fillStyle=p.shirt;ctx.beginPath();
  ctx.moveTo(-s0,-166);ctx.quadraticCurveTo(0,-188,s0,-166);
  ctx.quadraticCurveTo(0,-148,-s0,-166);ctx.closePath();ctx.fill();
  // collar
  ctx.fillStyle='#ffffff';ctx.beginPath();
  ctx.moveTo(-34,-178);ctx.lineTo(-3,-122);ctx.lineTo(-13,-184);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(34,-178);ctx.lineTo(3,-122);ctx.lineTo(13,-184);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.10)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-34,-178);ctx.lineTo(-3,-122);ctx.moveTo(34,-178);ctx.lineTo(3,-122);ctx.stroke();
  if(p.tie){
    ctx.fillStyle='#16307f';ctx.beginPath();
    ctx.moveTo(0,-126);ctx.lineTo(-13,-112);ctx.lineTo(0,-96);ctx.lineTo(13,-112);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-11,-100);ctx.lineTo(11,-100);ctx.lineTo(7,-24);ctx.lineTo(0,-12);ctx.lineTo(-7,-24);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();
    ctx.moveTo(-11,-100);ctx.lineTo(-2,-100);ctx.lineTo(-2,-20);ctx.lineTo(-6,-24);ctx.closePath();ctx.fill();
  }else{
    // necklace
    ctx.strokeStyle='#e8c96a';ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(-26,-166);ctx.quadraticCurveTo(0,-134,26,-166);ctx.stroke();
    ctx.fillStyle='#f0d67f';circ(0,-138,5.4);ctx.fill();
  }
  // placket buttons
  ctx.fillStyle='rgba(255,255,255,.42)';
  [-96,-66,-36].forEach(y=>{if(!p.tie){ctx.beginPath();ctx.arc(0,y,3.6,0,7);ctx.fill();}});
  ctx.restore();

  /* --- arms --- */
  [-1,1].forEach(sd=>{
    const shx=sd*s0*.98, shy=-160+br*0.4;
    const ex=sd*I(f,T.arms[0],T.arms[1],s0+26,s0+40,easeBack);
    const ey=I(f,T.arms[0],T.arms[1],-78,-188,easeBack)+br*0.4;
    const hx=sd*I(f,T.arms[0],T.arms[1],s0+34,s0+16,easeBack);
    const hy=I(f,T.arms[0],T.arms[1],12,-304,easeBack)+br*0.6;
    // sleeve
    ctx.strokeStyle=p.shirt;ctx.lineWidth=38;
    ctx.beginPath();ctx.moveTo(shx,shy);ctx.quadraticCurveTo(sd*Math.abs(ex)*1.03,(shy+ey)/2,ex,ey);ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=38;
    ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+(hx-ex)*.15,ey+(hy-ey)*.15);ctx.stroke();
    // cuff
    ctx.strokeStyle='#ffffff';ctx.lineWidth=30;
    ctx.beginPath();ctx.moveTo(ex+(hx-ex)*.15,ey+(hy-ey)*.15);
    ctx.lineTo(ex+(hx-ex)*.26,ey+(hy-ey)*.26);ctx.stroke();
    // forearm
    ctx.strokeStyle=C.skin;ctx.lineWidth=28;
    ctx.beginPath();ctx.moveTo(ex+(hx-ex)*.24,ey+(hy-ey)*.24);
    ctx.quadraticCurveTo((ex+hx)/2,(ey+hy)/2,hx,hy);ctx.stroke();
    drawHand(hx,hy,sd,arm);
  });

  /* --- head --- */
  ctx.save();ctx.translate(0,-268+br);
  ctx.rotate(Math.sin(f/34)*0.010);
  const fw=56*p.jaw;
  // ears
  ctx.fillStyle=C.skin;circ(-fw+4,6,12);ctx.fill();circ(fw-4,6,12);ctx.fill();
  ctx.strokeStyle=C.skinSh;ctx.lineWidth=2.2;
  ctx.beginPath();ctx.arc(-fw+4,6,5.4,-1.1,1.6);ctx.stroke();
  ctx.beginPath();ctx.arc(fw-4,6,5.4,Math.PI-1.6,Math.PI+1.1);ctx.stroke();
  // face
  const fg=ctx.createLinearGradient(-fw,-60,fw*.6,p.chin);
  fg.addColorStop(0,'#fae0c9');fg.addColorStop(1,C.skin);
  facePath(fw,p.chin);ctx.fillStyle=fg;ctx.fill();
  // shading clipped to face
  ctx.save();facePath(fw,p.chin);ctx.clip();
  ctx.globalAlpha=.16;ctx.fillStyle='#c28f66';
  ctx.beginPath();ctx.ellipse(0,-46,fw*.9,15,0,0,7);ctx.fill();
  ctx.globalAlpha=.12;
  ctx.beginPath();ctx.ellipse(fw*.72,4,20,42,0,0,7);ctx.fill();
  if(p.stub>0){ctx.globalAlpha=p.stub;ctx.fillStyle='#5c4a3a';
    ctx.beginPath();ctx.ellipse(0,p.chin*.62,fw*.86,26,0,0,7);ctx.fill();}
  ctx.restore();
  // hair
  if(p.style==='bob')drawHairBob(p);else drawHairCrop(p);
  // blush
  if(smile>0){ctx.save();ctx.globalAlpha=smile*.48;ctx.fillStyle='#f0938c';
    ctx.beginPath();ctx.ellipse(-fw*.6,18,13,8,0,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(fw*.6,18,13,8,0,0,7);ctx.fill();ctx.restore();}
  // brows
  const bw=-smile*5;
  ctx.strokeStyle=p.browC;ctx.lineWidth=p.brow;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-34,-19+bw);ctx.quadraticCurveTo(-22,-26+bw,-34+p.browW+8,-20+bw);ctx.stroke();
  ctx.beginPath();ctx.moveTo(34,-19+bw);ctx.quadraticCurveTo(22,-26+bw,34-p.browW-8,-20+bw);ctx.stroke();
  // eyes
  [-22,22].forEach(ex=>{
    const open=1-blink;
    if(open>0.06){
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,-3,11.4,9.8*open,0,0,7);ctx.fill();
      ctx.save();ctx.beginPath();ctx.ellipse(ex,-3,11.4,9.8*open,0,0,7);ctx.clip();
      ctx.globalAlpha=.16;ctx.fillStyle='#5b4a3a';
      ctx.beginPath();ctx.ellipse(ex,-9-3*open,12,5,0,0,7);ctx.fill();ctx.restore();
      const ig=ctx.createRadialGradient(ex,-4,1,ex+1,-3,6);
      ig.addColorStop(0,'#5a4636');ig.addColorStop(1,'#2b2320');
      ctx.fillStyle=ig;ctx.beginPath();ctx.ellipse(ex+1,-3,5.6,5.6*Math.min(open*1.2,1),0,0,7);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+3.2,-5.6,2,0,7);ctx.fill();
    }
    // lid line
    ctx.strokeStyle=p.eyeC;ctx.lineWidth=2.8;
    ctx.beginPath();ctx.moveTo(ex-11.4,-3-9.8*open);ctx.quadraticCurveTo(ex,-11.6-2*open,ex+11.4,-3-9.8*open);ctx.stroke();
    if(p.lash&&open>.4){ctx.lineWidth=2.4;
      const lx=ex+(ex<0?-11:11);
      ctx.beginPath();ctx.moveTo(lx,-6-6*open);ctx.lineTo(lx+(ex<0?-6:6),-11-5*open);ctx.stroke();}
  });
  // nose
  ctx.strokeStyle=C.skinSh;ctx.lineWidth=3.6;
  ctx.beginPath();ctx.moveTo(-1,9);ctx.quadraticCurveTo(6,17,-3,20);ctx.stroke();
  // mouth
  const mC=I(f,T.smile[0],T.smile[1],4,22,easeOut);
  const mW=I(f,T.smile[0],T.smile[1],13,21,easeOut);
  const my=p.chin*.58;
  if(smile>.5){
    ctx.fillStyle='#ffffff';ctx.beginPath();
    ctx.moveTo(-mW,my);ctx.quadraticCurveTo(0,my+mC,mW,my);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle=p.lip;ctx.lineWidth=4.4;
  ctx.beginPath();ctx.moveTo(-mW,my);ctx.quadraticCurveTo(0,my+mC,mW,my);ctx.stroke();
  ctx.restore();

  /* --- verified badge --- */
  const bs=I(f,T.badge[0],T.badge[1],0,1,easeBack);
  if(bs>0.01){ctx.save();ctx.translate(74,-336);ctx.scale(bs,bs);
    ctx.shadowColor='rgba(18,183,106,.5)';ctx.shadowBlur=22;ctx.shadowOffsetY=6;
    ctx.fillStyle=C.ok;circ(0,0,29);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle='#fff';ctx.lineWidth=5;circ(0,0,29);ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=5.4;ctx.lineCap='round';ctx.lineJoin='round';gCheck(0,0,42);
    ctx.restore();}
  ctx.restore();
}
/* ---------- timeline ---------- */
const T={
  fade:[0,16],
  doc:[10,32],
  gen:[32,98],
  bits:[30,94],
  sign:[112,158],
  hash:[122,152],
  lock:[158,174],
  stampIn:[186,214],
  hit:214,
  imprint:[218,236],
  bounce:[218,252],
  arms:[224,256],
  smile:[222,246],
  badge:[230,250],
  credit:[232,304],
  prog:[14,238],
  st1:36, st2:122, st3:224,
  checks:[128,152,176,202],
  blinks:[62,152,272]
};

/* anchors */
const HUB={x:252,y:480}, DOC={x:772,y:500}, CHK={x:1074,y:452}, PER={x:1566,y:700};
const IMP={x:66,y:104};                 // stamp imprint, doc-local

/* ---------- extra glyphs ---------- */
function gKey(x,y,s){const k=s/24;
  ctx.beginPath();ctx.arc(x-3.4*k,y-3.4*k,5.4*k,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+0.4*k,y+0.4*k);ctx.lineTo(x+8.4*k,y+8.4*k);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+5*k,y+5*k);ctx.lineTo(x+7.6*k,y+2.4*k);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+8.4*k,y+8.4*k);ctx.lineTo(x+5.6*k,y+11*k);ctx.stroke();}
function gDoc(x,y,s){const k=s/24;
  ctx.beginPath();ctx.moveTo(x-6.4*k,y-9.4*k);ctx.lineTo(x+2.6*k,y-9.4*k);
  ctx.lineTo(x+6.4*k,y-5.4*k);ctx.lineTo(x+6.4*k,y+9.4*k);ctx.lineTo(x-6.4*k,y+9.4*k);
  ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-3*k,y-1.6*k);ctx.lineTo(x+3*k,y-1.6*k);
  ctx.moveTo(x-3*k,y+2.4*k);ctx.lineTo(x+3*k,y+2.4*k);ctx.stroke();}
function gPen(x,y,s){const k=s/24;
  ctx.beginPath();ctx.moveTo(x-8*k,y+8*k);ctx.lineTo(x-6*k,y+2*k);ctx.lineTo(x+5*k,y-9*k);
  ctx.lineTo(x+9*k,y-5*k);ctx.lineTo(x-2*k,y+6*k);ctx.closePath();ctx.stroke();}

/* ---------- HUB (issuer) ---------- */
function drawHub(f){
  const app=I(f,T.fade[0]+4,T.fade[1]+8,0,1,easeOut);
  const sc=I(f,T.fade[0]+4,T.fade[1]+8,.72,1,easeBack);
  ctx.save();ctx.globalAlpha=app;ctx.translate(HUB.x,HUB.y);ctx.scale(sc,sc);
  const gg=ctx.createRadialGradient(0,0,34,0,0,190);
  gg.addColorStop(0,'rgba(63,107,255,.16)');gg.addColorStop(1,'rgba(63,107,255,0)');
  ctx.fillStyle=gg;circ(0,0,190);ctx.fill();
  ctx.strokeStyle='rgba(63,107,255,.26)';ctx.lineWidth=2;ctx.setLineDash([2,12]);
  circ(0,0,136);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(150,172,250,.7)';ctx.lineWidth=2;circ(0,0,102);ctx.stroke();
  // emit ring on each bit burst
  const t=(f-T.bits[0])/12;
  if(t>=0&&t<1){ctx.save();ctx.globalAlpha=(1-t)*.5;ctx.strokeStyle='rgba(63,107,255,1)';
    ctx.lineWidth=4;circ(0,0,86+easeOut(t)*54);ctx.stroke();ctx.restore();}
  ctx.save();ctx.shadowColor='rgba(20,40,150,.45)';ctx.shadowBlur=40;ctx.shadowOffsetY=16;
  const og=ctx.createRadialGradient(-22,-30,8,0,0,90);
  og.addColorStop(0,'#7e97ff');og.addColorStop(.5,'#3f6bff');og.addColorStop(1,'#122a8f');
  ctx.fillStyle=og;circ(0,0,86);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.3;ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(-24,-34,38,22,-0.5,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle='#fff';ctx.lineWidth=13;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-35,-38);ctx.lineTo(0,40);ctx.lineTo(35,-38);ctx.stroke();
  // orbital chips
  const glyphs=[gKey,gDoc,gShield];
  for(let i=0;i<3;i++){
    const a=(f*0.4+i*120)*Math.PI/180,R=136;
    const x=Math.cos(a)*R,y=Math.sin(a)*R;
    ctx.save();ctx.shadowColor='rgba(27,57,196,.18)';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
    ctx.fillStyle='#fff';circ(x,y,25);ctx.fill();ctx.restore();
    ctx.strokeStyle='#dbe3fa';ctx.lineWidth=1.8;circ(x,y,25);ctx.stroke();
    ctx.strokeStyle=C.brand2;ctx.fillStyle=C.brand2;ctx.lineWidth=2.3;ctx.lineCap='round';ctx.lineJoin='round';
    glyphs[i](x,y,24);
  }
  ctx.restore();
  txt('Velora · emittente',HUB.x,HUB.y+232,24,'bold',C.mid,'center');
  ctx.save();ctx.globalAlpha=app;
  const s2='Registro CPI';const wd=tw(s2,20,'normal');
  ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  gGlobe(HUB.x-wd/2-15,HUB.y+256,21);
  txt(s2,HUB.x-wd/2+4,HUB.y+263,20,'normal',C.faint,'left');
  ctx.restore();
}

/* ---------- data bits hub -> doc ---------- */
function qb(a,c,b,t){const u=1-t;return{x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y};}
function drawBits(f){
  const N=16;
  for(let i=0;i<N;i++){
    const st=T.bits[0]+i*((T.bits[1]-T.bits[0])/N), dur=40;
    const t=(f-st)/dur;
    if(t<0||t>1)continue;
    const a={x:HUB.x+70,y:HUB.y},b={x:DOC.x-120+rnd(i)*230,y:DOC.y-140+rnd(i+7)*230};
    const ctrl={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-120-rnd(i+3)*90};
    const p=qb(a,ctrl,b,easeIO(t));
    // trail
    for(let k=1;k<=7;k++){const pp=qb(a,ctrl,b,clamp(easeIO(t)-k*0.02,0,1));
      ctx.save();ctx.globalAlpha=(1-k/7)*.22;ctx.fillStyle='rgba(63,107,255,1)';
      ctx.beginPath();ctx.arc(pp.x,pp.y,6*(1-k/8),0,7);ctx.fill();ctx.restore();}
    const fade=t<.1?t/.1:(t>.86?(1-t)/.14:1);
    ctx.save();ctx.globalAlpha=clamp(fade,0,1);
    ctx.shadowColor='rgba(63,107,255,.6)';ctx.shadowBlur=12;
    const g=ctx.createLinearGradient(p.x-8,p.y-8,p.x+8,p.y+8);
    g.addColorStop(0,'#7e97ff');g.addColorStop(1,'#1b39c4');
    ctx.fillStyle=g;rr(p.x-8,p.y-8,16,16,5);ctx.fill();
    ctx.restore();
  }
}

/* ---------- CERTIFICATE ---------- */
function drawDoc(f){
  const app=I(f,T.doc[0],T.doc[1],0,1,easeOut);
  if(app<=0.001)return;
  const sc=I(f,T.doc[0],T.doc[1],.82,1,easeBack);
  const gen=I(f,T.gen[0],T.gen[1],0,1);
  // shake on stamp impact
  let shake=0;const ht=f-T.hit;
  if(ht>=0&&ht<20)shake=Math.sin(ht*0.9)*0.016*(1-ht/20);
  ctx.save();ctx.globalAlpha=app;ctx.translate(DOC.x,DOC.y);ctx.rotate(shake);ctx.scale(sc,sc);

  // back sheet
  ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#dfe6f8';rr(-162,-222,340,460,16);ctx.fill();ctx.restore();
  // sheet
  ctx.save();ctx.shadowColor='rgba(27,57,196,.26)';ctx.shadowBlur=44;ctx.shadowOffsetY=20;
  ctx.fillStyle='#fff';rr(-170,-230,340,460,16);ctx.fill();ctx.restore();
  ctx.strokeStyle='#e9edf9';ctx.lineWidth=2;rr(-170,-230,340,460,16);ctx.stroke();
  // guilloche corner tint
  const cg=ctx.createLinearGradient(-170,-230,170,-120);
  cg.addColorStop(0,'rgba(63,107,255,.07)');cg.addColorStop(1,'rgba(63,107,255,0)');
  ctx.fillStyle=cg;rr(-170,-230,340,140,16);ctx.fill();

  // header: V mark + title
  ctx.save();ctx.shadowColor='rgba(27,57,196,.35)';ctx.shadowBlur=12;ctx.shadowOffsetY=4;
  ctx.fillStyle=C.brand;circ(-140,-192,16);ctx.fill();ctx.restore();
  ctx.strokeStyle='#fff';ctx.lineWidth=3.4;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-146,-198);ctx.lineTo(-140,-185);ctx.lineTo(-134,-198);ctx.stroke();
  txt('CERTIFICATO CPI',-116,-196,16,'bold',C.ink,'left','0.06em');
  txt('N. CPI-2026-004417',-116,-176,12,'normal',C.faint,'left');

  // QR (reveals during gen)
  const qx=100,qy=-222,qs=8.6;
  ctx.fillStyle='#f4f6fd';rr(qx-4,qy-4,qs*7+8,qs*7+8,5);ctx.fill();
  const qp=clamp((gen-0.45)/0.55,0,1);
  for(let r=0;r<7;r++)for(let c2=0;c2<7;c2++){
    const idx=r*7+c2;
    if(idx/49>qp)continue;
    if(rnd(idx*3+1)>0.46){ctx.fillStyle=C.ink;ctx.fillRect(qx+c2*qs,qy+r*qs,qs-1.6,qs-1.6);}
  }
  ctx.strokeStyle=C.faint;ctx.lineWidth=1.6;
  [[0,0],[5,0],[0,5]].forEach(([a,b])=>{if(qp>0.2)
    {ctx.strokeRect(qx+a*qs-1,qy+b*qs-1,qs*2,qs*2);}});

  // rules
  ctx.strokeStyle='#e9edf9';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-146,-148);ctx.lineTo(146,-148);ctx.stroke();

  // field rows
  const rows=5;
  for(let i=0;i<rows;i++){
    const p=clamp(gen*rows-i,0,1);
    if(p<=0)continue;
    const y=-124+i*23;
    ctx.fillStyle='#dfe5f6';rr(-146,y,54*p,7,3.5);ctx.fill();
    ctx.fillStyle='#c3cbe6';rr(-82,y-1,(118+rnd(i)*40)*p,9,4.5);ctx.fill();
  }
  ctx.beginPath();ctx.strokeStyle='#e9edf9';ctx.moveTo(-146,-16);ctx.lineTo(146,-16);ctx.stroke();

  // hash fingerprint
  const hp=I(f,T.hash[0],T.hash[1],0,1);
  txt('SHA-256 FINGERPRINT',-146,4,10,'bold',C.faint,'left','0.1em');
  for(let ln=0;ln<2;ln++){
    const cnt=Math.floor(hp*22);
    for(let i=0;i<22;i++){
      if(ln*22+i>hp*44)continue;
      ctx.fillStyle=i%5===4?'#c9d2ea':C.mid;
      rr(-146+i*13,16+ln*13,9,5,2.5);ctx.fill();
    }
  }

  // signature
  txt('FIRMA ELETTRONICA',-146,64,10,'bold',C.faint,'left','0.1em');
  const sp=I(f,T.sign[0],T.sign[1],0,1,easeOut);
  if(sp>0){
    ctx.save();ctx.strokeStyle=C.brand;ctx.lineWidth=3.4;ctx.lineCap='round';ctx.lineJoin='round';
    const path=[[-142,92],[-126,74],[-112,98],[-98,70],[-84,96],[-64,78],[-48,94],[-30,80],[-14,90]];
    const total=path.length-1, seg=sp*total;
    ctx.beginPath();ctx.moveTo(path[0][0],path[0][1]);
    for(let i=1;i<path.length;i++){
      if(seg>=i){ctx.quadraticCurveTo(path[i-1][0]+6,path[i-1][1]-8,path[i][0],path[i][1]);}
      else if(seg>i-1){const k=seg-(i-1);
        const x=path[i-1][0]+(path[i][0]-path[i-1][0])*k, y=path[i-1][1]+(path[i][1]-path[i-1][1])*k;
        ctx.quadraticCurveTo(path[i-1][0]+6,path[i-1][1]-8,x,y);break;}
      else break;
    }
    ctx.stroke();ctx.restore();
    // pen tip
    if(sp<1){const i=Math.min(Math.floor(seg)+1,path.length-1);
      const k=seg-Math.floor(seg);
      const x=path[i-1][0]+(path[i][0]-path[i-1][0])*k, y=path[i-1][1]+(path[i][1]-path[i-1][1])*k;
      ctx.save();ctx.strokeStyle=C.brand;ctx.lineWidth=2.2;gPen(x+9,y-9,22);ctx.restore();}
  }
  ctx.strokeStyle='#e9edf9';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-146,108);ctx.lineTo(-6,108);ctx.stroke();

  // lock + label
  const lp=I(f,T.lock[0],T.lock[1],0,1,easeBack);
  if(lp>0.01){ctx.save();ctx.globalAlpha=Math.min(lp,1);
    ctx.translate(-138,142);ctx.scale(Math.min(lp,1),Math.min(lp,1));
    ctx.strokeStyle=C.ok;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';gLock(0,0,20);
    ctx.restore();
    txt('Firma qualificata · TSA',-124,148,11,'bold','#0b7d4e','left');}

  // footer
  ctx.strokeStyle='#e9edf9';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-146,186);ctx.lineTo(146,186);ctx.stroke();
  txt('Velora CPI Registry · UE',-146,206,11,'normal',C.faint,'left');

  // APPROVED imprint
  const ip=I(f,T.imprint[0],T.imprint[1],0,1,easeBack);
  if(ip>0.01){
    ctx.save();ctx.translate(IMP.x,IMP.y);ctx.rotate(-0.21);
    const s=1.35-0.35*Math.min(ip,1);ctx.scale(s,s);ctx.globalAlpha=Math.min(ip,1)*.92;
    ctx.strokeStyle=C.ok;ctx.lineWidth=5;circ(0,0,70);ctx.stroke();
    ctx.lineWidth=2.4;circ(0,0,60);ctx.stroke();
    txt('APPROVED',0,-4,22,'bold',C.ok,'center','0.06em');
    txt('CPI · VELORA',0,20,11,'bold',C.ok,'center','0.14em');
    ctx.strokeStyle=C.ok;ctx.lineWidth=2.4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-40,-24);ctx.lineTo(40,-24);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-34,32);ctx.lineTo(34,32);ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // impact rings + sparks (world space)
  const ix=DOC.x+IMP.x, iy=DOC.y+IMP.y;
  const rt=(f-T.hit)/34;
  if(rt>=0&&rt<1){ctx.save();ctx.globalAlpha=(1-rt)*.7;ctx.strokeStyle='rgba(18,183,106,1)';
    ctx.lineWidth=5;circ(ix,iy,70+easeOut(rt)*120);ctx.stroke();ctx.restore();}
  for(let i=0;i<12;i++){const tt=f-T.hit;
    if(tt>=0&&tt<32){const a=rnd(i+9)*Math.PI*2,sp2=2.6+rnd(i+21)*3.6;
      const x=ix+Math.cos(a)*sp2*tt,y=iy+Math.sin(a)*sp2*tt+0.07*tt*tt;
      ctx.save();ctx.globalAlpha=clamp(1-tt/32,0,1);ctx.fillStyle=C.ok;
      ctx.shadowColor='#7de3b0';ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(x,y,3.4,0,7);ctx.fill();ctx.restore();}}
}

/* ---------- STAMP ---------- */
function drawStamp(f){
  if(f<T.stampIn[0]||f>T.bounce[1]+18)return;
  const ix=DOC.x+IMP.x;
  const yHover=DOC.y+IMP.y-190, yHit=DOC.y+IMP.y-58;
  let y,al=1;
  if(f<T.hit){ y=I(f,T.stampIn[0],T.stampIn[1],DOC.y+IMP.y-520,yHover,easeOut);
    if(f>T.stampIn[1]) y=I(f,T.stampIn[1],T.hit,yHover,yHit,t=>t*t);
    al=I(f,T.stampIn[0],T.stampIn[0]+8,0,1,easeOut);
  } else {
    y=I(f,T.hit,T.bounce[1],yHit,DOC.y+IMP.y-330,easeOut);
    al=I(f,T.bounce[1]-14,T.bounce[1]+18,1,0,easeOut);
  }
  ctx.save();ctx.globalAlpha=clamp(al,0,1);
  ctx.translate(ix,y);ctx.rotate(-0.21);
  ctx.shadowColor='rgba(20,40,150,.32)';ctx.shadowBlur=30;ctx.shadowOffsetY=16;
  // handle
  const hg=ctx.createLinearGradient(-26,-150,26,-88);
  hg.addColorStop(0,'#d7a463');hg.addColorStop(1,'#a97634');
  ctx.fillStyle=hg;rr(-27,-152,54,66,20);ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.fillStyle='rgba(255,255,255,.18)';rr(-21,-146,16,52,8);ctx.fill();
  // neck
  ctx.fillStyle='#20356f';rr(-16,-92,32,20,6);ctx.fill();
  // body
  const bg=ctx.createLinearGradient(-78,-74,78,-10);
  bg.addColorStop(0,'#3f5bd0');bg.addColorStop(1,'#1b2f97');
  ctx.fillStyle=bg;ctx.beginPath();
  ctx.moveTo(-58,-74);ctx.lineTo(58,-74);ctx.lineTo(78,-18);ctx.lineTo(-78,-18);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();
  ctx.moveTo(-58,-74);ctx.lineTo(-24,-74);ctx.lineTo(-40,-18);ctx.lineTo(-78,-18);ctx.closePath();ctx.fill();
  // base + ink rim
  ctx.fillStyle='#16265c';rr(-82,-20,164,16,5);ctx.fill();
  ctx.fillStyle=C.ok;rr(-78,-8,156,9,4);ctx.fill();
  ctx.restore();
}

/* ---------- CHECKLIST ---------- */
function drawChecks(f){
  const app=I(f,T.fade[0]+12,T.fade[1]+16,0,1,easeOut);
  const items=['Formato XML','Hash corrispondente','Certificato valido','Autorità operatore'];
  ctx.save();ctx.globalAlpha=app;
  ctx.fillStyle='#fbfcff';ctx.strokeStyle=C.line;ctx.lineWidth=2;
  ctx.save();ctx.shadowColor='rgba(27,57,196,.12)';ctx.shadowBlur=26;ctx.shadowOffsetY=10;
  rr(CHK.x-24,CHK.y-40,268,206,18);ctx.fill();ctx.restore();
  rr(CHK.x-24,CHK.y-40,268,206,18);ctx.stroke();
  txt('VALIDAZIONE',CHK.x,CHK.y-12,13,'bold',C.faint,'left','0.14em');
  items.forEach((it,i)=>{
    const on=f>=T.checks[i];
    const y=CHK.y+20+i*34;
    const pop=on?I(f,T.checks[i],T.checks[i]+10,0,1,easeBack):0;
    ctx.fillStyle=on?C.okSoft:'#f2f5fd';circ(CHK.x+10,y,14);ctx.fill();
    ctx.strokeStyle=on?C.okLine:C.line;ctx.lineWidth=1.8;circ(CHK.x+10,y,14);ctx.stroke();
    if(on){ctx.save();ctx.globalAlpha=(1-pop)*.55;ctx.strokeStyle=C.ok;ctx.lineWidth=2.6;
      circ(CHK.x+10,y,14+pop*11);ctx.stroke();ctx.restore();}
    ctx.strokeStyle=on?C.ok:C.faint;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';
    if(on)gCheck(CHK.x+10,y,18); else {ctx.beginPath();ctx.arc(CHK.x+10,y,4,0,7);ctx.stroke();}
    txt(it,CHK.x+34,y+6,17,on?'bold':'normal',on?C.mid:C.faint);
  });
  ctx.restore();
}

/* ---------- issued chip ---------- */
function drawCredit(f){
  if(f<T.credit[0]||f>T.credit[1])return;
  const t=(f-T.credit[0])/(T.credit[1]-T.credit[0]);
  const y=PER.y-330-easeOut(clamp(t*2.2,0,1))*70;
  const al=t<0.1?t/0.1:(t>0.74?clamp((1-t)/0.26,0,1):1);
  const s='Certificato emesso';
  ctx.save();ctx.globalAlpha=al;
  const wd=tw(s,32,'bold')+56;
  ctx.shadowColor='rgba(18,183,106,.35)';ctx.shadowBlur=26;ctx.shadowOffsetY=10;
  ctx.fillStyle=C.okSoft;rr(PER.x-wd/2,y-36,wd,58,29);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle=C.okLine;ctx.lineWidth=2.4;rr(PER.x-wd/2,y-36,wd,58,29);ctx.stroke();
  txt(s,PER.x,y+3,32,'bold','#0b7d4e','center');
  ctx.restore();
}

/* ---------- UI ---------- */
function chip(x,y,label,glyph,green){
  const pad=22,h=48,wd=tw(label,21,'bold')+pad*2+30;
  ctx.save();
  ctx.fillStyle=green?C.okSoft:'#fbfcff';rr(x-wd,y-h/2,wd,h,h/2);ctx.fill();
  ctx.strokeStyle=green?C.okLine:C.line;ctx.lineWidth=2;rr(x-wd,y-h/2,wd,h,h/2);ctx.stroke();
  ctx.strokeStyle=green?C.ok:C.brand2;ctx.fillStyle=green?C.ok:C.brand2;
  ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';
  glyph(x-wd+pad+9,y,24);
  txt(label,x-wd+pad+28,y+7,21,'bold',green?'#0b7d4e':'#5b678f');
  ctx.restore();return wd;
}
function statusText(f){
  if(f<T.gen[0])return['Inizializzazione emissione…',C.brand];
  if(f<T.gen[1])return['Generazione documento…',C.brand];
  if(f<T.sign[0])return['Calcolo hash SHA-256…',C.brand];
  if(f<T.lock[1])return['Firma qualificata in corso…',C.brand];
  if(f<T.imprint[0]+2)return['In attesa approvazione operatore…',C.brand];
  return['Certificato firmato e approvato',C.ok];
}
function drawUI(f){
  const app=I(f,0,14,0,1,easeOut);
  ctx.save();ctx.globalAlpha=app;
  txt('EMISSIONE CERTIFICATO',112,120,20,'bold',C.faint,'left','0.16em');
  txt('Certificato CPI',112,192,58,'bold',C.ink);
  let rx=1808;
  const w1=chip(rx,128,'eIDAS · TSA',gShield,true);rx-=w1+14;
  chip(rx,128,'Firma qualificata',gLock,false);
  ctx.restore();

  // person caption
  ctx.save();ctx.globalAlpha=app;
  txt(holderName,PER.x,830,26,'bold',C.mid,'center');
  const s2='Operatore di approvazione';const wd=tw(s2,21,'normal');
  ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  gUserMini(PER.x-wd/2-16,855,22);
  txt(s2,PER.x-wd/2+4,862,21,'normal',C.faint,'left');
  ctx.restore();

  // steps
  const stx=[112,960,1808],lab=['Generato','Firmato','Approvato'],gl=[gDoc,gPen,gCheck];
  const fr=[T.st1,T.st2,T.st3],on=[f>=T.st1,f>=T.st2,f>=T.st3];
  for(let i=0;i<3;i++){
    const lw=tw(lab[i],23,'bold'),tot=44+22+lw;
    let x0=i===0?stx[0]:(i===1?stx[1]-tot/2:stx[2]-tot);
    const y=914,pop=on[i]?I(f,fr[i],fr[i]+12,0,1,easeBack):0;
    ctx.save();
    ctx.fillStyle=on[i]?C.okSoft:'#fbfcff';circ(x0+22,y,22);ctx.fill();
    ctx.strokeStyle=on[i]?C.okLine:C.line;ctx.lineWidth=2.2;circ(x0+22,y,22);ctx.stroke();
    if(on[i]){ctx.save();ctx.globalAlpha=(1-pop)*.6;ctx.strokeStyle=C.ok;ctx.lineWidth=3;
      circ(x0+22,y,22+pop*16);ctx.stroke();ctx.restore();}
    ctx.strokeStyle=on[i]?C.ok:C.faint;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';
    gl[i](x0+22,y,24);
    txt(lab[i],x0+66,y+8,23,'bold',on[i]?C.mid:C.faint);
    ctx.restore();
  }
  // progress
  const p=I(f,T.prog[0],T.prog[1],0,1,easeIO);
  const bx=112,bw=1696,by=952;
  ctx.fillStyle=C.track;rr(bx,by,bw,14,7);ctx.fill();
  if(p>0){const g=ctx.createLinearGradient(bx,0,bx+bw,0);
    g.addColorStop(0,C.brand);g.addColorStop(1,C.brand2);
    ctx.fillStyle=p>=1?C.ok:g;rr(bx,by,bw*p,14,7);ctx.fill();}
  const [st,sc2]=statusText(f);
  ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.lineCap='round';gClock(bx+11,by+52,22);
  txt(st,bx+30,by+60,22,'bold',sc2);
  txt(Math.round(p*100)+'%',bx+bw,by+60,22,'bold',p>=1?C.ok:C.muted,'right');

  // trust row
  const items=[['Hash SHA-256',gLock],['Marca temporale TSA',gClock],['CAdES / eIDAS',gShield],['Registro CPI',gReceipt]];
  let total=0;const ws=items.map(([t])=>tw(t,20,'normal')+26+34);
  ws.forEach(w=>total+=w);
  let x=(W-total)/2,y=1050;
  ctx.save();ctx.globalAlpha=app*.95;
  items.forEach(([t,g],i)=>{
    ctx.strokeStyle='#b3bcda';ctx.fillStyle='#b3bcda';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    g(x+11,y-7,22);txt(t,x+30,y,20,'normal','#9aa4c8');x+=ws[i];
  });
  ctx.restore();
}

/* ---------- main ---------- */
function draw(f){
  ctx.clearRect(0,0,W,H);
  drawBG();
  drawHub(f);
  drawBits(f);
  drawDoc(f);
  drawStamp(f);
  drawChecks(f);
  drawPerson(f);
  drawCredit(f);
  drawUI(f);
}

/**
 * @param {number} frame
 */
export function drawCpiGenFrame(frame) {
  if (!ctx) return
  const f = Math.max(0, Math.min(CPI_GEN_TOTAL, frame))
  draw(f)
}
