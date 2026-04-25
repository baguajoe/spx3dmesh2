/**
 * SPX Onion Skin — ghost mesh rendering for animation
 *
 * STATUS: scaffold only. Implementation deferred to next session.
 *
 * DESIGN (locked in):
 *   - PURE READER of window.animationData and mesh transforms.
 *   - NEVER writes to animationData, addKeyframe, or live mesh transforms.
 *   - Bug here can only affect ghost meshes, never real animation.
 *
 * USAGE (planned):
 *   const skin = new OnionSkin(scene);
 *   skin.attach(mesh);                        // designate which mesh to ghost
 *   skin.update(currentFrame, animationData); // call from currentFrame effect
 *   skin.detach();                            // cleanup ghosts when toggled off
 *   skin.dispose();                           // full teardown
 *
 * INTERNAL APPROACH:
 *   1. Find prevKey and nextKey frame numbers from animationData
 *   2. For each, evaluate the mesh's pose at that frame (use same logic as evaluator)
 *   3. Maintain a small pool of cloned meshes (max 2 — one before, one after)
 *      with translucent material:
 *        - Before-ghost: blue tint, opacity 0.3
 *        - After-ghost: orange tint, opacity 0.3
 *   4. Reuse ghost meshes across update() calls (don't clone every frame —
 *      that's a memory leak waiting to happen). Just update transform.
 *   5. dispose() must remove ghosts from scene AND dispose() their geometry/material.
 *
 * INTEGRATION POINTS (next session):
 *   - One useEffect in App.jsx watching [currentFrame, keyframeVersion, selectedObject]
 *     that calls onionSkin.update().
 *   - One toggle button (probably in timeline, near the AUTO button).
 *   - If selected mesh changes, call skin.detach() then skin.attach(newMesh).
 *
 * RISKS TO WATCH FOR:
 *   - Disposed materials referenced after dispose: crash on next frame
 *   - Ghost mesh kept after toggle-off: visual leak
 *   - Clone-per-frame instead of reuse: memory leak
 *   - useEffect missing cleanup: ghosts pile up across re-renders
 */

export class OnionSkin {
  constructor(scene) {
    this.scene = scene;
    // TODO: implement next session
  }
  attach(mesh) { /* TODO */ }
  detach() { /* TODO */ }
  update(currentFrame, animationData) { /* TODO */ }
  dispose() { /* TODO */ }
}
