// MotionLibraryPanel.jsx — SPX Mesh Editor
// Motion Library panel: 5 category tabs, clip cards, search, apply via BVHImporter,
// Record New button opens GamepadAnimator

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  MOTION_CATEGORIES,
  MOTION_CLIPS,
  getClipsByCategory,
  searchClips,
  getClipMeta,
} from '../../mesh/MotionLibrary';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:        '#06060f',
  panel:     '#0d0d1a',
  card:      '#111122',
  cardHover: '#181830',
  cardActive:'#1a1a35',
  border:    '#1e1e3a',
  teal:      '#00ffc8',
  orange:    '#FF6600',
  text:      '#e0e0f0',
  muted:     '#5a5a8a',
  dim:       '#2a2a4a',
  font:      "'JetBrains Mono', 'Fira Code', monospace",
};

const CAT_COLORS = {
  Locomotion: '#00ffc8',
  Combat:     '#FF6600',
  Emotes:     '#a855f7',
  Athletic:   '#facc15',
  Social:     '#38bdf8',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: T.bg,
    fontFamily: T.font,
    color: T.text,
    overflow: 'hidden',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 8px',
    borderBottom: `1px solid ${T.border}`,
    flexShrink: 0,
  },
  title: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: T.teal,
  },
  count: {
    fontSize: '10px',
    color: T.muted,
    letterSpacing: '0.05em',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderBottom: `1px solid ${T.border}`,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    padding: '5px 8px',
    fontSize: '11px',
    fontFamily: T.font,
    color: T.text,
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: T.muted,
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '13px',
    lineHeight: 1,
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${T.border}`,
    flexShrink: 0,
    overflowX: 'auto',
  },
  tab: (active, cat) => ({
    flex: '0 0 auto',
    padding: '7px 10px',
    fontSize: '10px',
    fontFamily: T.font,
    fontWeight: active ? 700 : 400,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    background: active ? T.panel : 'none',
    color: active ? (CAT_COLORS[cat] || T.teal) : T.muted,
    border: 'none',
    borderBottom: active ? `2px solid ${CAT_COLORS[cat] || T.teal}` : '2px solid transparent',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  clipGrid: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: 6,
    alignContent: 'start',
  },
  clipCard: (active, cat) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 6px 6px',
    background: active ? T.cardActive : T.card,
    border: `1px solid ${active ? (CAT_COLORS[cat] || T.teal) : T.border}`,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.12s',
    position: 'relative',
    overflow: 'hidden',
  }),
  clipIcon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  clipLabel: {
    fontSize: '9px',
    fontFamily: T.font,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textAlign: 'center',
    color: T.text,
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  clipMeta: {
    fontSize: '8px',
    color: T.muted,
    fontFamily: T.font,
  },
  loopBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    fontSize: '7px',
    color: T.teal,
    background: 'rgba(0,255,200,0.12)',
    borderRadius: 2,
    padding: '1px 3px',
    letterSpacing: '0.05em',
  },
  catDot: (cat) => ({
    position: 'absolute',
    top: 3,
    left: 3,
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: CAT_COLORS[cat] || T.teal,
  }),
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    borderTop: `1px solid ${T.border}`,
    flexShrink: 0,
  },
  recordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 10px',
    background: `linear-gradient(135deg, ${T.orange}, #cc4400)`,
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    fontSize: '10px',
    fontFamily: T.font,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  applyBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '6px 10px',
    background: `linear-gradient(135deg, ${T.teal}22, ${T.teal}11)`,
    border: `1px solid ${T.teal}44`,
    borderRadius: 4,
    color: T.teal,
    fontSize: '10px',
    fontFamily: T.font,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  applyBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  toast: {
    position: 'absolute',
    bottom: 52,
    left: '50%',
    transform: 'translateX(-50%)',
    background: T.teal,
    color: T.bg,
    fontSize: '10px',
    fontFamily: T.font,
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '5px 14px',
    borderRadius: 4,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 100,
    animation: 'spxToastIn 0.2s ease',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '40px 20px',
    color: T.muted,
    fontSize: '11px',
    fontFamily: T.font,
    textAlign: 'center',
  },
  previewBar: {
    height: 2,
    borderRadius: 1,
    background: T.dim,
    position: 'relative',
    overflow: 'hidden',
    width: '80%',
  },
  previewProgress: (pct, cat) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${pct * 100}%`,
    background: CAT_COLORS[cat] || T.teal,
    borderRadius: 1,
    transition: 'width 0.05s linear',
  }),
};

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={S.toast}>
      ✓ {msg}
    </div>
  );
}

// ─── ClipCard ────────────────────────────────────────────────────────────────
function ClipCard({ clip, selected, onSelect, onApply, previewing, previewPct }) {
  const cat = clip.category;
  const isActive = selected;

  return (
    <div
      style={{
        ...S.clipCard(isActive, cat),
        ...(previewing ? { borderColor: CAT_COLORS[cat] || T.teal } : {}),
      }}
      onClick={() => onSelect(clip.id)}
      onDoubleClick={() => onApply(clip.id)}
      title={`${clip.label} | ${clip.frames} frames @ ${clip.fps}fps | ${clip.duration.toFixed(2)}s${clip.loop ? ' | LOOP' : ''}\nDouble-click to apply`}
    >
      <div style={S.catDot(cat)} />
      {clip.loop && <div style={S.loopBadge}>LOOP</div>}
      <div style={S.clipIcon}>{clip.icon}</div>
      <div style={S.clipLabel}>{clip.label}</div>
      <div style={S.clipMeta}>{clip.frames}f · {clip.duration.toFixed(1)}s</div>
      {previewing && (
        <div style={S.previewBar}>
          <div style={S.previewProgress(previewPct, cat)} />
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export default function MotionLibraryPanel({
  bvhImporter,          // BVHImporter instance or ref
  onOpenGamepadAnimator, // callback to open GamepadAnimator
  onClipApplied,        // optional callback(clipId, clipMeta)
  initialCategory,
}) {
  const [activeTab, setActiveTab]     = useState(initialCategory || 'Locomotion');
  const [search, setSearch]           = useState('');
  const [selectedId, setSelectedId]   = useState(null);
  const [toast, setToast]             = useState(null);
  const [applying, setApplying]       = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const [previewPct, setPreviewPct]   = useState(0);
  const previewRef   = useRef(null);
  const searchRef    = useRef(null);
  const toastTimer   = useRef(null);

  // ── Compute displayed clips ────────────────────────────────────────────────
  const allClips = Object.values(MOTION_CLIPS);
  const isSearching = search.trim().length > 0;

  const displayedClips = isSearching
    ? searchClips(search.trim())
    : getClipsByCategory(activeTab);

  const totalInCat = isSearching
    ? displayedClips.length
    : allClips.filter(c => c.category === activeTab).length;

  // ── Show toast ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── Preview animation ticker ───────────────────────────────────────────────
  useEffect(() => {
    if (!previewingId) { setPreviewPct(0); return; }
    const clip = MOTION_CLIPS[previewingId];
    if (!clip) return;
    const duration = clip.duration * 1000;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = (now - start) % duration;
      setPreviewPct(elapsed / duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewingId]);

  // ── Apply clip via BVHImporter ─────────────────────────────────────────────
  const applyClip = useCallback(async (id) => {
    const clip = MOTION_CLIPS[id];
    if (!clip) return;
    setApplying(true);
    setPreviewingId(id);
    try {
      if (bvhImporter) {
        // Support both direct instance and { current } ref
        const importer = bvhImporter?.current ?? bvhImporter;
        if (typeof importer?.loadBVHString === 'function') {
          await importer.loadBVHString(clip.bvh, {
            name: clip.label,
            fps: clip.fps,
            loop: clip.loop,
          });
        } else if (typeof importer?.importBVH === 'function') {
          await importer.importBVH(clip.bvh);
        } else if (typeof importer?.load === 'function') {
          await importer.load(clip.bvh);
        } else {
          // Fallback: dispatch custom event for BVHImporter to pick up
          window.dispatchEvent(new CustomEvent('spx:applyBVH', {
            detail: { bvh: clip.bvh, name: clip.label, fps: clip.fps, loop: clip.loop, id: clip.id }
          }));
        }
      } else {
        window.dispatchEvent(new CustomEvent('spx:applyBVH', {
          detail: { bvh: clip.bvh, name: clip.label, fps: clip.fps, loop: clip.loop, id: clip.id }
        }));
      }
      onClipApplied?.(id, getClipMeta(id));
      showToast(`Applied: ${clip.label}`);
    } catch (err) {
      console.error('[MotionLibrary] Apply failed:', err);
      showToast(`Error: ${clip.label}`);
    } finally {
      setApplying(false);
    }
  }, [bvhImporter, onClipApplied, showToast]);

  // ── Handle apply button ────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!selectedId) return;
    applyClip(selectedId);
  }, [selectedId, applyClip]);

  // ── Handle record button ───────────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    if (typeof onOpenGamepadAnimator === 'function') {
      onOpenGamepadAnimator();
    } else {
      window.dispatchEvent(new CustomEvent('spx:openGamepadAnimator'));
    }
  }, [onOpenGamepadAnimator]);

  // ── Tab switch resets selection ────────────────────────────────────────────
  const handleTabChange = (cat) => {
    setActiveTab(cat);
    setSelectedId(null);
    setPreviewingId(null);
    setSearch('');
  };

  // ── Search focus shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedClip = selectedId ? MOTION_CLIPS[selectedId] : null;

  return (
    <div style={S.root}>
      <style>{`
        @keyframes spxToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .spx-clip-card:hover {
          background: ${T.cardHover} !important;
          border-color: ${T.dim} !important;
          transform: translateY(-1px);
        }
        .spx-clip-card:active {
          transform: translateY(0);
        }
        .spx-tab:hover { color: ${T.text} !important; }
        .spx-search:focus { border-color: ${T.teal}88 !important; }
        .spx-record-btn:hover { opacity: 0.85; }
        .spx-apply-btn:hover { background: ${T.teal}33 !important; border-color: ${T.teal}88 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.dim}; border-radius: 2px; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={S.header}>
        <span style={S.title}>⚡ Motion Library</span>
        <span style={S.count}>{allClips.length} clips</span>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div style={S.searchRow}>
        <span style={{ fontSize: '12px', color: T.muted }}>🔍</span>
        <input
          ref={searchRef}
          className="spx-search"
          style={S.searchInput}
          placeholder="Search clips… (Ctrl+F)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedId(null);
          }}
          spellCheck={false}
        />
        {search && (
          <button
            style={S.clearBtn}
            onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Category Tabs ───────────────────────────────────────────── */}
      {!isSearching && (
        <div style={S.tabs}>
          {MOTION_CATEGORIES.map((cat) => {
            const count = allClips.filter(c => c.category === cat).length;
            return (
              <button
                key={cat}
                className="spx-tab"
                style={S.tab(activeTab === cat, cat)}
                onClick={() => handleTabChange(cat)}
              >
                {cat} <span style={{ opacity: 0.55 }}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Clip Grid ───────────────────────────────────────────────── */}
      <div style={S.clipGrid}>
        {displayedClips.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: '28px' }}>🎬</span>
            <span>No clips found</span>
            {search && (
              <span style={{ fontSize: '9px' }}>Try a different search term</span>
            )}
          </div>
        ) : (
          displayedClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              selected={selectedId === clip.id}
              previewing={previewingId === clip.id}
              previewPct={previewingId === clip.id ? previewPct : 0}
              onSelect={(id) => {
                setSelectedId(id === selectedId ? null : id);
              }}
              onApply={applyClip}
            />
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div style={S.footer}>
        <button
          className="spx-record-btn"
          style={S.recordBtn}
          onClick={handleRecord}
          title="Record new animation with GamepadAnimator"
        >
          ⏺ Record New
        </button>
        <button
          className="spx-apply-btn"
          style={{
            ...S.applyBtn,
            ...((!selectedId || applying) ? S.applyBtnDisabled : {}),
          }}
          onClick={handleApply}
          disabled={!selectedId || applying}
          title={selectedClip ? `Apply "${selectedClip.label}" to scene` : 'Select a clip first'}
        >
          {applying ? '⏳ Applying…' : selectedClip ? `▶ Apply: ${selectedClip.label}` : '▶ Apply Clip'}
        </button>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ─── Standalone usage example ─────────────────────────────────────────────────
// import MotionLibraryPanel from './components/animation/MotionLibraryPanel';
// import BVHImporter from './mesh/BVHImporter';
//
// const importerRef = useRef(new BVHImporter(scene, mixer));
//
// <MotionLibraryPanel
//   bvhImporter={importerRef}
//   onOpenGamepadAnimator={() => setGamepadOpen(true)}
//   onClipApplied={(id, meta) => console.log('Applied', id, meta)}
// />
//
// Or wire via event:
// window.addEventListener('spx:applyBVH', (e) => {
//   const { bvh, name, fps, loop } = e.detail;
//   bvhImporter.loadBVHString(bvh, { name, fps, loop });
// });
