import { useState, useRef } from "react";

export function MaterialEditor({ material={}, onChange=()=>{}, onClose=()=>{} }) {
  const [tab,    setTab]    = useState("surface");
  const [texUrl, setTexUrl] = useState(material.map || null);
  const fileRef = useRef(null);

  const Field = ({ label, type="range", min=0, max=1, step=0.01, value, prop, children }) => (
    <div className="me-field">
      <span className="me-field__label">{label}</span>
      {type === "range" ? <>
        <input type="range" min={min} max={max} step={step} value={value ?? 0}
          className="me-field__slider"
          onChange={e => onChange({ ...material, [prop]: Number(e.target.value) })} />
        <span className="me-field__value">{Number(value ?? 0).toFixed(2)}</span>
      </> : children}
    </div>
  );

  return (
    <div className="me-root">
      <div className="me-header">
        <span className="me-header__title">Material Editor</span>
        <div className="me-header__spacer" />
        <button className="me-header__close" onClick={onClose}>✕</button>
      </div>

      <div className="me-tabs">
        {["surface","emission","texture","advanced"].map(t => (
          <button key={t}
            className={`me-tab${tab===t?" me-tab--active":""}`}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="me-body">
        {tab === "surface" && <>
          <div className="me-field">
            <span className="me-field__label">Color</span>
            <input type="color" className="me-color" value={material.color || "#888888"}
              onChange={e => onChange({ ...material, color: e.target.value })} />
            <span className="me-field__value">{material.color || "#888888"}</span>
          </div>
          <Field label="Roughness"  prop="roughness"  value={material.roughness  ?? 0.5} />
          <Field label="Metalness"  prop="metalness"  value={material.metalness  ?? 0.0} />
          <Field label="Opacity"    prop="opacity"    value={material.opacity    ?? 1.0} />
          <div className="me-field">
            <span className="me-field__label">Wireframe</span>
            <input type="checkbox" checked={material.wireframe || false}
              onChange={e => onChange({ ...material, wireframe: e.target.checked })} />
          </div>
          <div className="me-field">
            <span className="me-field__label">Transparent</span>
            <input type="checkbox" checked={material.transparent || false}
              onChange={e => onChange({ ...material, transparent: e.target.checked })} />
          </div>
          <div className="me-field">
            <span className="me-field__label">Side</span>
            <select className="me-select" value={material.side || "front"}
              onChange={e => onChange({ ...material, side: e.target.value })}>
              {["front","back","double"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </>}

        {tab === "emission" && <>
          <div className="me-field">
            <span className="me-field__label">Emissive</span>
            <input type="color" className="me-color" value={material.emissive || "#000000"}
              onChange={e => onChange({ ...material, emissive: e.target.value })} />
          </div>
          <Field label="Intensity" prop="emissiveIntensity"
            min={0} max={5} step={0.1} value={material.emissiveIntensity ?? 0} />
          <p className="me-hint">High emissive intensity makes the object glow regardless of lighting. Combine with bloom post-FX for best results.</p>
        </>}

        {tab === "texture" && <>
          <div className="me-field__label">Diffuse Texture Map</div>
          <input ref={fileRef} type="file" accept="image/*" className="spx-hidden"
            onChange={e => {
              const file = e.target.files?.[0]; if (!file) return;
              const url = URL.createObjectURL(file);
              setTexUrl(url);
              onChange({ ...material, mapUrl: url, mapFile: file.name });
            }} />
          {texUrl ? (
            <div className="me-tex-preview">
              <img src={texUrl} alt="texture" className="me-tex-img" />
              <div className="me-btn-row">
                <button className="me-btn" onClick={() => fileRef.current?.click()}>Replace</button>
                <button className="me-btn me-btn--danger" onClick={() => { setTexUrl(null); onChange({ ...material, mapUrl: null }); }}>Remove</button>
              </div>
            </div>
          ) : (
            <button className="me-upload-btn" onClick={() => fileRef.current?.click()}>
              📁 Upload Texture Image
            </button>
          )}
          <Field label="Repeat X" prop="repeatX" min={0.1} max={10} step={0.1} value={material.repeatX ?? 1} />
          <Field label="Repeat Y" prop="repeatY" min={0.1} max={10} step={0.1} value={material.repeatY ?? 1} />
        </>}

        {tab === "advanced" && <>
          <Field label="Env Map"    prop="envMapIntensity"    min={0} max={2} step={0.05} value={material.envMapIntensity    ?? 1} />
          <Field label="AO Inten."  prop="aoMapIntensity"     min={0} max={2} step={0.05} value={material.aoMapIntensity     ?? 1} />
          <Field label="Bump Scale" prop="bumpScale"          min={0} max={1} step={0.01} value={material.bumpScale          ?? 1} />
          <Field label="Displace"   prop="displacementScale"  min={0} max={2} step={0.05} value={material.displacementScale  ?? 1} />
          <p className="me-hint">Advanced maps require uploaded normal/AO/displacement textures in the Texture tab.</p>
        </>}
      </div>

      <div className="me-footer">
        <button className="me-apply-btn" onClick={onClose}>✓ Apply</button>
      </div>
    </div>
  );
}
