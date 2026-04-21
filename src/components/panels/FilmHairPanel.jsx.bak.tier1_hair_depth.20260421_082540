import React, { useEffect, useState, useCallback } from "react";

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

export default function FilmHairPanel({ open, onClose, meshRef, setStatus }) {
  const [preset, setPreset] = useState("natural_black");
  const [color, setColor] = useState("#1f1a17");
  const [roughness, setRoughness] = useState(0.55);
  const [metalness, setMetalness] = useState(0.0);
  const [specularIntensity, setSpecularIntensity] = useState(0.55);
  const [melanin, setMelanin] = useState(0.85);
  const [frizz, setFrizz] = useState(0.15);
  const [clump, setClump] = useState(0.45);
  const [wetness, setWetness] = useState(0.0);
  const [strandScale, setStrandScale] = useState(1.0);
  const [curlTightness, setCurlTightness] = useState(0.35);
  const [density, setDensity] = useState(0.7);
  const [flyaways, setFlyaways] = useState(0.12);
  const [fadeAmount, setFadeAmount] = useState(0.0);
  const [styleType, setStyleType] = useState("straight");

  const presetMap = {
    natural_black: {
      color: "#1f1a17", roughness: 0.55, specularIntensity: 0.55, melanin: 0.85, frizz: 0.15, clump: 0.45, wetness: 0.0
    },
    dark_brown: {
      color: "#3a281f", roughness: 0.58, specularIntensity: 0.5, melanin: 0.72, frizz: 0.18, clump: 0.42, wetness: 0.0
    },
    light_brown: {
      color: "#6a4a2f", roughness: 0.6, specularIntensity: 0.46, melanin: 0.5, frizz: 0.2, clump: 0.4, wetness: 0.0
    },
    blonde: {
      color: "#caa46a", roughness: 0.64, specularIntensity: 0.42, melanin: 0.2, frizz: 0.22, clump: 0.38, wetness: 0.0
    },
    anime_hair: {
      color: "#2c325f", roughness: 0.72, specularIntensity: 0.32, melanin: 0.1, frizz: 0.05, clump: 0.7, wetness: 0.0
    },
    wet_hair: {
      color: "#181614", roughness: 0.22, specularIntensity: 0.9, melanin: 0.9, frizz: 0.05, clump: 0.7, wetness: 0.8
    },
    afro: {
      color: "#1a1715", roughness: 0.72, specularIntensity: 0.32, melanin: 0.95, frizz: 0.48, clump: 0.28, wetness: 0.0
    },
    curls: {
      color: "#2b1f19", roughness: 0.62, specularIntensity: 0.42, melanin: 0.82, frizz: 0.22, clump: 0.54, wetness: 0.0
    },
    braids: {
      color: "#241a16", roughness: 0.58, specularIntensity: 0.46, melanin: 0.88, frizz: 0.08, clump: 0.82, wetness: 0.0
    },
    locs: {
      color: "#201814", roughness: 0.63, specularIntensity: 0.4, melanin: 0.9, frizz: 0.1, clump: 0.86, wetness: 0.0
    },
    fade: {
      color: "#181412", roughness: 0.68, specularIntensity: 0.28, melanin: 0.92, frizz: 0.04, clump: 0.18, wetness: 0.0
    }
  };

  const loadPreset = useCallback((name) => {
    const p = presetMap[name];
    if (!p) return;
    setPreset(name);
    setColor(p.color);
    setRoughness(p.roughness);
    setSpecularIntensity(p.specularIntensity);
    setMelanin(p.melanin);
    setFrizz(p.frizz);
    setClump(p.clump);
    setWetness(p.wetness);

    if (name === "afro") {
      setStyleType("afro");
      setCurlTightness(0.92);
      setDensity(0.9);
      setFlyaways(0.18);
      setFadeAmount(0.0);
    } else if (name === "curls") {
      setStyleType("curly");
      setCurlTightness(0.78);
      setDensity(0.82);
      setFlyaways(0.14);
      setFadeAmount(0.0);
    } else if (name === "braids") {
      setStyleType("braids");
      setCurlTightness(0.18);
      setDensity(0.76);
      setFlyaways(0.05);
      setFadeAmount(0.0);
    } else if (name === "locs") {
      setStyleType("locs");
      setCurlTightness(0.22);
      setDensity(0.8);
      setFlyaways(0.06);
      setFadeAmount(0.0);
    } else if (name === "fade") {
      setStyleType("fade");
      setCurlTightness(0.08);
      setDensity(0.35);
      setFlyaways(0.02);
      setFadeAmount(0.88);
    } else if (name === "anime_hair") {
      setStyleType("straight");
      setCurlTightness(0.05);
      setDensity(0.72);
      setFlyaways(0.02);
      setFadeAmount(0.0);
    } else {
      setStyleType("straight");
      setCurlTightness(0.35);
      setDensity(0.7);
      setFlyaways(0.12);
      setFadeAmount(0.0);
    }
  }, []);

  const applyToMesh = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;

    const sheen = Math.max(0, Math.min(1, 0.35 + wetness * 0.45 - roughness * 0.12));
    const envMapIntensity = Math.max(0.2, Math.min(1.4, 0.45 + wetness * 0.5 + specularIntensity * 0.25));
    const finalRoughness = Math.max(0.04, Math.min(1, roughness - wetness * 0.28 + frizz * 0.05));
    const clearcoat = Math.max(0, Math.min(1, wetness * 0.75));

    const mat = new window.THREE.MeshPhysicalMaterial({
      color,
      roughness: finalRoughness,
      metalness,
      envMapIntensity,
      clearcoat,
      sheen
    });

    mat.specularIntensity = specularIntensity;
    mat.userData.isFilmHair = true;
    mat.userData.hairPreset = preset;
    mat.userData.melanin = melanin;
    mat.userData.frizz = frizz;
    mat.userData.clump = clump;
    mat.userData.wetness = wetness;
    mat.userData.strandScale = strandScale;
    mat.userData.curlTightness = curlTightness;
    mat.userData.density = density;
    mat.userData.flyaways = flyaways;
    mat.userData.fadeAmount = fadeAmount;
    mat.userData.styleType = styleType;

    mesh.material = mat;

    if (mesh.scale) {
      const sx = Math.max(0.85, Math.min(1.18, 0.92 + density * 0.22));
      const sy = Math.max(0.85, Math.min(1.18, 0.92 + density * 0.22));
      const sz = Math.max(0.8, Math.min(1.25, strandScale + clump * 0.08 - fadeAmount * 0.12));
      mesh.scale.set(sx, sy, sz);
    }

    if (mesh.position && styleType === "fade") {
      mesh.position.y = Math.max(0, mesh.position.y - fadeAmount * 0.02);
    }

    setStatus?.(`Film hair applied: ${preset} · ${styleType}`);
  }, [meshRef, setStatus, preset, color, roughness, metalness, specularIntensity, melanin, frizz, clump, wetness, strandScale, curlTightness, density, flyaways, fadeAmount, styleType]);

  useEffect(() => {
    if (!open) return;
    applyToMesh();
  }, [open, applyToMesh]);

  useEffect(() => {
    if (!open) return;
    applyToMesh();
  }, [color, roughness, metalness, specularIntensity, melanin, frizz, clump, wetness, strandScale, preset, open, applyToMesh]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 36 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">FILM HAIR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips" style={{ marginBottom: 12 }}>
          {[
            ["natural_black", "BLACK"],
            ["dark_brown", "DARK"],
            ["light_brown", "LIGHT"],
            ["blonde", "BLONDE"],
            ["anime_hair", "ANIME"],
            ["wet_hair", "WET"],
            ["afro", "AFRO"],
            ["curls", "CURLS"],
            ["braids", "BRAIDS"],
            ["locs", "LOCS"],
            ["fade", "FADE"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={`fcam-chip${preset === id ? " fcam-chip--active-gold" : ""}`}
              onClick={() => loadPreset(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>HAIR COLOR</span>
            <span className="spx-slider-header__val">{color}</span>
          </div>
          <input
            className="spx-slider-input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <Slider label="ROUGHNESS" value={roughness} min={0.02} max={1} step={0.01} onChange={setRoughness} />
        <Slider label="SPECULAR" value={specularIntensity} min={0} max={1} step={0.01} onChange={setSpecularIntensity} />
        <Slider label="MELANIN" value={melanin} min={0} max={1} step={0.01} onChange={setMelanin} />
        <Slider label="FRIZZ" value={frizz} min={0} max={1} step={0.01} onChange={setFrizz} />
        <Slider label="CLUMP" value={clump} min={0} max={1} step={0.01} onChange={setClump} />
        <Slider label="WETNESS" value={wetness} min={0} max={1} step={0.01} onChange={setWetness} />
        <Slider label="STRAND SCALE" value={strandScale} min={0.85} max={1.2} step={0.01} onChange={setStrandScale} />


        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>STYLE TYPE</span>
            <span className="spx-slider-header__val">{styleType}</span>
          </div>
          <select className="spx-slider-input" value={styleType} onChange={(e)=>setStyleType(e.target.value)}>
            <option value="straight">straight</option>
            <option value="curly">curly</option>
            <option value="afro">afro</option>
            <option value="braids">braids</option>
            <option value="locs">locs</option>
            <option value="fade">fade</option>
          </select>
        </div>

        <Slider label="CURL TIGHTNESS" value={curlTightness} min={0} max={1} step={0.01} onChange={setCurlTightness} />
        <Slider label="DENSITY" value={density} min={0.1} max={1} step={0.01} onChange={setDensity} />
        <Slider label="FLYAWAYS" value={flyaways} min={0} max={1} step={0.01} onChange={setFlyaways} />
        <Slider label="FADE AMOUNT" value={fadeAmount} min={0} max={1} step={0.01} onChange={setFadeAmount} />

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyToMesh}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
