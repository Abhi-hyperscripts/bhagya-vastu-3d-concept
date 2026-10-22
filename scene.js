// Bhagya Vastu · Navagraha — the scroll-driven 3D scene.
// One world: a living sun, eight grahas on golden orbits, a zodiac ring, a Vastu mandala far below the sun
// joined to it by a beam of light, and a globe with arcs from Noida. The page's chapters each own a camera key.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const preBar = document.getElementById('preBar');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const lowEnd = touch || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const DEBUG = /[?&]debug/.test(location.search);
const setBar = (v) => { if (preBar) preBar.style.width = Math.round(v * 100) + '%'; };
setBar(0.15);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
renderer.setClearColor(0x07060d, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
let dprMax = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 1.75), dpr = dprMax;
renderer.setPixelRatio(dpr);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, 40, 120);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- shared GLSL ----------
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*snoise(p);p*=2.03;a*=.5;}return s;}
`;
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const UP = new THREE.Vector3(0, 1, 0);

// ---------- textures drawn on canvas ----------
function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const softGlow = glowTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.55)'], [0.45, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
const wideGlow = glowTexture([[0, 'rgba(255,255,255,0.9)'], [0.3, 'rgba(255,255,255,0.22)'], [0.65, 'rgba(255,255,255,0.05)'], [1, 'rgba(255,255,255,0)']]);

function textMesh(str, { size = 64, font = '500 italic', family = '"Playfair Display", Georgia, serif', color = '#f5c46b', height = 1, spacing = 0 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `${font} ${size}px ${family}`;
  const w = Math.ceil(g.measureText(str).width + spacing * str.length + size * 0.6);
  c.width = w; c.height = Math.ceil(size * 1.5);
  g.font = `${font} ${size}px ${family}`; g.fillStyle = color; g.textBaseline = 'middle';
  if (spacing) { let x = size * 0.3; for (const ch of str) { g.fillText(ch, x, c.height / 2); x += g.measureText(ch).width + spacing; } }
  else g.fillText(str, size * 0.3, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * c.width / c.height, height), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  return m;
}

// ---------- the sky: a slow nebula and stars ----------
const nebula = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: NOISE + /* glsl */`
    varying vec3 vD; uniform float uTime;
    void main(){
      vec3 d = normalize(vD);
      float n1 = fbm(d*2.1 + vec3(0., 0., uTime*.004));
      float n2 = fbm(d*4.3 + vec3(5.2, 1.3, -uTime*.003));
      float band = exp(-pow((d.y + .18*sin(d.x*2.4)) * 2.6, 2.));            // a soft galactic band
      vec3 col = vec3(.012, .009, .022);
      col += vec3(.20, .05, .16) * smoothstep(-.1, .8, n1) * (.3 + band*.7) * .28;  // lotus haze
      col += vec3(.30, .11, .02) * smoothstep(.15, .9, n2) * band * .22;          // saffron dust
      col += vec3(.06, .05, .16) * smoothstep(-.3, .6, n2) * .22;               // deep indigo
      gl_FragColor = vec4(col, 1.);
    }`
}));
scene.add(nebula);

function makeStars(n) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), s = new Float32Array(n), ph = new Float32Array(n), col = new Float32Array(n * 3);
  const tints = [[1, 1, 1], [1, 0.88, 0.7], [0.8, 0.86, 1], [1, 0.75, 0.6]];
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 260 + Math.random() * 420, q = Math.sqrt(1 - u * u);
    p.set([Math.cos(a) * q * r, u * r * 0.8, Math.sin(a) * q * r], i * 3);
    s[i] = Math.pow(Math.random(), 6) * 7 + 0.9; ph[i] = Math.random() * 6.28;
    col.set(tints[(Math.random() * tints.length) | 0], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: dpr } },
    vertexShader: `attribute float aSize; attribute float aPh; attribute vec3 aCol; uniform float uTime; uniform float uPx; varying float vA; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        vA = .55 + .45*sin(uTime*(.6+aPh*.25) + aPh*7.); vC = aCol;
        gl_PointSize = aSize * uPx * (420. / -mv.z); }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); float a = smoothstep(.5, 0., d); a *= a; gl_FragColor = vec4(vC * a * vA * 1.4, 1.); }`
  }));
}
const stars = makeStars(lowEnd ? 2600 : 5200);
scene.add(stars);

// ---------- Surya ----------
const SUN_R = 3.2;
const sunMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vO; varying vec3 vN; varying vec3 vP; void main(){ vO = position; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: NOISE + /* glsl */`
    varying vec3 vO; varying vec3 vN; varying vec3 vP; uniform float uTime;
    void main(){
      vec3 d = normalize(vO);
      float n = fbm(d*2.6 + vec3(0., uTime*.05, uTime*.03));
      float g = fbm(d*9. - vec3(uTime*.08));
      vec3 deep = vec3(1.0, .26, .03), hot = vec3(1.0, .72, .3), white = vec3(1.0, .93, .78);
      vec3 col = mix(deep, hot, smoothstep(-.5, .6, n));
      col = mix(col, white, smoothstep(.25, .85, g) * .55);
      float rim = pow(1. - abs(dot(normalize(vN), normalize(cameraPosition - vP))), 2.);
      col *= 1.7 + rim * 1.2;
      gl_FragColor = vec4(col, 1.);
    }`
});
const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 48), sunMat);
scene.add(sun);
const corona1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow, color: C('#ff8a2a', 1.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
corona1.scale.setScalar(SUN_R * 5.2);
const corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: wideGlow, color: C('#ff5a1a', 0.22), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
corona2.scale.setScalar(SUN_R * 16);
scene.add(corona1, corona2);

// ---------- the eight grahas ----------
const planetVS = `varying vec3 vO; varying vec3 vN; varying vec3 vP; void main(){ vO = position; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const planetFS = NOISE + /* glsl */`
  varying vec3 vO; varying vec3 vN; varying vec3 vP;
  uniform vec3 uA, uB, uC, uAtm; uniform float uSeed, uRough, uBands, uEclipse, uTime, uGlow;
  void main(){
    vec3 d = normalize(vO);
    float n = fbm(d*uRough + uSeed);
    vec3 base;
    if (uBands > 0.) {
      float b = sin(d.y*uBands*3.1416 + n*2.2 + fbm(d*vec3(1.,6.,1.)+uSeed)*1.4);
      base = mix(uA, uB, smoothstep(-.7, .7, b));
      base = mix(base, uC, smoothstep(.35, .85, fbm(d*vec3(3.,12.,3.)+uSeed*2.)) * .55);
    } else {
      base = mix(uA, uB, smoothstep(-.45, .55, n));
      base = mix(base, uC, smoothstep(.25, .8, fbm(d*uRough*2.4 + uSeed + 7.)) * .5);
    }
    vec3 N = normalize(vN), L = normalize(-vP), V = normalize(cameraPosition - vP);
    float dif = smoothstep(-.12, .65, dot(N, L));
    float rim = pow(1. - max(dot(N, V), 0.), 3.);
    vec3 col = base * (.035 + dif * 1.05) + uAtm * rim * (.18 + dif * 1.3);
    if (uEclipse > .5) {               // Rahu and Ketu: shadow bodies, only their burning rim is seen
      col = base * .015 + uAtm * pow(rim, 1.35) * 2.6 + uAtm * .05 * (.5 + .5*sin(uTime*1.3 + uSeed));
    }
    col += uAtm * uGlow * .35 * rim;
    gl_FragColor = vec4(col, 1.);
  }`;
const PLANETS = [
  { key: 'budh', name: 'Budh', en: 'Mercury', num: 5, r: 0.55, orbit: 6.4, w: 0.11, a0: 0.9, A: '#174d3f', B: '#6fbf95', C: '#d6f3e2', atm: '#7af0bb', rough: 3.6, tilt: 0.05 },
  { key: 'shukra', name: 'Shukra', en: 'Venus', num: 6, r: 0.85, orbit: 9.0, w: 0.085, a0: 2.6, A: '#b8927a', B: '#fff0de', C: '#f2bfd2', atm: '#ffd2e6', rough: 1.9, tilt: -0.04 },
  { key: 'chandra', name: 'Chandra', en: 'Moon', num: 2, r: 0.72, orbit: 11.8, w: 0.07, a0: 4.4, A: '#5b6274', B: '#d4d9e5', C: '#ffffff', atm: '#b9d0ff', rough: 5.2, tilt: 0.06 },
  { key: 'mangal', name: 'Mangal', en: 'Mars', num: 9, r: 0.8, orbit: 14.6, w: 0.058, a0: 0.4, A: '#4c1206', B: '#cf4d25', C: '#ff9a62', atm: '#ff7a4e', rough: 3.1, tilt: -0.03 },
  { key: 'guru', name: 'Guru', en: 'Jupiter', num: 3, r: 1.95, orbit: 19, w: 0.04, a0: 1.3, A: '#8b5b22', B: '#f2cf93', C: '#fff1cf', atm: '#ffd88a', rough: 2.2, bands: 7, tilt: 0.02 },
  { key: 'shani', name: 'Shani', en: 'Saturn', num: 8, r: 1.5, orbit: 23.6, w: 0.03, a0: 5.25, A: '#151c45', B: '#4a5fb0', C: '#b5c2f2', atm: '#8ea2ff', rough: 2.0, bands: 5, rings: true, tilt: -0.05 },
  { key: 'rahu', name: 'Rahu', en: 'North Node', num: 4, r: 1.05, orbit: 27.6, w: 0.022, a0: 1.95, A: '#120c1c', B: '#2a1a3c', C: '#3b2650', atm: '#b46cff', rough: 2.5, eclipse: true, tilt: 0 },
  { key: 'ketu', name: 'Ketu', en: 'South Node', num: 7, r: 1.05, orbit: 27.6, w: 0.022, a0: 1.95 + Math.PI, A: '#1c0e08', B: '#3a1c0c', C: '#55301a', atm: '#ff8a3d', rough: 2.5, eclipse: true, tilt: 0 },
];
const system = new THREE.Group(); scene.add(system);
PLANETS.forEach((p, i) => {
  p.mat = new THREE.ShaderMaterial({ vertexShader: planetVS, fragmentShader: planetFS, uniforms: {
    uA: { value: C(p.A) }, uB: { value: C(p.B) }, uC: { value: C(p.C) }, uAtm: { value: C(p.atm) },
    uSeed: { value: i * 3.7 + 1.3 }, uRough: { value: p.rough }, uBands: { value: p.bands || 0 }, uEclipse: { value: p.eclipse ? 1 : 0 }, uTime: { value: 0 }, uGlow: { value: 0 } } });
  p.mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 64, 32), p.mat);
  p.mesh.rotation.z = 0.2 * (i % 2 ? 1 : -1);
  p.holder = new THREE.Group(); p.holder.add(p.mesh); system.add(p.holder);
  if (p.rings) {
    const rg = new THREE.RingGeometry(p.r * 1.45, p.r * 2.55, 160, 1);
    const ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
      uniforms: { uIn: { value: p.r * 1.45 }, uOut: { value: p.r * 2.55 } },
      vertexShader: `varying vec3 vL; varying vec3 vW; void main(){ vL = position; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `varying vec3 vL; varying vec3 vW; uniform float uIn; uniform float uOut;
        float h(float x){ return fract(sin(x*127.1)*43758.5453); }
        void main(){ float r = (length(vL.xy) - uIn) / (uOut - uIn);
          float b = .62 + .2*sin(r*90.) + .18*sin(r*23. + 1.3); b *= smoothstep(0., .06, r) * smoothstep(1., .9, r);
          b *= 1. - .75*smoothstep(.52, .56, r)*smoothstep(.62, .58, r);   // a Cassini-like gap
          vec3 col = mix(vec3(.55,.42,.26), vec3(1.,.86,.6), r);
          float lit = .35 + .65*max(dot(normalize(-vW), vec3(0.,1.,0.))*.2 + .8, 0.);
          gl_FragColor = vec4(col * b * lit * .95, b * .62); }`
    }));
    ring.rotation.x = -Math.PI / 2 + 0.42; ring.rotation.y = 0.18;
    p.holder.add(ring);
  }
  if (p.eclipse) {   // a halo sprite behind each node, brightest when the sun sits behind it
    p.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow, color: C(p.atm, 1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
    p.halo.scale.setScalar(p.r * 5); p.holder.add(p.halo);
  }
  // orbit line (Rahu and Ketu share one)
  if (p.key !== 'ketu') {
    const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: C(p.eclipse ? '#c49cff' : '#f5c46b', 0.9), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.rotation.z = p.tilt; p.orbitLine = line; system.add(line);
  }
});

// ---------- zodiac ring: twelve rashis in gold ----------
const zodiac = new THREE.Group(); scene.add(zodiac);
const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const zMat = new THREE.LineBasicMaterial({ color: C('#f5c46b', 0.9), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
function circle(r, seg = 360) { const pts = []; for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), zMat); }
zodiac.add(circle(32), circle(35.6), circle(36.1));
{ const seg = []; for (let k = 0; k < 360; k += 2.5) { const a = k * Math.PI / 180, long = k % 30 === 0, r0 = long ? 31.4 : 35.0; seg.push(new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * 35.6, 0, Math.sin(a) * 35.6)); }
  zodiac.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), zMat)); }
const signMeshes = [];

// ---------- the Vastu mandala, far below the sun ----------
const M = new THREE.Vector3(0, -44, 0), MS = 26;   // centre and size of the 9 x 9 grid
const mandala = new THREE.Group(); mandala.position.copy(M); scene.add(mandala);
const mandalaMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uReveal: { value: 0 }, uTime: { value: 0 } },
  extensions: { derivatives: true },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform float uReveal; uniform float uTime;
    float line(float d, float w){ float f = fwidth(d); return 1. - smoothstep(w, w + f*1.5, abs(d)); }
    void main(){
      vec2 p = (vUv - .5) * 1.16;               // grid spans -.5..+.5, the margin carries the borders
      vec2 q = p + .5;
      float inside = step(0., q.x)*step(q.x, 1.)*step(0., q.y)*step(q.y, 1.);
      vec2 g = q * 9.; vec2 gd = abs(fract(g + .5) - .5); vec2 fw = fwidth(g);
      float grid = (1. - min(min(gd.x/fw.x, gd.y/fw.y), 1.)) * inside;
      float m = max(abs(p.x), abs(p.y));
      float border = line(m - .5, .0012) + line(m - .535, .0008) * .7;
      float centre = step(abs(p.x), 1./6.) * step(abs(p.y), 1./6.);
      float diag = (line(p.x - p.y, .0008) + line(p.x + p.y, .0008)) * inside * .35;
      float r = length(p), a = atan(p.y, p.x);
      float rays = line(sin(a*8.) * r, .0009) * inside * .22;
      float rings = (line(r - .5/3., .0009) + line(r - .5*2./3., .0007)) * inside * .3;
      float pulse = .55 + .45*sin(uTime*1.6);
      float reveal = smoothstep(uReveal*.86, uReveal*.86 - .05, r);
      vec3 gold = vec3(1., .74, .36);
      vec3 col = gold * (grid*.62 + border*1.1 + diag*.8 + rays + rings) + vec3(1., .45, .12) * centre * (.16 + .1*pulse);
      col += vec3(1., .5, .15) * exp(-r*r*60.) * (.6 + .4*pulse);           // brahmasthan heart
      gl_FragColor = vec4(col * reveal, 1.);
    }`
});
const mandalaPlane = new THREE.Mesh(new THREE.PlaneGeometry(MS * 1.16, MS * 1.16), mandalaMat);
mandalaPlane.rotation.x = -Math.PI / 2; mandala.add(mandalaPlane);
// the house: walls drawn as lines of saffron light that rise from the grid
const house = new THREE.Group(); mandala.add(house);
{
  const U = MS / 9, W = [ // wall segments on the grid, in padas
    [-3, -2.2, 3, -2.2], [3, -2.2, 3, 2.4], [3, 2.4, -3, 2.4], [-3, 2.4, -3, -2.2],
    [-0.6, -2.2, -0.6, 0.6], [-3, 0.6, 0.4, 0.6], [1.2, 0.6, 3, 0.6], [1.2, 0.6, 1.2, 2.4], [-0.6, -0.6, 3, -0.6]];
  const H = 3.4, v = [];
  W.forEach(([x1, z1, x2, z2]) => { const a = [x1 * U, z1 * U], b = [x2 * U, z2 * U];
    v.push(a[0], 0, a[1], b[0], 0, b[1], a[0], H, a[1], b[0], H, b[1], a[0], 0, a[1], a[0], H, a[1], b[0], 0, b[1], b[0], H, b[1]); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  house.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C('#ff9a3d', 2.2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  // a faint floor fill so the plan reads as a space
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6 * U, 4.6 * U), new THREE.MeshBasicMaterial({ color: C('#ff7a1f', 0.35), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.02, 0.1 * U); house.add(floor);
}
house.scale.y = 0.001;
// the beam: cosmic energy falling from Surya onto the Brahmasthan
const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uK;
    void main(){ float edge = pow(sin(vUv.x*3.14159), 2.);   // soft across the cylinder
      float flow = .6 + .4*sin(vUv.y*40. + uTime*5.);
      float a = edge * smoothstep(0., .08, vUv.y) * smoothstep(1., .55, vUv.y) * flow * uK;
      gl_FragColor = vec4(vec3(1., .62, .25) * a * .8, 1.); }`
});
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.95, -M.y - SUN_R, 48, 1, true), beamMat);
beam.position.set(0, M.y / 2 - SUN_R / 2 + 0.05, 0); beam.rotation.y = 0.3;
scene.add(beam);
const dirLabels = [];

// ---------- the globe, with arcs from Noida ----------
const E = new THREE.Vector3(56, 7, 34), ER = 3.2;
const earth = new THREE.Group(); earth.position.copy(E); scene.add(earth);
const earthMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: planetVS,
  fragmentShader: NOISE + /* glsl */`
    varying vec3 vO; varying vec3 vN; varying vec3 vP; uniform float uTime;
    void main(){
      vec3 d = normalize(vO);
      float c = fbm(d*1.7 + 2.1) + .12*fbm(d*7.);
      float land = smoothstep(.04, .1, c);
      vec3 ocean = vec3(.02, .06, .14), ground = mix(vec3(.10, .17, .10), vec3(.36, .28, .14), smoothstep(.1, .5, c));
      vec3 base = mix(ocean, ground, land);
      vec3 N = normalize(vN), L = normalize(-vP), V = normalize(cameraPosition - vP);
      float dif = smoothstep(-.1, .6, dot(N, L));
      float lights = land * smoothstep(.55, .9, snoise(d*38.)*.5 + .5) * (1. - dif);
      float rim = pow(1. - max(dot(N, V), 0.), 2.6);
      vec3 col = base * (.06 + dif) + vec3(1., .62, .3) * lights * 1.6 + vec3(.35, .6, 1.) * rim * (.25 + dif);
      gl_FragColor = vec4(col, 1.);
    }`
});
const globe = new THREE.Mesh(new THREE.SphereGeometry(ER, 96, 48), earthMat);
earth.add(globe);
const latLon = (lat, lon, r = ER) => { const ph = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); };
const CITIES = [['Noida', 28.54, 77.39], ['Mumbai', 19.08, 72.88], ['Dubai', 25.2, 55.27], ['London', 51.5, -0.12], ['New York', 40.71, -74.0], ['Toronto', 43.65, -79.38], ['Singapore', 1.35, 103.82], ['Sydney', -33.87, 151.2]];
const arcs = new THREE.Group(); earth.add(arcs);
const arcMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
  vertexShader: `attribute float aT; attribute float aPh; varying float vT; varying float vPh; void main(){ vT = aT; vPh = aPh; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying float vT; varying float vPh; uniform float uTime; uniform float uK;
    void main(){ float h = fract(uTime*.22 + vPh); float pulse = exp(-pow((vT - h)*9., 2.));
      float drawn = step(vT, uK * 1.05);
      gl_FragColor = vec4(vec3(1., .66, .3) * (.22 + pulse*1.8) * drawn * uK, 1.); }`
});
const noida = latLon(28.54, 77.39);
CITIES.slice(1).forEach(([, lat, lon], i) => {
  const b = latLon(lat, lon), mid = noida.clone().add(b).normalize().multiplyScalar(ER * (1 + 0.22 + noida.distanceTo(b) / ER * 0.18));
  const curve = new THREE.QuadraticBezierCurve3(noida.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
  const pts = curve.getPoints(80), g = new THREE.BufferGeometry().setFromPoints(pts);
  g.setAttribute('aT', new THREE.Float32BufferAttribute(pts.map((_, k) => k / 80), 1));
  g.setAttribute('aPh', new THREE.Float32BufferAttribute(pts.map(() => i * 0.137), 1));
  arcs.add(new THREE.Line(g, arcMat));
});
CITIES.forEach(([, lat, lon], i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow, color: C(i ? '#ffb070' : '#ffd38a', i ? 1.6 : 2.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.position.copy(latLon(lat, lon, ER * 1.01)); s.scale.setScalar(i ? 0.32 : 0.55); arcs.add(s); });
const atm = new THREE.Sprite(new THREE.SpriteMaterial({ map: wideGlow, color: C('#4f7dff', 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
atm.scale.setScalar(ER * 3.4); earth.add(atm);
// turn the globe so India faces back towards the sun-lit side, a little past the terminator
earth.rotation.y = -1.25;

// ---------- DOM labels for the grahas and the cities ----------
const labelsEl = document.getElementById('labels');
function makeLabel(html, color) { const d = document.createElement('div'); d.className = 'lbl'; d.style.setProperty('--c', color); d.innerHTML = html; labelsEl.appendChild(d); return d; }
const SURYA = { name: 'Surya', en: 'Sun', num: 1, atm: '#ffb347' };
[SURYA, ...PLANETS].forEach((p) => { p.label = makeLabel(`<span class="num">${p.num}</span><span class="dot"></span><span class="tx"><b>${p.name}</b><small>${p.en}</small></span>`, p.atm); });
CITIES.forEach((c) => { c.label = makeLabel(`<span class="dot"></span><span class="tx"><b>${c[0]}</b></span>`, '#ffb070'); });

// ---------- chapters ----------
const sections = [...document.querySelectorAll('[data-ch]')];
let centers = [], H = innerHeight, W = innerWidth;
function measure() { const sy = scrollY; centers = sections.map((s) => { const r = s.getBoundingClientRect(); return r.top + sy + r.height / 2; }); }
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const bump = (x, c, w = 0.85) => clamp01(1 - Math.abs(x - c) / w);
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// world position of a graha at its current angle
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
function planetPos(p, out) { return p.holder.getWorldPosition(out); }

// a camera key: where to stand, what to look at, and where on screen the subject should sit
function frameKey(target, pos, R, sx, sy, out) {
  const narrow = camera.aspect < 0.82;
  if (narrow) { pos = tmp3.copy(pos).sub(target).multiplyScalar(1.45).add(target); sx = 0; sy = sy <= -1.5 ? sy * 1.25 : Math.max(sy || 0, 0.95); }
  const dir = tmp.copy(target).sub(pos).normalize(), right = tmp2.crossVectors(dir, UP).normalize(), cu = new THREE.Vector3().crossVectors(right, dir);
  out.pos.copy(pos);
  out.look.copy(target).addScaledVector(right, -sx * R).addScaledVector(cu, -(sy || 0) * R);
  return out;
}
function closeKey(p, k, sx, out, sy = 0) {
  const P = planetPos(p, new THREE.Vector3()), R = p.r, outw = P.clone().normalize(), tan = new THREE.Vector3().crossVectors(UP, outw).normalize();
  const pos = P.clone().addScaledVector(outw, -R * k * 0.5).addScaledVector(tan, R * k * 0.8).addScaledVector(UP, R * k * 0.32);
  return frameKey(P, pos, R, sx, sy, out);
}
function eclipseKey(p, out) {
  const P = planetPos(p, new THREE.Vector3()), R = p.r, outw = P.clone().normalize(), tan = new THREE.Vector3().crossVectors(UP, outw).normalize();
  const pos = P.clone().addScaledVector(outw, R * 9).addScaledVector(UP, R * 0.7).addScaledVector(tan, R * 0.9);
  return frameKey(P, pos, R, 2.4, 0, out);
}
const byKey = Object.fromEntries(PLANETS.map((p) => [p.key, p]));
const O = new THREE.Vector3();
const KEYS = [
  (o) => frameKey(O, new THREE.Vector3(6, 15, 56), 13, 1.25, 0.1, o),                       // 0 hero: the whole Navagraha
  (o) => frameKey(O, new THREE.Vector3(0, 54, 30), 10, 0, -0.2, o),                          // 1 trinity: from above
  (o) => frameKey(M, M.clone().add(new THREE.Vector3(15, 31, 37)), 13, -0.78, 0, o),            // 2 vastu: down the beam
  (o) => frameKey(O, new THREE.Vector3(-9, 8, 30), 9, 1.15, 0, o),                          // 3 astrology: among the grahas
  (o) => frameKey(O, new THREE.Vector3(28, 12, 13), 9, -1.15, 0, o),                          // 4 numerology
  (o) => closeKey(byKey.shani, 9, 2.1, o),                                                   // 5 services
  (o) => closeKey(byKey.chandra, 10, -2.2, o),                                               // 6 calculators
  (o) => closeKey(byKey.guru, 7.5, 2.0, o),                                                  // 7 sciences
  (o) => frameKey(O, new THREE.Vector3(8, 2.6, 10), SUN_R, -2.2, 0, o),                      // 8 why: Surya close
  (o) => closeKey(byKey.mangal, 10, 2.1, o),                                                 // 9 YouTube
  (o) => frameKey(O, new THREE.Vector3(0, 1.4, 46), 6, 0, -1.25, o),                         // 10 steps: edge-on
  (o) => eclipseKey(byKey.rahu, o),                                                          // 11 about: an eclipse
  (o) => closeKey(byKey.shukra, 10, -2.1, o),                                                // 12 reviews
  (o) => { const n = noida.clone().applyEuler(earth.rotation).normalize(), pos = E.clone().addScaledVector(n, ER * 4.4).addScaledVector(UP, ER * 0.9); return frameKey(E, pos, ER, 1.15, 0, o); }, // 13 worldwide
  (o) => frameKey(O, new THREE.Vector3(0, 74, 6), 20, 0, 0, o),                              // 14 FAQ: the zodiac from above
  (o) => camera.aspect < 0.82 ? frameKey(new THREE.Vector3(4, 0, 0), new THREE.Vector3(26, 9, 26), 9, 0, -1.6, o) : frameKey(new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(0.5, 10, 57), 9, 0, -1.6, o), // 15 close: the alignment, beneath the words
  (o) => frameKey(O, new THREE.Vector3(0, 46, 40), 12, 0, -0.6, o),                         // 16 every service
];
const kA = { pos: new THREE.Vector3(), look: new THREE.Vector3() }, kB = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), curLook = new THREE.Vector3();

// ---------- input ----------
let mx = 0, my = 0, tmx = 0, tmy = 0;
addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1; }, { passive: true });

function resize() {
  W = innerWidth; H = innerHeight;
  camera.aspect = W / H; camera.fov = camera.aspect < 0.82 ? 50 : 38; camera.updateProjectionMatrix();
  renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H);
  stars.material.uniforms.uPx.value = dpr;
  measure();
}
addEventListener('resize', resize);
new ResizeObserver(() => measure()).observe(document.body);

// ---------- loop ----------
let sm = 0, smV = 0, last = performance.now(), time = 0, introT = -1, align = 0, started = false;
const frameTimes = []; let adaptAt = 0;
const lblPos = new THREE.Vector3();
let dbg; if (DEBUG) { dbg = document.createElement('div'); dbg.style.cssText = 'position:fixed;left:8px;top:70px;z-index:99;font:11px monospace;color:#f5c46b;background:rgba(0,0,0,.6);padding:4px 8px'; document.body.appendChild(dbg); }

function adapt(dt) {
  frameTimes.push(dt); if (frameTimes.length > 90) frameTimes.shift();
  const now = performance.now(); if (!started || now - introT < 4500 || now < adaptAt || frameTimes.length < 90) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  if (avg > 0.024 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); composer.setSize(W, H); stars.material.uniforms.uPx.value = dpr; adaptAt = now + 2500; frameTimes.length = 0; }
}

let copyRect = null;
function projectLabel(el, world, worldR, opacity, extraClass) {
  if (opacity < 0.01) { if (el._o !== 0) { el.style.opacity = 0; el._o = 0; } return; }
  lblPos.copy(world).project(camera);
  if (lblPos.z > 1 || Math.abs(lblPos.x) > 1.2 || Math.abs(lblPos.y) > 1.2) { el.style.opacity = 0; el._o = 0; return; }
  const dist = camera.position.distanceTo(world), rpx = worldR / (dist * Math.tan(camera.fov * Math.PI / 360)) * H / 2;
  const x = (lblPos.x * 0.5 + 0.5) * W + rpx + 10, y = (-lblPos.y * 0.5 + 0.5) * H - 12;
  if (copyRect && x > copyRect.left - 150 && x < copyRect.right && y > copyRect.top - 20 && y < copyRect.bottom) opacity *= 0;
  el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  el.style.opacity = opacity.toFixed(3); el._o = opacity;
  if (extraClass !== undefined) el.classList.toggle('shownum', extraClass);
}

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += reduced ? dt * 0.25 : dt; adapt(dt);

  // scroll -> chapter float
  const c = scrollY + H / 2; let t = 0;
  if (centers.length > 1) {
    if (c <= centers[0]) t = 0; else if (c >= centers[centers.length - 1]) t = centers.length - 1;
    else for (let i = 0; i < centers.length - 1; i++) if (c >= centers[i] && c <= centers[i + 1]) { t = i + (centers[i + 1] > centers[i] ? (c - centers[i]) / (centers[i + 1] - centers[i]) : 0); break; }
  }
  // a critically damped spring on the chapter, so the camera glides and settles instead of snapping
  if (reduced) sm = t; else { const k = 9, d = 2 * Math.sqrt(k) * 0.92; smV += (k * (t - sm) - d * smV) * dt; sm += smV * dt; }
  sm = Math.min(KEYS.length - 1, Math.max(0, sm));

  // grahas move; at the close they fall into one line through the sun (Ketu always opposite Rahu)
  align += ((sm > 14.35 ? 1 : 0) - align) * Math.min(1, dt * 1.6);
  PLANETS.forEach((p) => {
    let a = p.a0 + time * p.w * (reduced ? 0.2 : 1);
    const target = p.key === 'ketu' ? Math.PI : 0, d = Math.atan2(Math.sin(target - a), Math.cos(target - a));
    a += d * ease(align);
    p.holder.position.set(Math.cos(a) * p.orbit, Math.sin(a) * p.orbit * p.tilt, Math.sin(a) * p.orbit);
    p.mesh.rotation.y += dt * 0.12;
    p.mat.uniforms.uTime.value = time;
    p.mat.uniforms.uGlow.value = bump(sm, 3) + bump(sm, 4) + align;
    if (p.halo) { const toCam = tmp.copy(camera.position).sub(p.holder.position).normalize(), behind = Math.max(0, toCam.dot(tmp2.copy(p.holder.position).normalize())); p.halo.material.opacity = 0.25 + behind * 0.9; }
  });
  sun.rotation.y += dt * 0.03;
  sunMat.uniforms.uTime.value = time; nebula.material.uniforms.uTime.value = time; stars.material.uniforms.uTime.value = time;
  zodiac.rotation.y = time * 0.012;
  zMat.opacity = 0.12 + bump(sm, 14, 1.2) * 0.4;
  signMeshes.forEach((m) => { m.material.opacity = 0.08 + bump(sm, 14, 1.2) * 0.85; });

  // the mandala and its beam belong to the Vastu chapter
  const vk = bump(sm, 2, 1.25);
  mandalaMat.uniforms.uReveal.value = ease(clamp01(vk * 1.25)); mandalaMat.uniforms.uTime.value = time;
  house.scale.y = Math.max(0.001, ease(clamp01((vk - 0.35) / 0.55))); house.visible = vk > 0.02; mandalaPlane.visible = vk > 0.01;
  beamMat.uniforms.uK.value = clamp01(bump(sm, 2, 1.1) * 1.3); beam.visible = beamMat.uniforms.uK.value > 0.01; beamMat.uniforms.uTime.value = time;
  dirLabels.forEach((m) => { m.material.opacity = ease(clamp01((vk - 0.3) / 0.5)) * 0.9; });

  // the globe and its arcs belong to the worldwide chapter
  const ek = bump(sm, 13, 1.1);
  arcMat.uniforms.uK.value = ease(clamp01((ek - 0.2) / 0.6)); arcMat.uniforms.uTime.value = time;
  earthMat.uniforms.uTime.value = time; earth.rotation.y = -1.25 + Math.sin(time * 0.05) * 0.06;
  arcs.children.forEach((o) => { if (o.isSprite) o.material.opacity = arcMat.uniforms.uK.value; });

  // camera: blend the two keys either side of the chapter float, lifting through the middle
  const i0 = Math.floor(sm), i1 = Math.min(KEYS.length - 1, i0 + 1), f = ease(clamp01(sm - i0));
  KEYS[i0](kA); KEYS[i1](kB);
  camPos.lerpVectors(kA.pos, kB.pos, f); camLook.lerpVectors(kA.look, kB.look, f);
  camPos.y += Math.sin(Math.PI * f) * kA.pos.distanceTo(kB.pos) * 0.12;
  // opening shot: a slow dolly in from deep space once the curtain lifts
  if (started && introT >= 0 && !reduced) { const k = ease(clamp01((now - introT) / 3600)); camPos.lerp(tmp.copy(camPos).multiplyScalar(2.2).add(tmp2.set(0, 18, 0)), 1 - k); }
  else if (!started) camPos.multiplyScalar(2.2).add(tmp2.set(0, 18, 0));
  mx += (tmx - mx) * Math.min(1, dt * 2.5); my += (tmy - my) * Math.min(1, dt * 2.5);
  const dist = camPos.distanceTo(camLook);
  tmp.subVectors(camLook, camPos).normalize(); tmp2.crossVectors(tmp, UP).normalize();
  camPos.addScaledVector(tmp2, mx * dist * 0.025).addScaledVector(UP, -my * dist * 0.018);
  camera.position.copy(camPos);
  curLook.lerp(camLook, 1); camera.lookAt(curLook);

  // labels (skipped where the chapter's copy is)
  { const sec = sections[Math.round(sm)], cp = sec && sec.querySelector('.copy'); copyRect = cp ? cp.getBoundingClientRect() : null; }
  const nameK = Math.max(bump(sm, 3), bump(sm, 4), clamp01((sm - 14.4) * 2)), numOn = sm > 3.5 && sm < 4.6 || sm > 14.6;
  projectLabel(SURYA.label, O, SUN_R, nameK, numOn);
  const onlyNum = align > 0.5;
  [SURYA, ...PLANETS].forEach((p) => p.label.classList.toggle('onlynum', onlyNum));
  PLANETS.forEach((p) => projectLabel(p.label, planetPos(p, tmp3), p.r, nameK * (p.eclipse ? 0.9 : 1), numOn));
  CITIES.forEach((cty) => {
    const w = latLon(cty[1], cty[2], ER * 1.02).applyEuler(earth.rotation).add(E);
    const facing = tmp.copy(w).sub(E).normalize().dot(tmp2.copy(camera.position).sub(w).normalize());
    projectLabel(cty.label, w, 0.05, ek > 0.5 ? clamp01(facing * 3) * arcMat.uniforms.uK.value : 0);
  });

  { const ds = camera.position.length(); corona1.material.opacity = 0.35 + 0.65 * clamp01((ds - 14) / 40); corona2.material.opacity = 0.25 + 0.75 * clamp01((ds - 20) / 50); }
  composer.render();
  if (dbg && (now | 0) % 10 === 0) dbg.textContent = `${(1 / dt).toFixed(0)} fps · dpr ${dpr} · ch ${sm.toFixed(2)}`;
  if (warm < WARM) { warm++; setBar(0.4 + 0.6 * warm / WARM); if (warm === WARM) reveal(); }
}

// ---------- boot: fonts first (the rashi names and directions are drawn with them), then a few warm frames ----------
let warm = 0; const WARM = 8;
function reveal() {
  document.getElementById('pre').classList.add('done');
  started = true; introT = performance.now();
  if (window.__startSlides) window.__startSlides();
  setTimeout(measure, 300);
}
async function boot() {
  try { await Promise.race([Promise.all([document.fonts.load('italic 500 64px "Playfair Display"'), document.fonts.load('500 64px "Playfair Display"'), document.fonts.load('500 32px Poppins')]), new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* fall back to system serif */ }
  setBar(0.3);
  RASHI.forEach((n, i) => {
    const a = (i + 0.5) / 12 * Math.PI * 2, m = textMesh(n.toUpperCase(), { size: 56, font: '500', family: 'Poppins, sans-serif', color: '#f5c46b', height: 0.95, spacing: 14 });
    const pivot = new THREE.Group(); pivot.rotation.y = -a;
    m.position.set(33.8, 0, 0); m.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    pivot.add(m); zodiac.add(pivot); signMeshes.push(m);
  });
  const DIRS = [['UTTARA · N', 0], ['ISHANYA · NE', 45], ['PURVA · E', 90], ['AGNEYA · SE', 135], ['DAKSHINA · S', 180], ['NAIRUTYA · SW', 225], ['PASCHIMA · W', 270], ['VAYAVYA · NW', 315]];
  DIRS.forEach(([s, deg]) => {
    const a = deg * Math.PI / 180, r = deg % 90 === 0 ? MS * 0.62 : MS * 0.8;
    const m = textMesh(s, { size: 56, font: '500', family: 'Poppins, sans-serif', color: deg === 0 ? '#ffb070' : '#f5c46b', height: 0.9, spacing: 10 });
    m.position.set(Math.sin(a) * r, 0.05, -Math.cos(a) * r); m.rotation.set(-Math.PI / 2, 0, -a);
    m.material.opacity = 0; mandala.add(m); dirLabels.push(m);
  });
  resize();
  renderer.compile(scene, camera);
  setBar(0.4);
  requestAnimationFrame(frame);
}
boot();
