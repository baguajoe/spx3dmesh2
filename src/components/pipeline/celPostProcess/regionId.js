// Region-ID resolver for the GPU cel post-process pipeline.
//
// Locked decisions (Q2/Q3 of audit/cel_pipeline_rewrite_proposal.md):
//   - Face and hair tuning move from separate sub-render passes into
//     per-pixel region branches inside the main post-process fragment.
//   - Each mesh maps to a region ID; the cel material writes that ID
//     to a 1-channel render target (MRT 2). The fragment then looks up
//     per-region posterize/edge/bilateral uniforms.
//
// Stage 1: stub. Returns BODY for every mesh. Stage 4 wires the actual
// hair / face matchers from the current panel code (HAIR_MESH_PATTERNS
// at SPX3DTo2DPanel.jsx:1227 and detectFaceRect / face-bone matching
// in utils/faceDetection).
//
// Region IDs are kept small integer constants so they pack into an
// 8-bit single-channel target (R8) without precision loss.

export const REGION_BODY = 0;
export const REGION_FACE = 1;
export const REGION_HAIR = 2;

// Resolve a region ID for a given mesh. Used at material-creation time
// to set the region uniform on each mesh's cel shader instance.
//
// Stage 1: everything is body. The CPU pipeline's face/hair sub-passes
// still run unchanged when the GPU flag is off.
export function resolveRegionId(_mesh) {
  return REGION_BODY;
}
