import React, { useState, useCallback, useMemo } from 'react';

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

const AXIS_COLOR = { x: '#ff5566', y: '#66ff88', z: '#5588ff' };

function chanColor(channel) {
  const axis = (channel || '').split('.')[1];
  return AXIS_COLOR[(axis || '').toLowerCase()] || C.teal;
}

export default function GraphEditorPanel({ meshRef, sceneObjects, currentFrame, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const initialUuid = (() => {
    if (
      meshRef &&
      meshRef.current &&
      meshRef.current.uuid &&
      window.animationData &&
      window.animationData[meshRef.current.uuid]
    ) {
      return meshRef.current.uuid;
    }
    if (window.animationData) {
      const keys = Object.keys(window.animationData);
      return keys[0] || '';
    }
    return '';
  })();

  const [pickedUuid, setPickedUuid] = useState(initialUuid);
  const [expanded, setExpanded] = useState({});

  const data = window.animationData || {};

  const animatedUuids = Object.keys(data).filter((u) => {
    const obj = data[u];
    if (!obj) return false;
    return Object.keys(obj).some((ch) => obj[ch] && Object.keys(obj[ch]).length > 0);
  });

  const labelOf = useMemo(() => {
    const m = {};
    const list = Array.isArray(sceneObjects) ? sceneObjects : [];
    list.forEach((o) => {
      if (o && o.mesh && o.mesh.uuid) {
        m[o.mesh.uuid] = o.name || o.mesh.name || o.mesh.uuid.slice(0, 8);
      }
    });
    if (meshRef && meshRef.current && meshRef.current.uuid && !m[meshRef.current.uuid]) {
      m[meshRef.current.uuid] =
        meshRef.current.name || meshRef.current.uuid.slice(0, 8);
    }
    animatedUuids.forEach((u) => {
      if (!m[u]) m[u] = u.slice(0, 8);
    });
    return m;
  }, [sceneObjects, meshRef && meshRef.current, animatedUuids.length]);

  const channels = pickedUuid && data[pickedUuid] ? data[pickedUuid] : null;
  const channelKeys = channels
    ? Object.keys(channels)
        .filter((c) => channels[c] && Object.keys(channels[c]).length > 0)
        .sort()
    : [];

  const toggleExpand = (ch) => {
    setExpanded((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleDelete = (channel, frame) => {
    if (!pickedUuid) return;
    if (typeof window.deleteKeyframe === 'function') {
      window.deleteKeyframe(pickedUuid, frame, channel);
    } else if (data[pickedUuid] && data[pickedUuid][channel]) {
      delete data[pickedUuid][channel][frame];
    }
    setStatus && setStatus('Deleted ' + channel + ' @ ' + frame);
    bump();
  };

  const handleJump = (frame) => {
    window.currentFrame = frame;
    try {
      window.dispatchEvent(new CustomEvent('spx:seek-frame', { detail: { frame } }));
    } catch (e) {
      // ignore
    }
    setStatus && setStatus('Jumped to frame ' + frame);
    bump();
  };

  const handleRefresh = () => {
    setStatus &&
      setStatus(
        'Refreshed graph (' + animatedUuids.length + ' animated object(s))'
      );
    bump();
  };

  const stats = useMemo(() => {
    if (!channels) return null;
    let totalKeys = 0;
    let minFrame = Infinity;
    let maxFrame = -Infinity;
    Object.values(channels).forEach((frames) => {
      Object.keys(frames || {}).forEach((f) => {
        const n = Number(f);
        if (!Number.isFinite(n)) return;
        totalKeys++;
        if (n < minFrame) minFrame = n;
        if (n > maxFrame) maxFrame = n;
      });
    });
    return {
      totalKeys,
      minFrame: minFrame === Infinity ? 0 : minFrame,
      maxFrame: maxFrame === -Infinity ? 0 : maxFrame,
    };
  }, [channels, channelKeys.length]);

  const channelStats = (channel) => {
    const frames = (channels && channels[channel]) || {};
    const fs = Object.keys(frames)
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    return {
      count: fs.length,
      first: fs[0] != null ? fs[0] : 0,
      last: fs[fs.length - 1] != null ? fs[fs.length - 1] : 0,
      sortedFrames: fs,
      raw: frames,
    };
  };

  const buttonStyle = (col) => ({
    padding: '2px 6px',
    background: 'transparent',
    border: '1px solid ' + C.border,
    borderRadius: 3,
    color: col,
    cursor: 'pointer',
    fontSize: 9,
    fontFamily: C.font,
  });

  return (
    <div className="spnl-panel-container" style={{ maxWidth: 400 }}>
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
          GRAPH EDITOR
        </span>
        {onClose && (
          <span onClick={onClose} className="spnl-close">
            ×
          </span>
        )}
      </div>

      <div className="spnl-panel-scroll">
        <div style={{ marginBottom: 4, fontSize: 9, color: C.dim }}>
          Animated objects:{' '}
          <span style={{ color: C.teal }}>{animatedUuids.length}</span> · Frame:{' '}
          <span style={{ color: C.teal }}>{currentFrame || 0}</span>
        </div>

        <div style={{ fontSize: 9, color: C.dim, marginTop: 6, marginBottom: 4 }}>
          OBJECT
        </div>
        <div className="spnl-row" style={{ gap: 4 }}>
          <select
            value={pickedUuid}
            onChange={(e) => {
              setPickedUuid(e.target.value);
              setExpanded({});
            }}
            style={{
              flex: 1,
              background: C.bg,
              color: C.text,
              border: '1px solid ' + C.border,
              borderRadius: 4,
              padding: 4,
              fontFamily: C.font,
              fontSize: 10,
              minWidth: 0,
            }}
          >
            <option value="">— pick object —</option>
            {animatedUuids.map((u) => (
              <option key={u} value={u}>
                {labelOf[u] || u.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            title="re-read window.animationData"
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid ' + C.border,
              borderRadius: 4,
              color: C.dim,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
            }}
          >
            ↻
          </button>
        </div>

        {stats && (
          <div
            style={{
              marginTop: 6,
              fontSize: 9,
              color: C.dim,
              display: 'flex',
              gap: 12,
            }}
          >
            <span>
              total keys:{' '}
              <span style={{ color: C.teal }}>{stats.totalKeys}</span>
            </span>
            <span>
              range:{' '}
              <span style={{ color: C.teal }}>
                {stats.minFrame}–{stats.maxFrame}
              </span>
            </span>
            <span>
              channels:{' '}
              <span style={{ color: C.teal }}>{channelKeys.length}</span>
            </span>
          </div>
        )}

        <div style={{ fontSize: 9, color: C.dim, marginTop: 8, marginBottom: 4 }}>
          CHANNELS
        </div>
        <div>
          {(!pickedUuid || channelKeys.length === 0) && (
            <div
              style={{
                padding: 12,
                color: C.dim,
                fontSize: 10,
                textAlign: 'center',
                border: '1px dashed ' + C.border,
                borderRadius: 4,
              }}
            >
              {pickedUuid ? 'No channels' : 'Pick an object'}
            </div>
          )}

          {pickedUuid &&
            channelKeys.map((ch) => {
              const cs = channelStats(ch);
              const open = !!expanded[ch];
              return (
                <div
                  key={ch}
                  style={{
                    marginBottom: 4,
                    background: C.bg,
                    border: '1px solid ' + C.border,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => toggleExpand(ch)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 6,
                      cursor: 'pointer',
                      background: open ? 'rgba(0,255,200,0.04)' : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: chanColor(ch),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: chanColor(ch),
                        fontFamily: C.font,
                        fontSize: 10,
                      }}
                    >
                      {ch}
                    </span>
                    <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9 }}>
                      {cs.count} key{cs.count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: C.dim, fontFamily: C.font, fontSize: 9 }}>
                      {cs.first}–{cs.last}
                    </span>
                    <span style={{ color: C.teal, fontSize: 10, width: 12, textAlign: 'center' }}>
                      {open ? '▾' : '▸'}
                    </span>
                  </div>

                  {open && (
                    <div
                      style={{
                        borderTop: '1px solid ' + C.border,
                        padding: 4,
                        background: C.panel,
                      }}
                    >
                      {cs.sortedFrames.length === 0 && (
                        <div style={{ color: C.dim, fontSize: 9, padding: 4 }}>
                          (empty)
                        </div>
                      )}
                      {cs.sortedFrames.map((f) => {
                        const v = cs.raw[f];
                        const num = typeof v === 'number' ? v : Number(v);
                        const isCurrent = (currentFrame || 0) === f;
                        return (
                          <div
                            key={f}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 4px',
                              fontFamily: C.font,
                              fontSize: 9,
                              background: isCurrent
                                ? 'rgba(255,204,0,0.08)'
                                : 'transparent',
                              borderLeft: isCurrent
                                ? '2px solid ' + C.yellow
                                : '2px solid transparent',
                            }}
                          >
                            <span
                              style={{
                                color: isCurrent ? C.yellow : C.text,
                                minWidth: 36,
                              }}
                            >
                              f{f}
                            </span>
                            <span style={{ color: chanColor(ch), flex: 1 }}>
                              {Number.isFinite(num) ? num.toFixed(4) : String(v)}
                            </span>
                            <button
                              onClick={() => handleJump(f)}
                              title="jump to frame"
                              style={buttonStyle(C.teal)}
                            >
                              ⇥
                            </button>
                            <button
                              onClick={() => handleDelete(ch, f)}
                              title="delete keyframe"
                              style={buttonStyle(C.pink)}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
          1. Pick an object — only animated ones are listed
          <br />
          2. Click a channel row to expand its keyframes
          <br />
          3. ⇥ jumps to that frame · ✕ deletes that keyframe
          <br />
          4. ↻ re-reads window.animationData if it looks stale
          <br />
          (read-mostly v1 — no curve drawing or tangent edits)
        </div>
      </div>
    </div>
  );
}
