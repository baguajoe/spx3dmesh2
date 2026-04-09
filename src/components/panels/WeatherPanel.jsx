import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createWeatherSystem, stepWeather, applyWeatherPreset, disposeWeather, WEATHER_PRESETS } from '../../mesh/WeatherSystem.js';
import '../../styles/panel-components.css';
import '../../styles/fx-panels.css';

function ValueKnob({ label, value, min, max, step=0.01, onChange, unit='' }) {
  const pct = Math.min(1, Math.max(0, (value-min)/(max-min)));
  const gradient = `conic-gradient(#00ffc8 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`;

  const handleMouseDown = e => {
    const startY=e.clientY, startV=value;
    const move = ev => {
      const delta=(startY-ev.clientY)/100*(max-min);
      onChange(Math.min(max, Math.max(min, Math.round((startV+delta)/step)*step)));
    };
    const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',move);
    document.addEventListener('mouseup',up);
  };

  return (
    <div className="fx-knob-wrap fx-knob-wrap--lg">
      <div className="fx-knob-ring" style={{background:gradient}} onMouseDown={handleMouseDown}>
        <div className="fx-knob-inner">
          <span className="fx-knob-val" style={{color:'#00ffc8'}}>
            {step<0.1?value.toFixed(2):Math.round(value)}{unit}
          </span>
        </div>
      </div>
      <span className="fx-knob-label">{label}</span>
    </div>
  );
}

const PRESET_META = {
  clear:        { icon:'☀️',  label:'Clear',       color:'#ffdd44' },
  drizzle:      { icon:'🌦',  label:'Drizzle',     color:'#88ccff' },
  lightRain:    { icon:'🌧',  label:'Light Rain',  color:'#88aaff' },
  heavyRain:    { icon:'🌊',  label:'Heavy Rain',  color:'#4466ff' },
  thunderstorm: { icon:'⚡',  label:'Thunderstorm',color:'#ff88ff' },
  lightSnow:    { icon:'❄️',  label:'Light Snow',  color:'#cceeff' },
  blizzard:     { icon:'🌨',  label:'Blizzard',    color:'#aaddff' },
  hailstorm:    { icon:'🧊',  label:'Hail',        color:'#88ffcc' },
  fog:          { icon:'🌫',  label:'Fog',         color:'#aaaaaa' },
  sandstorm:    { icon:'🌪',  label:'Sandstorm',   color:'#cc8844' },
};

