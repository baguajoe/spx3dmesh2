import React, { useCallback, useEffect, useState } from "react";
import "../../styles/spx-tool-panels.css";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-tool-panel__row">
      <div className="spx-tool-panel__rowhead">
        <span>{label}</span>
        <span>{typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}</span>
      </div>
      <input
        className="spx-tool-panel__input"
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

export default function SkinDepthPanel({ meshRef, setStatus }) {
  const [epidermal, setEpidermal] = useState(0.22);
  const [dermal, setDermal] = useState(0.35);
  const [subdermal, setSubdermal] = useState(0.18);
  const [subsurface, setSubsurface] = useState(0.35);
  const [microDetail, setMicroDetail] = useState(0.25);
  const [poreStrength, setPoreStrength] = useState(0.2);
  const [wrinkleStrength, setWrinkleStrength] = useState(0.12);
  const [oilLayer, setOilLayer] = useState(0.18);
  const [sheenLayer, setSheenLayer] = useState(0.16);
  const [roughness, setRoughness] = useState(0.42);
  const [specular, setSpecular] = useState(0.45);
  const [clearcoat, setClearcoat] = useState(0.1);
  const [cheekRedness, setCheekRedness] = useState(0.1);
  const [noseOil, setNoseOil] = useState(0.2);
  const [lipSheen, setLipSheen] = useState(0.22);
  const [earTranslucency, setEarTranslucency] = useState(0.15);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh?.material) return;

    const payload = {
      epidermal,
      dermal,
      subdermal,
      subsurface,
      microDetail,
      poreStrength,
      wrinkleStrength,
      oilLayer,
      sheenLayer,
      roughness,
      specular,
      clearcoat,
      cheekRedness,
      noseOil,
      lipSheen,
      earTranslucency,
    };

    mesh.material.userData.skinDepth = payload;
    mesh.material.roughness = roughness;
    mesh.material.metalness = 0;
    mesh.material.needsUpdate = true;
    window.__SPX_SKIN_DEPTH__ = payload;

    setStatus?.("Skin depth controls updated");
  }, [
    meshRef, setStatus,
    epidermal, dermal, subdermal, subsurface,
    microDetail, poreStrength, wrinkleStrength,
    oilLayer, sheenLayer, roughness, specular,
    clearcoat, cheekRedness, noseOil, lipSheen,
    earTranslucency
  ]);

  useEffect(() => {
    apply();
  }, [apply]);

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__section">
        <div className="spx-tool-panel__heading">Scattering</div>
        <Slider label="EPIDERMAL" value={epidermal} min={0} max={1} onChange={setEpidermal} />
        <Slider label="DERMAL" value={dermal} min={0} max={1} onChange={setDermal} />
        <Slider label="SUBDERMAL" value={subdermal} min={0} max={1} onChange={setSubdermal} />
        <Slider label="SUBSURFACE" value={subsurface} min={0} max={1} onChange={setSubsurface} />
      </div>

      <div className="spx-tool-panel__section">
        <div className="spx-tool-panel__heading">Micro Surface</div>
        <Slider label="MICRO DETAIL" value={microDetail} min={0} max={1} onChange={setMicroDetail} />
        <Slider label="PORE STRENGTH" value={poreStrength} min={0} max={1} onChange={setPoreStrength} />
        <Slider label="WRINKLE STRENGTH" value={wrinkleStrength} min={0} max={1} onChange={setWrinkleStrength} />
      </div>

      <div className="spx-tool-panel__section">
        <div className="spx-tool-panel__heading">Specular / Oil</div>
        <Slider label="OIL LAYER" value={oilLayer} min={0} max={1} onChange={setOilLayer} />
        <Slider label="SHEEN LAYER" value={sheenLayer} min={0} max={1} onChange={setSheenLayer} />
        <Slider label="ROUGHNESS" value={roughness} min={0} max={1} onChange={setRoughness} />
        <Slider label="SPECULAR" value={specular} min={0} max={1} onChange={setSpecular} />
        <Slider label="CLEARCOAT" value={clearcoat} min={0} max={1} onChange={setClearcoat} />
      </div>

      <div className="spx-tool-panel__section">
        <div className="spx-tool-panel__heading">Facial Zones</div>
        <Slider label="CHEEK REDNESS" value={cheekRedness} min={0} max={1} onChange={setCheekRedness} />
        <Slider label="NOSE OIL" value={noseOil} min={0} max={1} onChange={setNoseOil} />
        <Slider label="LIP SHEEN" value={lipSheen} min={0} max={1} onChange={setLipSheen} />
        <Slider label="EAR TRANSLUCENCY" value={earTranslucency} min={0} max={1} onChange={setEarTranslucency} />
      </div>

      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={apply}>Apply</button>
      </div>
    </div>
  );
}
