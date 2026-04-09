import * as THREE from 'three';

// ── Particle pool ─────────────────────────────────────────────────────────────
function mkParticle() {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    life: 0, maxLife: 1, size: 1, opacity: 1, active: false
  };
}

// ── Weather presets ───────────────────────────────────────────────────────────
export const WEATHER_PRESETS = {
  clear:       { rain:0, snow:0, fog:0, wind:0.1, lightning:0, hail:0 },
  lightRain:   { rain:0.3, snow:0, fog:0.1, wind:0.3, lightning:0, hail:0 },
  heavyRain:   { rain:0.9, snow:0, fog:0.3, wind:0.8, lightning:0.1, hail:0 },
  thunderstorm:{ rain:1.0, snow:0, fog:0.2, wind:1.0, lightning:0.4, hail:0 },
  lightSnow:   { rain:0, snow:0.3, fog:0.1, wind:0.2, lightning:0, hail:0 },
  blizzard:    { rain:0, snow:1.0, fog:0.6, wind:1.0, lightning:0, hail:0 },
  hailstorm:   { rain:0.4, snow:0, fog:0.1, wind:0.9, lightning:0.2, hail:0.8 },
  fog:         { rain:0, snow:0, fog:0.9, wind:0.05, lightning:0, hail:0 },
  sandstorm:   { rain:0, snow:0, fog:0.8, wind:1.0, lightning:0, hail:0 },
  drizzle:     { rain:0.15, snow:0, fog:0.2, wind:0.15, lightning:0, hail:0 },
};

// ── Create weather system ─────────────────────────────────────────────────────
export function createWeatherSystem(scene, options = {}) {
  const maxParticles = options.maxParticles || 8000;
  const spread       = options.spread       || 40;
  const height       = options.height       || 20;

  // Geometry pools
  const rainPositions = new Float32Array(maxParticles * 3);
  const rainSizes     = new Float32Array(maxParticles);
  const snowPositions = new Float32Array(maxParticles * 3);
  const snowSizes     = new Float32Array(maxParticles);

  const rainGeo  = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  rainGeo.setAttribute('size',     new THREE.BufferAttribute(rainSizes, 1));

  const snowGeo  = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  snowGeo.setAttribute('size',     new THREE.BufferAttribute(snowSizes, 1));

  // Shaders for film-quality rain streaks
  const rainMat = new THREE.PointsMaterial({
    color: 0xaaccff, size: 0.06, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8,
    blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true
  });

  const rainMesh = new THREE.Points(rainGeo, rainMat);
  const snowMesh = new THREE.Points(snowGeo, snowMat);
  rainMesh.userData.weatherParticle = true;
  snowMesh.userData.weatherParticle = true;
  rainMesh.frustumCulled = false;
  snowMesh.frustumCulled = false;
  scene.add(rainMesh);
  scene.add(snowMesh);

  // Internal particle state
  const rainPts = Array.from({length: maxParticles}, () => mkParticle());
  const snowPts = Array.from({length: maxParticles}, () => mkParticle());

  // Lightning state
  let lightningTimer = 0;
  let lightningFlash = null;

  const system = {
    scene, spread, height, maxParticles,
    rainMesh, snowMesh, rainPts, snowPts,
    rainGeo, snowGeo, rainMat, snowMat,
    // Current weather params
    rain: 0, snow: 0, fog: 0, wind: 0.1, lightning: 0, hail: 0,
    windDir: new THREE.Vector3(0.3, 0, 0.1),
    enabled: false,
    fogObj: null,
  };

  return system;
}

// ── Reset particle ────────────────────────────────────────────────────────────
function resetRainParticle(p, system) {
  p.position.set(
    (Math.random() - 0.5) * system.spread,
    system.height * (0.5 + Math.random() * 0.5),
    (Math.random() - 0.5) * system.spread
  );
  const speed = 8 + Math.random() * 4;
  p.velocity.set(
    system.windDir.x * system.wind * 2 + (Math.random()-0.5)*0.2,
    -speed,
    system.windDir.z * system.wind * 2 + (Math.random()-0.5)*0.2
  );
  p.life = 0; p.maxLife = system.height / speed; p.active = true;
}