export default function WeatherPanel({ sceneRef, cameraRef, open=true, onClose }) {
  const [activePreset, setActivePreset] = useState(null);
  const [running,      setRunning]      = useState(false);
  const [rain,         setRain]         = useState(0);
  const [snow,         setSnow]         = useState(0);
  const [fog,          setFog]          = useState(0);
  const [wind,         setWind]         = useState(0.1);
  const [lightning,    setLightning]    = useState(0);
  const [hail,         setHail]         = useState(0);
  const [particles,    setParticles]    = useState(6000);
  const [stats,        setStats]        = useState('');

  const systemRef = useRef(null);
  const rafRef    = useRef(null);

  const initSystem = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    if (systemRef.current) disposeWeather(systemRef.current);
    systemRef.current = createWeatherSystem(scene, { maxParticles:particles, spread:50, height:25 });
    Object.assign(systemRef.current, { rain, snow, fog, wind, lightning, hail });
    systemRef.current.enabled = true;
  }, [sceneRef, particles, rain, snow, fog, wind, lightning, hail]);

  const startSim = useCallback(() => {
    initSystem(); setRunning(true);
    let frame = 0;
    const tick = () => {
      if (!systemRef.current) return;
      Object.assign(systemRef.current, { rain, snow, fog, wind, lightning, hail });
      stepWeather(systemRef.current, 1/60, cameraRef?.current);
      frame++;
      if (frame%30===0) {
        const r=Math.round(rain*systemRef.current.maxParticles);
        const s=Math.round(snow*systemRef.current.maxParticles);
        setStats(`${r+s} particles active`);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [initSystem, rain, snow, fog, wind, lightning, hail, cameraRef]);

  const stopSim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRunning(false); setStats('');
  }, []);

  const clearWeather = useCallback(() => {
    stopSim();
    if (systemRef.current) disposeWeather(systemRef.current);
    systemRef.current = null; setActivePreset(null);
  }, [stopSim]);

  const loadPreset = useCallback((name) => {
    const p = WEATHER_PRESETS[name]; if (!p) return;
    setRain(p.rain); setSnow(p.snow); setFog(p.fog);
    setWind(p.wind); setLightning(p.lightning); setHail(p.hail);
    setActivePreset(name);
  }, []);

  useEffect(() => () => { stopSim(); if(systemRef.current) disposeWeather(systemRef.current); }, []);
  if (!open) return null;

  const PARTICLE_OPTIONS = [2000, 4000, 6000, 10000, 16000];

  return (
    <div className="fx-panel fx-panel--weather">
      <div className="fx-header">
        <div className="fx-header__dot fx-header__dot--weather"/>
        <span className="fx-header__title fx-header__title--weather">WEATHER SYSTEM</span>
        <div className="fx-header__right">
          {stats && <span className="fx-header__stats">{stats}</span>}
          {onClose && <button className="fx-header__close" onClick={onClose}>×</button>}
        </div>
      </div>

      <div className="fx-body">
        <div className="fx-mb14">
          <div className="fx-sec-label">PRESETS</div>
          <div className="fx-preset-grid fx-preset-grid--5">
            {Object.entries(PRESET_META).map(([key, meta]) => (
              <div
                key={key}
                className="fx-weather-preset"
                style={{
                  borderColor: activePreset===key ? meta.color : undefined,
                  background:  activePreset===key ? `${meta.color}15` : undefined,
                }}
                onClick={() => loadPreset(key)}
                onMouseEnter={e => { e.currentTarget.style.borderColor=meta.color; e.currentTarget.style.background=`${meta.color}10`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=activePreset===key?meta.color:''; e.currentTarget.style.background=activePreset===key?`${meta.color}15`:''; }}
              >
                <div className="fx-weather-preset__icon">{meta.icon}</div>
                <div className="fx-weather-preset__label" style={{color:activePreset===key?meta.color:undefined}}>{meta.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fx-mb14">
          <div className="fx-sec-label fx-mb10">PARAMETERS</div>
          <div className="fx-knob-row">
            <ValueKnob label="Rain"      value={rain}      min={0} max={1} step={0.01} onChange={setRain}/>
            <ValueKnob label="Snow"      value={snow}      min={0} max={1} step={0.01} onChange={setSnow}/>
            <ValueKnob label="Fog"       value={fog}       min={0} max={1} step={0.01} onChange={setFog}/>
            <ValueKnob label="Wind"      value={wind}      min={0} max={2} step={0.05} onChange={setWind}/>
            <ValueKnob label="Lightning" value={lightning} min={0} max={1} step={0.01} onChange={setLightning}/>
            <ValueKnob label="Hail"      value={hail}      min={0} max={1} step={0.01} onChange={setHail}/>
          </div>
        </div>

        <div className="fx-parts-bar fx-mb14">
          <div className="fx-parts-bar__hdr">
            <span className="fx-parts-bar__label">MAX PARTICLES</span>
            <span className="fx-parts-bar__val">{particles.toLocaleString()}</span>
          </div>
          <div className="fx-parts-chips">
            {PARTICLE_OPTIONS.map(n => (
              <button key={n} className={`fx-parts-chip${particles===n?' fx-parts-chip--active':''}`} onClick={()=>setParticles(n)}>
                {n>=1000?`${n/1000}K`:n}
              </button>
            ))}
          </div>
        </div>

        <div className="fx-ctrl-grid fx-ctrl-grid--3">
          {!running
            ? <button className="fx-btn fx-btn--play-wt" onClick={startSim}>▶ START</button>
            : <button className="fx-btn fx-btn--stop"    onClick={stopSim}>■ STOP</button>
          }
          <button className="fx-btn fx-btn--muted" onClick={initSystem}>↺ RESET</button>
          <button className="fx-btn fx-btn--muted" onClick={clearWeather}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
