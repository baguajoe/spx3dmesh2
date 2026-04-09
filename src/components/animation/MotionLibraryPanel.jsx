import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MOTION_CATEGORIES, MOTION_CLIPS,
  getClipsByCategory, searchClips, getClipMeta,
} from '../../mesh/MotionLibrary';

const CAT_COLORS = {
  Locomotion: '#00ffc8', Combat: '#FF6600',
  Emotes: '#a855f7', Athletic: '#facc15', Social: '#38bdf8',
};

function Toast({ msg }) {
  return <div className="ml-toast">✓ {msg}</div>;
}

function ClipCard({ clip, selected, onSelect, onApply, previewing, previewPct }) {
  const cat = clip.category;
  return (
    <div
      className={`ml-clip-card${selected ? ' ml-clip-card--active' : ''}${previewing ? ' ml-clip-card--preview' : ''}`}
      style={{ '--cat-color': CAT_COLORS[cat] || '#00ffc8' }}
      onClick={() => onSelect(clip.id)}
      onDoubleClick={() => onApply(clip.id)}
      title={`${clip.label} | ${clip.frames} frames @ ${clip.fps}fps | ${clip.duration.toFixed(2)}s${clip.loop ? ' | LOOP' : ''}\nDouble-click to apply`}
    >
      <div className="ml-cat-dot" />
      {clip.loop && <div className="ml-loop-badge">LOOP</div>}
      <div className="ml-clip-icon">{clip.icon}</div>
      <div className="ml-clip-label">{clip.label}</div>
      <div className="ml-clip-meta">{clip.frames}f · {clip.duration.toFixed(1)}s</div>
      {previewing && (
        <div className="ml-preview-bar">
          <div className="ml-preview-fill" style={{ width: `${previewPct * 100}%`, '--cat-color': CAT_COLORS[cat] || '#00ffc8' }} />
        </div>
      )}
    </div>
  );
}

export default function MotionLibraryPanel({
  bvhImporter, onOpenGamepadAnimator, onClipApplied, initialCategory,
}) {
  const [activeTab,    setActiveTab]    = useState(initialCategory || 'Locomotion');
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [applying,     setApplying]     = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const [previewPct,   setPreviewPct]   = useState(0);
  const searchRef  = useRef(null);
  const toastTimer = useRef(null);

  const allClips    = Object.values(MOTION_CLIPS);
  const isSearching = search.trim().length > 0;
  const displayedClips = isSearching ? searchClips(search.trim()) : getClipsByCategory(activeTab);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    if (!previewingId) { setPreviewPct(0); return; }
    const clip = MOTION_CLIPS[previewingId];
    if (!clip) return;
    const duration = clip.duration * 1000;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      setPreviewPct(((now - start) % duration) / duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewingId]);

  const applyClip = useCallback(async (id) => {
    const clip = MOTION_CLIPS[id];
    if (!clip) return;
    setApplying(true); setPreviewingId(id);
    try {
      if (bvhImporter) {
        const importer = bvhImporter?.current ?? bvhImporter;
        if (typeof importer?.loadBVHString === 'function') {
          await importer.loadBVHString(clip.bvh, { name: clip.label, fps: clip.fps, loop: clip.loop });
        } else if (typeof importer?.importBVH === 'function') {
          await importer.importBVH(clip.bvh);
        } else if (typeof importer?.load === 'function') {
          await importer.load(clip.bvh);
        } else {
          window.dispatchEvent(new CustomEvent('spx:applyBVH', { detail: { bvh: clip.bvh, name: clip.label, fps: clip.fps, loop: clip.loop, id: clip.id } }));
        }
      } else {
        window.dispatchEvent(new CustomEvent('spx:applyBVH', { detail: { bvh: clip.bvh, name: clip.label, fps: clip.fps, loop: clip.loop, id: clip.id } }));
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

  const handleApply  = useCallback(() => { if (selectedId) applyClip(selectedId); }, [selectedId, applyClip]);
  const handleRecord = useCallback(() => {
    if (typeof onOpenGamepadAnimator === 'function') onOpenGamepadAnimator();
    else window.dispatchEvent(new CustomEvent('spx:openGamepadAnimator'));
  }, [onOpenGamepadAnimator]);

  const handleTabChange = (cat) => { setActiveTab(cat); setSelectedId(null); setPreviewingId(null); setSearch(''); };

  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedClip = selectedId ? MOTION_CLIPS[selectedId] : null;

  return (
    <div className="ml-root">
      <div className="ml-header">
        <span className="ml-title">⚡ Motion Library</span>
        <span className="ml-count">{allClips.length} clips</span>
      </div>

      <div className="ml-search-row">
        <span className="ml-search-icon">🔍</span>
        <input ref={searchRef} className="ml-search-input"
          placeholder="Search clips… (Ctrl+F)"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedId(null); }}
          spellCheck={false} />
        {search && (
          <button className="ml-clear-btn" onClick={() => { setSearch(''); searchRef.current?.focus(); }} title="Clear search">✕</button>
        )}
      </div>

      {!isSearching && (
        <div className="ml-tabs">
          {MOTION_CATEGORIES.map(cat => {
            const count = allClips.filter(c => c.category === cat).length;
            return (
              <button key={cat}
                className={`ml-tab${activeTab === cat ? ' ml-tab--active' : ''}`}
                style={{ '--cat-color': CAT_COLORS[cat] || '#00ffc8' }}
                onClick={() => handleTabChange(cat)}>
                {cat} <span className="ml-tab-count">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="ml-clip-grid">
        {displayedClips.length === 0 ? (
          <div className="ml-empty">
            <span className="ml-empty-icon">🎬</span>
            <span>No clips found</span>
            {search && <span className="ml-empty-hint">Try a different search term</span>}
          </div>
        ) : (
          displayedClips.map(clip => (
            <ClipCard key={clip.id} clip={clip}
              selected={selectedId === clip.id}
              previewing={previewingId === clip.id}
              previewPct={previewingId === clip.id ? previewPct : 0}
              onSelect={id => setSelectedId(id === selectedId ? null : id)}
              onApply={applyClip} />
          ))
        )}
      </div>

      <div className="ml-footer">
        <button className="ml-record-btn" onClick={handleRecord} title="Record new animation with GamepadAnimator">
          ⏺ Record New
        </button>
        <button
          className={`ml-apply-btn${(!selectedId || applying) ? ' ml-apply-btn--disabled' : ''}`}
          onClick={handleApply}
          disabled={!selectedId || applying}
          title={selectedClip ? `Apply "${selectedClip.label}" to scene` : 'Select a clip first'}>
          {applying ? '⏳ Applying…' : selectedClip ? `▶ Apply: ${selectedClip.label}` : '▶ Apply Clip'}
        </button>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  );
}
