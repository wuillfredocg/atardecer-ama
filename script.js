const DURATION = 15000;
const TWILIGHT_START = 0.55;
const NIGHT_START = 0.78;
const METEOR_BURST_MS = 6000;
const HORIZON_VH = 45;   

const sky = document.getElementById('sky');
const sun = document.getElementById('sun');
const starsWrap = document.getElementById('stars');
const clouds = document.getElementById('clouds');
const reflection = document.getElementById('reflection');
const w1 = document.getElementById('wave1');
const w2 = document.getElementById('wave2');
const w3 = document.getElementById('wave3');

function lerp(a,b,t){ return a + (b-a)*t; }
function hexToRgb(h){ h=h.replace('#',''); if(h.length===3){h=[h[0]+h[0],h[1]+h[1],h[2]+h[2]].join('')} const n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex({r,g,b}){ const f=x=>x.toString(16).padStart(2,'0'); return `#${f(r)}${f(g)}${f(b)}`; }
function mix(c1,c2,t){ const a=hexToRgb(c1), b=hexToRgb(c2); return rgbToHex({r:Math.round(lerp(a.r,b.r,t)), g:Math.round(lerp(a.g,b.g,t)), b:Math.round(lerp(a.b,b.b,t))}); }
function smoothstep(e0,e1,x){ const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t); }

const pal = {
  day:      ['#73b3ff','#ffd9a6','#ffe7c4'],
  sunset:   ['#6a7fd0','#ff8f3a','#ffb85c'],
  twilight: ['#37406a','#2a335a','#1f274a'],
  night:    ['#020815','#061225','#0b1e3a'] 
};

const STARS = 160; const stars = [];
for(let i=0;i<STARS;i++){
  const s = document.createElement('div');
  s.className='star';
  s.style.left = Math.random()*100 + '%';
  s.style.top  = Math.random()*45 + 'vh';
  s.dataset.f  = (0.5+Math.random()*1.5).toFixed(2);
  starsWrap.appendChild(s);
  stars.push(s);
}

let meteorBurstStart=0, nextMeteorAt=0, meteorBurstActive=false;
function spawnMeteor(){
  const m=document.createElement('div'); m.className='meteor';
  m.style.left=(6+Math.random()*34)+'vw'; m.style.top=(6+Math.random()*22)+'vh';
  starsWrap.appendChild(m);
  const d=1500+Math.random()*700;
  m.animate(
    [{transform:'translate(0,0) rotate(12deg)',opacity:1},
     {transform:'translate(70vw,36vh) rotate(12deg)',opacity:0}],
    {duration:d,easing:'cubic-bezier(.2,.6,.2,1)'}
  ).onfinish=()=>m.remove();
}
function inMeteorBurst(now){
  const cycleStart=Math.floor(now/DURATION)*DURATION;
  const burstStart=cycleStart + NIGHT_START*DURATION;
  return now>=burstStart && now<=burstStart+METEOR_BURST_MS;
}

function wavePath(amplitude,wavelength,phase,height){
  const W=1000, H=600, yBase=H*height; const pts=[];
  for(let x=0;x<=W;x+=20){
    const y = yBase
            + Math.sin((x+phase)/wavelength)*amplitude
            + Math.sin((x+phase)*0.5/wavelength)*amplitude*0.4;
    pts.push(`${x},${y.toFixed(2)}`);
  }
  return `M0,${H} L0,${pts[0].split(',')[1]} L ${pts.join(' ')} L ${W},${H} Z`;
}

let lastCloudCycle=-1;

function tick(now){
  const t = (now % DURATION) / DURATION;
  const cycle = Math.floor(now / DURATION);

  const sunProgress = Math.min(1, t*1.05);
  const easeOut = x=>1-Math.pow(1-x,2);
  const yvh = lerp(-12,70,easeOut(sunProgress));
  sun.style.top = yvh + 'vh';

  let top, mid, low, warmBand;
  if(t < TWILIGHT_START){
    const k = smoothstep(0,1, t/TWILIGHT_START);
    top = mix(pal.day[0], pal.sunset[0], k);
    mid = mix(pal.day[1], pal.sunset[1], k);
    low = mix(pal.day[2], pal.sunset[2], k);
    warmBand = 0.9;
  }else if(t < NIGHT_START){
    const k = smoothstep(0,1, (t-TWILIGHT_START)/(NIGHT_START-TWILIGHT_START));
    top = mix(pal.sunset[0], pal.twilight[0], k);
    mid = mix(pal.sunset[1], pal.twilight[1], k);
    low = mix(pal.sunset[2], pal.twilight[2], k);
    warmBand = 0.9*(1-k);
  }else{
    const k = smoothstep(0,1, (t-NIGHT_START)/(1-NIGHT_START));
    top = mix(pal.twilight[0], pal.night[0], k);
    mid = mix(pal.twilight[1], pal.night[1], k);
    low = mix(pal.twilight[2], pal.night[2], k);
    warmBand = 0;
  }
  const horizonWarm = mix(low, '#ffb45a', Math.min(1,warmBand));
  sky.style.background = `linear-gradient(180deg, ${top}, ${mid} 40%, ${horizonWarm} 62%, ${low} 82%)`;

  const sunVisible = yvh < (HORIZON_VH+2);
  reflection.style.opacity = sunVisible ? 0.95 : Math.max(0.06, warmBand*0.15);

  const starVis = Math.max(0,(t-(NIGHT_START-0.08))*6);
  for(const s of stars){
    const f=parseFloat(s.dataset.f);
    const tw=0.6 + Math.sin((now/1000)*f+f)*0.4;
    s.style.opacity = Math.min(1, starVis) * tw;
  }

  if(t > NIGHT_START && lastCloudCycle !== cycle){
    clouds.style.animation='cloudPass 120s linear 1 forwards';
    clouds.style.opacity='0.85';
    lastCloudCycle = cycle;
  }
  if(t <= NIGHT_START){
    clouds.style.animation='none';
    clouds.style.left='-120%';
    clouds.style.opacity='0';
  }

  if(inMeteorBurst(now) && !meteorBurstActive){
    meteorBurstActive = true;
    meteorBurstStart = now;
    nextMeteorAt = now;
  }
  if(meteorBurstActive){
    if(inMeteorBurst(now)){
      if(now >= nextMeteorAt){
        spawnMeteor();
        nextMeteorAt = now + 240 + Math.random()*260;
      }
    }else{
      meteorBurstActive = false;
    }
  }

  const p = now/1000;
  w1.setAttribute('d', wavePath(14,110,p*120,0.30));
  w2.setAttribute('d', wavePath(22,170,p*70, 0.42));
  w3.setAttribute('d', wavePath(32,240,p*40, 0.54));

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
