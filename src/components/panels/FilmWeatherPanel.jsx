import React, { useEffect, useRef, useState, useCallback } from "react";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}
        </span>
      </div>
      <input
        className="spx-slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function FilmWeatherPanel({ open, onClose, sceneRef, rendererRef, setStatus }) {
  const weatherGroupRef = useRef(null);
  const animRef = useRef(0);

  const [weatherType, setWeatherType] = useState("fog");
  const [intensity, setIntensity] = useState(0.5);
  const [windStrength, setWindStrength] = useState(0.2);
  const [density, setDensity] = useState(0.4);
  const [speed, setSpeed] = useState(0.02);
  const [flashStrength, setFlashStrength] = useState(0.0);
  const [tint, setTint] = useState("#bfc7d5");

  const clearWeather = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const scene = sceneRef?.current;
    if (scene && weatherGroupRef.current) {
      scene.remove(weatherGroupRef.current);
      weatherGroupRef.current.traverse((obj) => {
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      });
      weatherGroupRef.current = null;
    }
    if (scene?.fog) scene.fog = null;
    if (rendererRef?.current) rendererRef.current.setClearColor?.(0x111111, 1);
  }, [sceneRef, rendererRef]);

  const buildWeather = useCallback(() => {
    const scene = sceneRef?.current;
    if (!scene || !window.THREE) return;

    clearWeather();

    const THREE = window.THREE;
    const group = new THREE.Group();
    group.name = "__FILM_WEATHER__";

    if (weatherType === "fog" || weatherType === "storm") {
      const fogColor = new THREE.Color(tint);
      scene.fog = new THREE.FogExp2(fogColor, Math.max(0.002, density * 0.03));
    }

    if (weatherType === "rain" || weatherType === "snow" || weatherType === "storm") {
      const count = Math.floor(800 + intensity * 5000);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * 30;
        pos[i * 3 + 1] = Math.random() * 20;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }

      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        color: weatherType === "snow" ? "#f4f8ff" : "#9ecbff",
        size: weatherType === "snow" ? 0.09 : 0.035,
        transparent: true,
        opacity: 0.65 + intensity * 0.25,
        depthWrite: false
      });

      const points = new THREE.Points(geo, mat);
      points.userData.weatherType = weatherType;
      group.add(points);
    }

    if (weatherType === "dust") {
      const count = Math.floor(500 + intensity * 2500);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * 28;
        pos[i * 3 + 1] = Math.random() * 12;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
      }

      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        color: tint,
        size: 0.06,
        transparent: true,
        opacity: 0.28 + intensity * 0.35,
        depthWrite: false
      });

      group.add(new THREE.Points(geo, mat));
    }

    scene.add(group);
    weatherGroupRef.current = group;

    const tick = () => {
      if (!weatherGroupRef.current) return;

      weatherGroupRef.current.children.forEach((points) => {
        const arr = points.geometry?.attributes?.position?.array;
        if (!arr) return;

        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 0] += (weatherType === "rain" || weatherType === "storm" ? windStrength * 0.02 : windStrength * 0.006);
          arr[i + 1] -= (weatherType === "snow" ? speed * 0.6 : speed * 2.0);
          arr[i + 2] += Math.sin((i + performance.now() * 0.001) * 0.01) * windStrength * 0.01;

          if (arr[i + 1] < -2) {
            arr[i + 1] = 20;
          }
          if (arr[i + 0] > 16) arr[i + 0] = -16;
          if (arr[i + 0] < -16) arr[i + 0] = 16;
        }

        points.geometry.attributes.position.needsUpdate = true;
      });

      if (weatherType === "storm" && rendererRef?.current) {
        const base = 0x0f1116;
        const lightning = Math.random() < flashStrength * 0.03 ? 0x8fa7c8 : base;
        rendererRef.current.setClearColor?.(lightning, 1);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    setStatus?.(`Weather applied: ${weatherType}`);
  }, [sceneRef, rendererRef, clearWeather, weatherType, intensity, windStrength, density, speed, flashStrength, tint, setStatus]);

  useEffect(() => {
    if (!open) return;
    buildWeather();
    return () => clearWeather();
  }, [open, buildWeather, clearWeather]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 38 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">FILM WEATHER</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>WEATHER TYPE</span>
            <span className="spx-slider-header__val">{weatherType}</span>
          </div>
          <select className="spx-slider-input" value={weatherType} onChange={(e) => setWeatherType(e.target.value)}>
            <option value="fog">fog</option>
            <option value="rain">rain</option>
            <option value="snow">snow</option>
            <option value="dust">dust</option>
            <option value="storm">storm</option>
          </select>
        </div>

        <Slider label="INTENSITY" value={intensity} min={0} max={1} step={0.01} onChange={setIntensity} />
        <Slider label="WIND" value={windStrength} min={0} max={1} step={0.01} onChange={setWindStrength} />
        <Slider label="DENSITY" value={density} min={0} max={1} step={0.01} onChange={setDensity} />
        <Slider label="SPEED" value={speed} min={0.001} max={0.1} step={0.001} onChange={setSpeed} />
        <Slider label="LIGHTNING FLASH" value={flashStrength} min={0} max={1} step={0.01} onChange={setFlashStrength} />

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>TINT</span>
            <span className="spx-slider-header__val">{tint}</span>
          </div>
          <input className="spx-slider-input" type="color" value={tint} onChange={(e) => setTint(e.target.value)} />
        </div>

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={buildWeather}>APPLY</button>
          <button className="fcam-chip" onClick={clearWeather}>CLEAR</button>
        </div>
      </div>
    </div>
  );
}
