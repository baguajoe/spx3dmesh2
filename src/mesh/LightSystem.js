import * as THREE from "three";

// ── Light types ───────────────────────────────────────────────────────────────
export const LIGHT_TYPES = {
  point:       { label: "Point",       icon: "💡" },
  spot:        { label: "Spot",        icon: "🔦" },
  directional: { label: "Directional", icon: "☀️" },
  area:        { label: "Area",        icon: "⬛" },
  ambient:     { label: "Ambient",     icon: "🌫" },
  hemisphere:  { label: "Hemisphere",  icon: "🌐" },
};

// ── Color temperature presets (Kelvin → RGB) ──────────────────────────────────
export const TEMPERATURE_PRESETS = {
  candle:      { kelvin: 1850,  color: "#ff9329", label: "Candle" },
  tungsten:    { kelvin: 2700,  color: "#ffa95c", label: "Tungsten" },
  halogen:     { kelvin: 3200,  color: "#ffc58f", label: "Halogen" },
  fluorescent: { kelvin: 4000,  color: "#ffd6b0", label: "Fluorescent" },
  daylight:    { kelvin: 5500,  color: "#fff4e8", label: "Daylight" },
  overcast:    { kelvin: 6500,  color: "#dce8ff", label: "Overcast" },
  blue_sky:    { kelvin: 10000, color: "#b3c9ff", label: "Blue Sky" },
};

// ── Create light ──────────────────────────────────────────────────────────────
export function createLight(type = "point", options = {}) {
  const {
    color     = "#ffffff",
    intensity = 1.0,
    distance  = 0,
    angle     = Math.PI / 4,
    penumbra  = 0.1,
    decay     = 2,
    castShadow = true,
  } = options;

  let light;
  switch (type) {
    case "spot":
      light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
      light.castShadow = castShadow;
      light.shadow.mapSize.width  = 1024;
      light.shadow.mapSize.height = 1024;
      break;
    case "directional":
      light = new THREE.DirectionalLight(color, intensity);
      light.castShadow = castShadow;
      light.shadow.mapSize.width  = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near    = 0.1;
      light.shadow.camera.far     = 50;
      light.shadow.camera.left    = -10;
      light.shadow.camera.right   = 10;
      light.shadow.camera.top     = 10;
      light.shadow.camera.bottom  = -10;
      break;
    case "area":
      light = new THREE.RectAreaLight(color, intensity, options.width || 2, options.height || 2);
      break;
    case "ambient":
      light = new THREE.AmbientLight(color, intensity);
      break;
    case "hemisphere":
      light = new THREE.HemisphereLight(color, options.groundColor || "#444444", intensity);
      break;
    default: // point
      light = new THREE.PointLight(color, intensity, distance, decay);
      light.castShadow = castShadow;
      light.shadow.mapSize.width  = 512;
      light.shadow.mapSize.height = 512;
      break;
  }

  light.userData.lightType = type;
  light.userData.lightId   = crypto.randomUUID();
  light.name = type + "_light_" + Date.now();
  return light;
}

// ── Three-point lighting preset ───────────────────────────────────────────────
export function createThreePointLighting(scene, intensity = 1.0) {
  const lights = [];

  // Key light
  const key = createLight("spot", { color: "#fff4e8", intensity: intensity * 2 });
  key.position.set(5, 8, 5);
  key.name = "Key_Light";
  scene.add(key);
  lights.push(key);

  // Fill light
  const fill = createLight("point", { color: "#dce8ff", intensity: intensity * 0.5 });
  fill.position.set(-5, 4, 3);
  fill.name = "Fill_Light";
  scene.add(fill);
  lights.push(fill);

  // Rim/back light
  const rim = createLight("spot", { color: "#ffa95c", intensity: intensity * 1.5 });
  rim.position.set(0, 6, -8);
  rim.name = "Rim_Light";
  scene.add(rim);
  lights.push(rim);

  return lights;
}

// ── Apply color temperature ───────────────────────────────────────────────────
export function applyTemperature(light, kelvin) {
  const preset = Object.values(TEMPERATURE_PRESETS)
    .reduce((closest, p) => Math.abs(p.kelvin - kelvin) < Math.abs(closest.kelvin - kelvin) ? p : closest);
  light.color.set(preset.color);
  return preset;
}

// ── Volumetric fog ────────────────────────────────────────────────────────────
export function createVolumericFog(scene, { color = "#aabbcc", density = 0.02, near = 1, far = 100, type = "exp2" } = {}) {
  if (type === "linear") {
    scene.fog = new THREE.Fog(color, near, far);
  } else {
    scene.fog = new THREE.FogExp2(color, density);
  }
  return scene.fog;
}

// ── Remove fog ────────────────────────────────────────────────────────────────
export function removeFog(scene) {
  scene.fog = null;
}

// ── HDRI environment ──────────────────────────────────────────────────────────
export const HDRI_PRESETS = [
  { id: "studio",    label: "Studio",    color: "#cccccc", ambientColor: "#888888" },
  { id: "outdoor",   label: "Outdoor",   color: "#87ceeb", ambientColor: "#6699cc" },
  { id: "sunset",    label: "Sunset",    color: "#ff6633", ambientColor: "#cc4400" },
  { id: "night",     label: "Night",     color: "#112244", ambientColor: "#001122" },
  { id: "overcast",  label: "Overcast",  color: "#aaaaaa", ambientColor: "#777777" },
  { id: "warehouse", label: "Warehouse", color: "#ddcc99", ambientColor: "#886644" },
  { id: "forest",    label: "Forest",    color: "#448844", ambientColor: "#224422" },
  { id: "arctic",    label: "Arctic",    color: "#ddeeff", ambientColor: "#aaccee" },
  { id: "desert",    label: "Desert",    color: "#ddaa44", ambientColor: "#aa7722" },
  { id: "city",      label: "City",      color: "#334455", ambientColor: "#112233" },
];

export function applyHDRI(scene, presetId) {
  const preset = HDRI_PRESETS.find(p => p.id === presetId) || HDRI_PRESETS[0];
  scene.background = new THREE.Color(preset.color);
  // Update ambient light if present
  scene.traverse(obj => {
    if (obj.isAmbientLight) {
      obj.color.set(preset.ambientColor);
    }
  });
  return preset;
}

// ── Light helper ──────────────────────────────────────────────────────────────
export function addLightHelper(scene, light) {
  let helper;
  if (light.isSpotLight)        helper = new THREE.SpotLightHelper(light);
  else if (light.isDirectionalLight) helper = new THREE.DirectionalLightHelper(light, 1);
  else if (light.isPointLight)  helper = new THREE.PointLightHelper(light, 0.3);
  if (helper) { scene.add(helper); light.userData.helperId = helper.uuid; }
  return helper;
}

// ── Get all lights in scene ───────────────────────────────────────────────────
export function getSceneLights(scene) {
  const lights = [];
  scene.traverse(obj => { if (obj.isLight) lights.push(obj); });
  return lights;
}

// ── Serialize lights ──────────────────────────────────────────────────────────
export function serializeLights(lights) {
  return lights.map(l => ({
    id:        l.userData.lightId,
    type:      l.userData.lightType,
    name:      l.name,
    color:     "#" + l.color.getHexString(),
    intensity: l.intensity,
    position:  l.position.toArray(),
    castShadow: l.castShadow,
  }));
}