function resetSnowParticle(p, system) {
  p.position.set(
    (Math.random() - 0.5) * system.spread,
    system.height * (0.5 + Math.random() * 0.5),
    (Math.random() - 0.5) * system.spread
  );
  const speed = 0.5 + Math.random() * 1.0;
  p.velocity.set(
    system.windDir.x * system.wind + (Math.random()-0.5)*0.3,
    -speed,
    system.windDir.z * system.wind + (Math.random()-0.5)*0.3
  );
  p.life = 0; p.maxLife = system.height / speed; p.active = true;
}

// ── Step weather ──────────────────────────────────────────────────────────────
export function stepWeather(system, dt = 1/60, camera) {
  if (!system.enabled) return;

  const activeRain = Math.floor(system.rain * system.maxParticles);
  const activeSnow = Math.floor(system.snow * system.maxParticles);
  const origin = camera ? camera.position : new THREE.Vector3();

  // Rain
  let ri = 0;
  for (let i = 0; i < system.maxParticles; i++) {
    const p = system.rainPts[i];
    if (i >= activeRain) { p.active = false; continue; }
    if (!p.active) resetRainParticle(p, system);
    p.life += dt;
    if (p.life > p.maxLife) resetRainParticle(p, system);
    p.position.addScaledVector(p.velocity, dt);
    const rp = system.rainGeo.attributes.position;
    rp.setXYZ(ri, origin.x + p.position.x, p.position.y, origin.z + p.position.z);
    system.rainGeo.attributes.size.setX(ri, 0.04 + system.hail * 0.2);
    ri++;
  }
  system.rainGeo.attributes.position.needsUpdate = true;
  system.rainGeo.attributes.size.needsUpdate = true;
  system.rainMesh.visible = activeRain > 0;

  // Snow
  let si = 0;
  for (let i = 0; i < system.maxParticles; i++) {
    const p = system.snowPts[i];
    if (i >= activeSnow) { p.active = false; continue; }
    if (!p.active) resetSnowParticle(p, system);
    p.life += dt;
    if (p.life > p.maxLife) resetSnowParticle(p, system);
    // Drift
    p.velocity.x += Math.sin(p.life * 2) * 0.01;
    p.position.addScaledVector(p.velocity, dt);
    const sp = system.snowGeo.attributes.position;
    sp.setXYZ(si, origin.x + p.position.x, p.position.y, origin.z + p.position.z);
    system.snowGeo.attributes.size.setX(si, 0.08 + Math.random()*0.06);
    si++;
  }
  system.snowGeo.attributes.position.needsUpdate = true;
  system.snowGeo.attributes.size.needsUpdate = true;
  system.snowMesh.visible = activeSnow > 0;

  // Fog
  if (system.fog > 0) {
    system.scene.fog = new THREE.FogExp2(0xaabbcc, system.fog * 0.04);
  } else {
    system.scene.fog = null;
  }

  // Lightning
  if (system.lightning > 0) {
    lightningTimer += dt;
    const interval = 3 - system.lightning * 2.5;
    if (lightningTimer > interval) {
      lightningTimer = 0;
      triggerLightning(system);
    }
  }
}

function triggerLightning(system) {
  const flash = new THREE.PointLight(0xffffff, 8, 200);
  flash.position.set(
    (Math.random()-0.5)*30, 15 + Math.random()*10, (Math.random()-0.5)*30
  );
  system.scene.add(flash);
  setTimeout(() => { flash.intensity = 0; }, 80);
  setTimeout(() => { flash.intensity = 5; }, 120);
  setTimeout(() => { system.scene.remove(flash); flash.dispose(); }, 300);
}

// ── Apply preset ──────────────────────────────────────────────────────────────
export function applyWeatherPreset(system, presetName) {
  const p = WEATHER_PRESETS[presetName];
  if (!p) return;
  Object.assign(system, p);
  system.enabled = Object.values(p).some(v => v > 0);
}

// ── Dispose ───────────────────────────────────────────────────────────────────
export function disposeWeather(system) {
  system.scene.remove(system.rainMesh);
  system.scene.remove(system.snowMesh);
  system.rainGeo.dispose(); system.snowGeo.dispose();
  system.rainMat.dispose(); system.snowMat.dispose();
  system.scene.fog = null;
}
