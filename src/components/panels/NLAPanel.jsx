import React, { useState, useCallback } from 'react';
import {
  createAction,
  createTrack,
  createStrip,
  evaluateNLA,
  bakeNLA,
} from '../../mesh/NLASystem.js';

const C = {
  bg: '#06060f',
  panel: '#0d1117',
  border: '#21262d',
  teal: '#00ffc8',
  orange: '#FF6600',
  pink: '#ff44aa',
  yellow: '#ffcc00',
  text: '#e0e0e0',
  dim: '#8b949e',
  font: 'JetBrains Mono,monospace',
};

const BLEND_MODES = ['replace', 'add', 'multiply'];

function snapshotAnimData() {
  if (!window.animationData) return { keys: {}, frameEnd: 120 };
  const keys = JSON.parse(JSON.stringify(window.animationData));
  let maxFrame = 0;
  Object.values(keys).forEach((channels) => {
    if (!channels) return;
    Object.values(channels).forEach((frames) => {
      if (!frames) return;
      Object.keys(frames).forEach((f) => {
        const n = Number(f);
        if (Number.isFinite(n) && n > maxFrame) maxFrame = n;
      });
    });
  });
  return { keys, frameEnd: maxFrame || 120 };
}

export default function NLAPanel({ meshRef, sceneObjects, currentFrame, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [tracksOpen, setTracksOpen] = useState(true);
  const [stripFormFor, setStripFormFor] = useState(null);
  const [stripActionId, setStripActionId] = useState('');
  const [stripStart, setStripStart] = useState(0);

  if (!window._nlaActions) window._nlaActions = [];
  if (!window._nlaTracks) window._nlaTracks = [];
  const actions = window._nlaActions;
  const tracks = window._nlaTracks;

  const handleNewAction = () => {
    const a = createAction('Action_' + (actions.length + 1));
    actions.push(a);
    setStatus && setStatus('Created empty action');
    bump();
  };

  const handleNewActionFromKeys = () => {
    const { keys, frameEnd } = snapshotAnimData();
    const objCount = Object.keys(keys).length;
    if (!objCount) {
      setStatus && setStatus('No keyframes to capture');
      return;
    }
    const a = createAction('Snapshot_' + (actions.length + 1), keys);
    a.frameEnd = frameEnd;
    actions.push(a);
    setStatus && setStatus('Captured ' + objCount + ' object(s) -> action');
    bump();
  };

  const handleRemoveAction = (id) => {
    const idx = actions.findIndex((a) => a.id === id);
    if (idx >= 0) actions.splice(idx, 1);
    tracks.forEach((t) => {
      t.strips = (t.strips || []).filter((s) => s.actionId !== id);
    });
    bump();
  };

  const handleRenameAction = (id, name) => {
    const a = actions.find((x) => x.id === id);
    if (a) a.name = name;
    bump();
  };

  const handleNewTrack = () => {
    tracks.push(createTrack('Track_' + (tracks.length + 1)));
    bump();
  };

  const handleRemoveTrack = (id) => {
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx >= 0) tracks.splice(idx, 1);
    bump();
  };

  const handleToggleTrackMute = (id) => {
    const t = tracks.find((x) => x.id === id);
    if (t) t.muted = !t.muted;
    bump();
  };

  const handleToggleTrackSolo = (id) => {
    const t = tracks.find((x) => x.id === id);
    if (t) t.solo = !t.solo;
    bump();
  };

  const handleRenameTrack = (id, name) => {
    const t = tracks.find((x) => x.id === id);
    if (t) t.name = name;
    bump();
  };

  const handleAddStripFormToggle = (trackId) => {
    if (stripFormFor === trackId) {
      setStripFormFor(null);
      return;
    }
    setStripFormFor(trackId);
    setStripStart(currentFrame || 0);
    if (actions[0]) setStripActionId(actions[0].id);
    else setStripActionId('');
  };

  const handleConfirmAddStrip = (trackId) => {
    const action = actions.find((a) => a.id === stripActionId);
    if (!action) {
      setStatus && setStatus('Pick an action first');
      return;
    }
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const dur = (action.frameEnd || 120) - (action.frameStart || 0);
    const start = Number.isFinite(stripStart) ? stripStart : 0;
    const strip = createStrip(action, { frameStart: start, frameEnd: start + dur });
    track.strips.push(strip);
    setStripFormFor(null);
    setStatus && setStatus('Added strip: ' + action.name + ' @ ' + start);
    bump();
  };

  const handleRemoveStrip = (trackId, stripId) => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return;
    t.strips = t.strips.filter((s) => s.id !== stripId);
    bump();
  };

  const handleStripBlend = (trackId, stripId, mode) => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return;
    const s = t.strips.find((x) => x.id === stripId);
    if (s) s.blendMode = mode;
    bump();
  };

  const handleStripInfluence = (trackId, stripId, val) => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return;
    const s = t.strips.find((x) => x.id === stripId);
    if (s) s.influence = Math.max(0, Math.min(1, val));
    bump();
  };

  const handleStripMute = (trackId, stripId) => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return;
    const s = t.strips.find((x) => x.id === stripId);
    if (s) s.muted = !s.muted;
    bump();
  };

  const findTargetMesh = (objId) => {
    const list = Array.isArray(sceneObjects) ? sceneObjects : [];
    const w = list.find((o) => o && o.id === objId);
    if (w && w.mesh) return w.mesh;
    if (meshRef && meshRef.current && meshRef.current.uuid === objId) return meshRef.current;
    const w2 = list.find((o) => o && o.mesh && o.mesh.uuid === objId);
    return w2 ? w2.mesh : null;
  };

  const handleApplyFrame = () => {
    if (!tracks.length) {
      setStatus && setStatus('No tracks');
      return;
    }
    let writes = 0;
    let stripCount = 0;
    tracks.forEach((t) => {
      if (!t.muted) stripCount += (t.strips || []).filter((s) => !s.muted).length;
    });
    try {
      const result = evaluateNLA(tracks, actions, currentFrame || 0);
      Object.entries(result).forEach(([objId, channels]) => {
        const target = findTargetMesh(objId);
        if (!target) return;
        Object.entries(channels).forEach(([prop, value]) => {
          const parts = prop.split('.');
          if (parts.length !== 2) return;
          const [base, axis] = parts;
          if (
            target[base] &&
            axis in target[base] &&
            typeof value === 'number' &&
            Number.isFinite(value)
          ) {
            target[base][axis] = value;
            writes++;
          }
        });
      });
      setStatus && setStatus('Applied NLA: ' + writes + ' write(s) from ' + stripCount + ' strip(s) @ frame ' + (currentFrame || 0));
    } catch (e) {
      console.warn('NLA apply failed:', e);
      setStatus && setStatus('NLA eval error: ' + e.message);
    }
    bump();
  };

  const handleBake = () => {
    if (!tracks.length || !actions.length) {
      setStatus && setStatus('Nothing to bake');
      return;
    }
    if (!window.confirm('Bake NLA to keyframes?\n\nThis MERGES baked frames into window.animationData. Existing keyframes at the same frames will be overwritten.')) {
      return;
    }
    let frameStart = 0;
    let frameEnd = 0;
    actions.forEach((a) => {
      frameEnd = Math.max(frameEnd, a.frameEnd || 0);
    });
    tracks.forEach((t) => {
      (t.strips || []).forEach((s) => {
        frameEnd = Math.max(frameEnd, s.frameEnd || 0);
      });
    });
    if (frameEnd <= 0) frameEnd = 120;
    try {
      const baked = bakeNLA(tracks, actions, frameStart, frameEnd);
      if (!window.animationData) window.animationData = {};
      let chans = 0;
      Object.entries(baked).forEach(([objId, channels]) => {
        if (!window.animationData[objId]) window.animationData[objId] = {};
        Object.entries(channels).forEach(([prop, frames]) => {
          if (!window.animationData[objId][prop]) window.animationData[objId][prop] = {};
          Object.assign(window.animationData[objId][prop], frames);
          chans++;
        });
      });
      setStatus && setStatus('Baked ' + chans + ' channel(s) over frames ' + frameStart + '-' + frameEnd);
    } catch (e) {
      console.warn('NLA bake failed:', e);
      setStatus && setStatus('Bake error: ' + e.message);
    }
    bump();
  };

  const inlineNameInput = (value, onCommit, color) => (
    <input
      defaultValue={value}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur();
      }}
      style={{
        flex: 1,
        background: 'transparent',
        color: color || C.teal,
        border: '1px solid transparent',
        borderRadius: 3,
        padding: '2px 4px',
        fontFamily: C.font,
        fontSize: 10,
        outline: 'none',
        minWidth: 0,
      }}
    />
  );

  const buttonStyle = (col) => ({
    padding: '2px 6px',
    background: 'transparent',
    border: '1px solid ' + C.border,
    borderRadius: 3,
    color: col,
    cursor: 'pointer',
    fontSize: 9,
  });

  const sectionHeader = (label, open, setOpen, count) => (
    <div
      onClick={() => setOpen((v) => !v)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 0',
        cursor: 'pointer',
        borderBottom: '1px solid ' + C.border,
        marginTop: 8,
      }}
    >
      <span style={{ color: C.teal, fontSize: 10 }}>{open ? '▾' : '▸'}</span>
      <span style={{ flex: 1, color: C.teal, fontFamily: C.font, fontSize: 10, fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ color: C.dim, fontSize: 9 }}>{count}</span>
    </div>
  );

  return (
    <div className="spnl-panel-container" style={{ maxWidth: 420 }}>
      <div className="spnl-panel-hdr">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.orange,
            boxShadow: '0 0 6px ' + C.orange,
          }}
        />
        <span className="spnl-hdr-title" style={{ color: C.orange }}>
          NLA
        </span>
        {onClose && (
          <span onClick={onClose} className="spnl-close">
            ×
          </span>
        )}
      </div>

      <div className="spnl-panel-scroll">
        <div style={{ marginBottom: 4, fontSize: 9, color: C.dim }}>
          Active mesh:{' '}
          <span style={{ color: meshRef && meshRef.current ? C.teal : C.pink }}>
            {meshRef && meshRef.current
              ? (meshRef.current.name || meshRef.current.uuid.slice(0, 8))
              : 'none'}
          </span>{' '}
          · Frame: <span style={{ color: C.teal }}>{currentFrame || 0}</span>
        </div>

        {sectionHeader('ACTIONS', actionsOpen, setActionsOpen, actions.length)}
        {actionsOpen && (
          <div style={{ marginTop: 4 }}>
            <div className="spnl-row" style={{ gap: 4 }}>
              <button
                onClick={handleNewAction}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: 'rgba(255,102,0,0.1)',
                  border: '1px solid ' + C.orange,
                  borderRadius: 4,
                  color: C.orange,
                  cursor: 'pointer',
                  fontFamily: C.font,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                + NEW ACTION
              </button>
              <button
                onClick={handleNewActionFromKeys}
                title="snapshot window.animationData"
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: 'rgba(0,255,200,0.05)',
                  border: '1px solid ' + C.teal,
                  borderRadius: 4,
                  color: C.teal,
                  cursor: 'pointer',
                  fontFamily: C.font,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                + FROM KEYS
              </button>
            </div>
            <div style={{ marginTop: 4 }}>
              {actions.length === 0 && (
                <div
                  style={{
                    padding: 8,
                    color: C.dim,
                    fontSize: 10,
                    textAlign: 'center',
                    border: '1px dashed ' + C.border,
                    borderRadius: 4,
                  }}
                >
                  No actions
                </div>
              )}
              {actions.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 4,
                    marginBottom: 4,
                    background: C.bg,
                    border: '1px solid ' + C.border,
                    borderRadius: 4,
                  }}
                >
                  {inlineNameInput(a.name, (v) => handleRenameAction(a.id, v), C.teal)}
                  <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9 }}>
                    {a.frameStart || 0}–{a.frameEnd || 0}
                  </span>
                  <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9 }}>
                    {Object.keys(a.keys || {}).length} obj
                  </span>
                  <button
                    onClick={() => handleRemoveAction(a.id)}
                    title="remove"
                    style={buttonStyle(C.pink)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sectionHeader('TRACKS', tracksOpen, setTracksOpen, tracks.length)}
        {tracksOpen && (
          <div style={{ marginTop: 4 }}>
            <button
              onClick={handleNewTrack}
              style={{
                width: '100%',
                padding: '4px 8px',
                background: 'rgba(255,102,0,0.1)',
                border: '1px solid ' + C.orange,
                borderRadius: 4,
                color: C.orange,
                cursor: 'pointer',
                fontFamily: C.font,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              + NEW TRACK
            </button>
            <div style={{ marginTop: 4 }}>
              {tracks.length === 0 && (
                <div
                  style={{
                    padding: 8,
                    color: C.dim,
                    fontSize: 10,
                    textAlign: 'center',
                    border: '1px dashed ' + C.border,
                    borderRadius: 4,
                  }}
                >
                  No tracks
                </div>
              )}
              {tracks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: 6,
                    marginBottom: 4,
                    background: C.bg,
                    border: '1px solid ' + C.border,
                    borderRadius: 4,
                    opacity: t.muted ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {inlineNameInput(t.name, (v) => handleRenameTrack(t.id, v), C.teal)}
                    <button
                      onClick={() => handleToggleTrackMute(t.id)}
                      title="mute"
                      style={buttonStyle(t.muted ? C.dim : C.orange)}
                    >
                      M
                    </button>
                    <button
                      onClick={() => handleToggleTrackSolo(t.id)}
                      title="solo (UI flag)"
                      style={buttonStyle(t.solo ? C.yellow : C.dim)}
                    >
                      S
                    </button>
                    <button
                      onClick={() => handleAddStripFormToggle(t.id)}
                      style={buttonStyle(C.teal)}
                    >
                      + STRIP
                    </button>
                    <button
                      onClick={() => handleRemoveTrack(t.id)}
                      title="remove track"
                      style={buttonStyle(C.pink)}
                    >
                      ✕
                    </button>
                  </div>

                  {stripFormFor === t.id && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: 6,
                        border: '1px solid ' + C.border,
                        borderRadius: 4,
                        background: C.panel,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select
                          value={stripActionId}
                          onChange={(e) => setStripActionId(e.target.value)}
                          style={{
                            flex: 1,
                            background: C.bg,
                            color: C.text,
                            border: '1px solid ' + C.border,
                            borderRadius: 3,
                            padding: 3,
                            fontFamily: C.font,
                            fontSize: 9,
                            minWidth: 0,
                          }}
                        >
                          <option value="">— action —</option>
                          {actions.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={stripStart}
                          onChange={(e) => setStripStart(parseInt(e.target.value, 10) || 0)}
                          placeholder="frame"
                          style={{
                            width: 60,
                            background: C.bg,
                            color: C.text,
                            border: '1px solid ' + C.border,
                            borderRadius: 3,
                            padding: 3,
                            fontFamily: C.font,
                            fontSize: 9,
                          }}
                        />
                        <button
                          onClick={() => handleConfirmAddStrip(t.id)}
                          style={{
                            padding: '3px 8px',
                            background: 'rgba(0,255,200,0.1)',
                            border: '1px solid ' + C.teal,
                            borderRadius: 3,
                            color: C.teal,
                            cursor: 'pointer',
                            fontFamily: C.font,
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 4 }}>
                    {(t.strips || []).length === 0 && (
                      <div style={{ color: C.dim, fontSize: 9, padding: 4 }}>
                        no strips
                      </div>
                    )}
                    {(t.strips || []).map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 4,
                          marginTop: 4,
                          background: C.panel,
                          border: '1px solid ' + C.border,
                          borderRadius: 3,
                          opacity: s.muted ? 0.5 : 1,
                        }}
                      >
                        <span style={{ color: C.teal, fontFamily: C.font, fontSize: 9, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.actionName}>
                          {s.actionName}
                        </span>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9 }}>
                          {s.frameStart}–{s.frameEnd}
                        </span>
                        <select
                          value={s.blendMode}
                          onChange={(e) => handleStripBlend(t.id, s.id, e.target.value)}
                          style={{
                            background: C.bg,
                            color: C.text,
                            border: '1px solid ' + C.border,
                            borderRadius: 3,
                            padding: 2,
                            fontFamily: C.font,
                            fontSize: 9,
                          }}
                        >
                          {BLEND_MODES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={s.influence}
                          onChange={(e) => handleStripInfluence(t.id, s.id, parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: C.teal, cursor: 'pointer' }}
                          title={'influence ' + s.influence.toFixed(2)}
                        />
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9, minWidth: 28 }}>
                          {s.influence.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleStripMute(t.id, s.id)}
                          title="mute strip"
                          style={buttonStyle(s.muted ? C.dim : C.orange)}
                        >
                          {s.muted ? '○' : '●'}
                        </button>
                        <button
                          onClick={() => handleRemoveStrip(t.id, s.id)}
                          title="remove"
                          style={buttonStyle(C.pink)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="spnl-row" style={{ gap: 4, marginTop: 8 }}>
          <button
            onClick={handleApplyFrame}
            style={{
              flex: 1,
              padding: 6,
              background: 'rgba(0,255,200,0.1)',
              border: '1px solid ' + C.teal,
              borderRadius: 4,
              color: C.teal,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ▶ APPLY AT FRAME
          </button>
          <button
            onClick={handleBake}
            title="merge baked frames into window.animationData (destructive)"
            style={{
              flex: 1,
              padding: 6,
              background: 'rgba(255,68,170,0.15)',
              border: '1px solid ' + C.pink,
              borderRadius: 4,
              color: C.pink,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ⚠ BAKE TO KEYS
          </button>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: C.bg,
            borderRadius: 4,
            border: '1px solid ' + C.border,
            fontSize: 8,
            color: C.dim,
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: C.teal, fontWeight: 700, marginBottom: 4 }}>
            HOW TO USE
          </div>
          1. Keyframe a pose, then "+ FROM KEYS" to capture an action
          <br />
          2. "+ NEW TRACK", then "+ STRIP" picks an action and start frame
          <br />
          3. APPLY AT FRAME writes blended values to mesh transforms
          <br />
          4. BAKE TO KEYS merges into window.animationData (destructive)
        </div>
      </div>
    </div>
  );
}
