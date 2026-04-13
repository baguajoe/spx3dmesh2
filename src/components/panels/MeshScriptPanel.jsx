import React, { useState, useRef, useEffect, useCallback } from 'react';
import SPXScriptRunner, { SCRIPT_EXAMPLES } from '../../mesh/SPXScriptAPI.js';
import '../../styles/mesh-script.css';

const BUILTIN_SCRIPTS = [
  { name: 'center_all',         label: 'Center All',        icon: '⊹' },
  { name: 'random_colors',      label: 'Random Colors',     icon: '🎨' },
  { name: 'apply_subdivision',  label: 'Subdivide All',     icon: '⬡' },
  { name: 'create_grid',        label: 'Create Grid',       icon: '⊞' },
];

const EXAMPLE_SCRIPTS = Object.entries(SCRIPT_EXAMPLES).map(([name, code]) => ({ name, code }));

export default function MeshScriptPanel({ open, onClose, sceneRef, rendererRef, setStatus }) {

  // ── Live 3D viewport mirror ──────────────────────────────────────────────
  const _vpRef    = useRef(null);
  const _vpMirror = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _vpRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _vpMirror.current = requestAnimationFrame(tick);
    };
    _vpMirror.current = requestAnimationFrame(tick);
    return () => { if (_vpMirror.current) cancelAnimationFrame(_vpMirror.current); };
  }, [open, rendererRef]);

  const _vpCanvas = (
    <div style={{display:'flex',flexDirection:'column',flex:'0 0 45%',minWidth:0,borderRight:'1px solid #21262d',overflow:'hidden',background:'#060a10'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0}}>3D SCENE — LIVE</div>
      <canvas ref={_vpRef} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
    </div>
  );

  const [code, setCode]         = useState(SCRIPT_EXAMPLES.hello);
  const [output, setOutput]     = useState([]);
  const [history, setHistory]   = useState([]);
  const [histIdx, setHistIdx]   = useState(-1);
  const [activeTab, setActiveTab] = useState('editor'); // editor | library | macros
  const [macros, setMacros]     = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordName, setRecordName] = useState('');
  const [savedScripts, setSavedScripts] = useState([]);
  const [scriptName, setScriptName] = useState('');
  const runnerRef = useRef(null);
  const outputRef = useRef(null);
  const editorRef = useRef(null);

  // Init runner
  useEffect(() => {
    if (!sceneRef?.current) return;
    runnerRef.current = new SPXScriptRunner(sceneRef.current, {
      callbacks: {
        onLog: (msg) => appendOutput('log', msg),
        onModifierAdded: (obj, type) => appendOutput('info', `Modifier ${type} added to ${obj.name}`),
        onPhysicsAdded: (obj) => appendOutput('info', `Physics added to ${obj.name}`),
        onRender: (opts) => appendOutput('info', `Render started: ${JSON.stringify(opts)}`),
      }
    });
    appendOutput('system', 'Mesh Script ready. Type help() for commands.');
  }, [sceneRef?.current]);

  const appendOutput = useCallback((type, msg) => {
    const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg ?? '');
    setOutput(prev => [...prev.slice(-199), { type, text, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => outputRef.current?.scrollTo(0, 999999), 10);
  }, []);

  const runCode = useCallback(() => {
    if (!runnerRef.current) { appendOutput('error', 'No scene loaded'); return; }
    if (!code.trim()) return;
    appendOutput('input', code.trim());
    setHistory(h => [code.trim(), ...h.slice(0,49)]);
    setHistIdx(-1);
    try {
      const result = runnerRef.current.run(code);
      if (result !== undefined && result !== null) appendOutput('result', result);
      setStatus?.('Mesh Script executed');
    } catch(e) {
      appendOutput('error', e.message);
    }
  }, [code, appendOutput, setStatus]);

  const runBuiltin = useCallback((name) => {
    if (!runnerRef.current) return;
    appendOutput('input', `runScript('${name}')`);
    const result = runnerRef.current.runScript(name);
    if (result !== undefined) appendOutput('result', result);
  }, [appendOutput]);

  const runSaved = useCallback((scriptCode) => {
    if (!runnerRef.current) return;
    appendOutput('input', '-- running saved script --');
    const result = runnerRef.current.run(scriptCode);
    if (result !== undefined) appendOutput('result', result);
  }, [appendOutput]);

  const saveScript = useCallback(() => {
    if (!scriptName.trim() || !code.trim()) return;
    const script = { name: scriptName.trim(), code: code.trim(), saved: new Date().toLocaleString() };
    setSavedScripts(prev => [...prev.filter(s => s.name !== script.name), script]);
    runnerRef.current?.saveScript(script.name, script.code);
    appendOutput('system', `Script saved: ${script.name}`);
    setScriptName('');
  }, [scriptName, code, appendOutput]);

  const startRecord = useCallback(() => {
    if (!runnerRef.current || !recordName.trim()) return;
    runnerRef.current.context.startRecord();
    setRecording(true);
    appendOutput('system', `Recording macro: ${recordName}`);
  }, [recordName, appendOutput]);

  const stopRecord = useCallback(() => {
    if (!runnerRef.current) return;
    const cmds = runnerRef.current.context.stopRecord(recordName);
    setRecording(false);
    setMacros(prev => [...prev.filter(m => m.name !== recordName), { name: recordName, count: cmds.length }]);
    appendOutput('system', `Macro saved: ${recordName} (${cmds.length} commands)`);
    setRecordName('');
  }, [recordName, appendOutput]);

  const runMacro = useCallback((name) => {
    if (!runnerRef.current) return;
    const result = runnerRef.current.context.runMacro(name);
    appendOutput('result', result);
  }, [appendOutput]);

  const clearOutput = () => setOutput([]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCode(); }
    if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      if (history[idx]) setCode(history[idx]);
    }
    if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setCode(idx === -1 ? '' : history[idx]);
    }
  };

  if (!open) return null;
  return (
    <div className="ms-overlay" onClick={onClose}>
      <div className="ms-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ms-header">
          <div className="ms-header-dot" />
          <span className="ms-header-title">MESH SCRIPT</span>
          <span className="ms-header-sub">JS scene automation</span>
          {recording && <span className="ms-recording-badge">⏺ REC</span>}
          <button className="ms-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="ms-tabs">
          {[['editor','Editor'],['library','Library'],['macros','Macros']].map(([id,label]) => (
            <button key={id} className={`ms-tab${activeTab===id?' ms-tab--active':''}`}
              onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        <div className="ms-body">

          {/* ── Editor Tab ── */}
          {activeTab === 'editor' && (
            <div className="ms-editor-layout">
              {/* Output */}
              <div className="ms-output" ref={outputRef}>
                {output.length === 0 && <div className="ms-output-empty">Run a script to see output</div>}
                {output.map((line, i) => (
                  <div key={i} className={`ms-line ms-line--${line.type}`}>
                    {line.type === 'input' && <span className="ms-prompt">›</span>}
                    {line.type === 'result' && <span className="ms-prompt ms-prompt--result">←</span>}
                    {line.type === 'error' && <span className="ms-prompt ms-prompt--error">✕</span>}
                    {line.type === 'system' && <span className="ms-prompt ms-prompt--system">⬡</span>}
                    {line.type === 'info' && <span className="ms-prompt ms-prompt--info">ℹ</span>}
                    <pre className="ms-line-text">{line.text}</pre>
                  </div>
                ))}
              </div>

              {/* Editor */}
              <div className="ms-editor-wrap">
                <textarea
                  ref={editorRef}
                  className="ms-editor"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  placeholder="// Write JS here. Ctrl+Enter to run."
                />
              </div>

              {/* Toolbar */}
              <div className="ms-toolbar">
                <button className="ms-btn ms-btn--run" onClick={runCode}>▶ Run <span className="ms-shortcut">Ctrl+↵</span></button>
                <button className="ms-btn" onClick={clearOutput}>🗑 Clear</button>
                <div className="ms-save-row">
                  <input className="ms-save-input" placeholder="Script name..." value={scriptName}
                    onChange={e => setScriptName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveScript()} />
                  <button className="ms-btn" onClick={saveScript}>💾 Save</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Library Tab ── */}
          {activeTab === 'library' && (
            <div className="ms-library">
              <div className="ms-lib-section-title">Built-in Scripts</div>
              {BUILTIN_SCRIPTS.map(s => (
                <div key={s.name} className="ms-script-card">
                  <span className="ms-script-icon">{s.icon}</span>
                  <span className="ms-script-name">{s.label}</span>
                  <button className="ms-btn ms-btn--xs" onClick={() => runBuiltin(s.name)}>▶ Run</button>
                </div>
              ))}

              <div className="ms-lib-section-title ms-lib-section-title--mt">Examples</div>
              {EXAMPLE_SCRIPTS.map(s => (
                <div key={s.name} className="ms-script-card">
                  <span className="ms-script-name">{s.name.replace(/_/g,' ')}</span>
                  <button className="ms-btn ms-btn--xs" onClick={() => { setCode(s.code); setActiveTab('editor'); }}>Edit</button>
                  <button className="ms-btn ms-btn--xs ms-btn--run" onClick={() => { setCode(s.code); setActiveTab('editor'); runCode(); }}>▶</button>
                </div>
              ))}

              {savedScripts.length > 0 && <>
                <div className="ms-lib-section-title ms-lib-section-title--mt">Saved Scripts</div>
                {savedScripts.map(s => (
                  <div key={s.name} className="ms-script-card">
                    <span className="ms-script-name">{s.name}</span>
                    <span className="ms-script-date">{s.saved}</span>
                    <button className="ms-btn ms-btn--xs" onClick={() => { setCode(s.code); setActiveTab('editor'); }}>Edit</button>
                    <button className="ms-btn ms-btn--xs ms-btn--run" onClick={() => runSaved(s.code)}>▶</button>
                    <button className="ms-btn ms-btn--xs ms-btn--danger" onClick={() => setSavedScripts(p => p.filter(x => x.name !== s.name))}>✕</button>
                  </div>
                ))}
              </>}
            </div>
          )}

          {/* ── Macros Tab ── */}
          {activeTab === 'macros' && (
            <div className="ms-macros">
              <div className="ms-lib-section-title">Record Macro</div>
              <div className="ms-macro-record-row">
                <input className="ms-save-input" placeholder="Macro name..."
                  value={recordName} onChange={e => setRecordName(e.target.value)} />
                {!recording
                  ? <button className="ms-btn ms-btn--run" onClick={startRecord} disabled={!recordName.trim()}>⏺ Record</button>
                  : <button className="ms-btn ms-btn--danger" onClick={stopRecord}>⏹ Stop</button>
                }
              </div>
              {recording && <div className="ms-recording-hint">Recording — run commands in the Editor tab</div>}

              {macros.length > 0 && <>
                <div className="ms-lib-section-title ms-lib-section-title--mt">Saved Macros</div>
                {macros.map(m => (
                  <div key={m.name} className="ms-script-card">
                    <span className="ms-script-name">{m.name}</span>
                    <span className="ms-script-date">{m.count} cmds</span>
                    <button className="ms-btn ms-btn--xs ms-btn--run" onClick={() => runMacro(m.name)}>▶ Run</button>
                    <button className="ms-btn ms-btn--xs ms-btn--danger" onClick={() => setMacros(p => p.filter(x => x.name !== m.name))}>✕</button>
                  </div>
                ))}
              </>}

              <div className="ms-lib-section-title ms-lib-section-title--mt">Quick Reference</div>
              <pre className="ms-help-text">{`ls()              — list scene objects
select('name')    — select by name
move('name',x,y,z)
rotate('name',x,y,z)
scale('name',x,y,z)
setColor('name', 0xff0000)
createMesh('box', {...})
addModifier('name', 'SUBDIVISION')
setKeyframe('name', frame, prop, val)
addRigidBody('name', { mass: 1 })
render()
print('message')
help()            — full command list`}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}