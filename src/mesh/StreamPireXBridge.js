// StreamPireXBridge.js — Upload SPX Mesh exports to StreamPireX R2
// Used by the 3D Mesh Editor to send GLB/OBJ/FBX files to StreamPireX

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://streampirex-production.up.railway.app';

function getAuthHeaders() {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token') || '';
  return { 'Authorization': `Bearer ${token}` };
}

/**
 * Upload a GLB blob to StreamPireX R2 storage
 * @param {Blob} blob - GLB binary blob
 * @param {string} filename - e.g. 'spx_mesh.glb'
 * @param {object} meta - { name, polycount, materials }
 * @returns {Promise<{url, key}>}
 */
export async function uploadMeshToStreamPireX(blob, filename = 'spx_mesh.glb', meta = {}) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('folder', 'meshes');
  formData.append('meta', JSON.stringify({ ...meta, source: 'spx-mesh-editor', exportedAt: Date.now() }));

  const res = await fetch(`${BACKEND}/api/r2/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return await res.json(); // { url, key, size }
}

/**
 * List meshes uploaded by the current user
 * @returns {Promise<Array<{name, url, key, size, uploadedAt}>>}
 */
export async function listUserMeshes() {
  const res = await fetch(`${BACKEND}/api/r2/list?folder=meshes`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return await res.json();
}

/**
 * Notify StreamPireX that a mesh is ready for use in the compositor/video editor
 * @param {string} meshUrl - R2 public URL
 * @param {string} meshName - display name
 */
export async function notifyStreamPireX(meshUrl, meshName) {
  try {
    // Store in localStorage for cross-app communication
    const existing = JSON.parse(localStorage.getItem('spx_mesh_library') || '[]');
    existing.unshift({ url: meshUrl, name: meshName, addedAt: Date.now() });
    localStorage.setItem('spx_mesh_library', JSON.stringify(existing.slice(0, 50)));

    // Also post message for iframe integration
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SPX_MESH_READY', url: meshUrl, name: meshName }, '*');
    }
  } catch (e) {
    console.warn('StreamPireX notify failed:', e);
  }
}

/**
 * Full pipeline: export GLB → upload to R2 → notify StreamPireX
 * @param {Blob} glbBlob
 * @param {string} name
 * @param {object} meta
 * @param {function} onProgress - (status: string) => void
 */
export async function sendMeshToStreamPireX(glbBlob, name = 'My Mesh', meta = {}, onProgress = () => {}) {
  onProgress('Uploading to StreamPireX...');
  const filename = name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.glb';

  const result = await uploadMeshToStreamPireX(glbBlob, filename, { name, ...meta });
  onProgress('Upload complete. Notifying...');

  await notifyStreamPireX(result.url, name);
  onProgress(`✅ Sent to StreamPireX: ${name}`);

  return result;
}
