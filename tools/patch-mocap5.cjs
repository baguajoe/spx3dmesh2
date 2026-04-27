#!/usr/bin/env node
const fs = require('fs');

// ── MotionCaptureWithRecording.jsx ────────────────────────────────────────────
let mr = fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', 'utf8');

// div with all static styles — remove style, use className
mr = mr.replace(
`      <div className="mcr-row" style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '12px',
        padding: '8px 0',
      }}>`,
`      <div className="mcr-row mcr-row--top">`
);

// p with dynamic color — keep style for color only
mr = mr.replace(
`      {saveStatus && (
        <p className="mcr-hint" style={{
          marginTop: '8px',
          fontSize: '13px',
          color: saveStatus.includes('🎉') || saveStatus.includes('complete')
            ? '#4ade80'
            : saveStatus.includes('failed') || saveStatus.includes('error')`,
`      {saveStatus && (
        <p className="mcr-hint mcr-hint--status" style={{color: saveStatus.includes('🎉') || saveStatus.includes('complete')
            ? '#4ade80'
            : saveStatus.includes('failed') || saveStatus.includes('error')`
);

fs.writeFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', mr);
const mrR = (fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureWithRecording.jsx — ${mrR} remaining`);

// Final overall count
const files = [
  'src/front/js/component/LiveMoCapAvatar.jsx',
  'src/front/js/component/MotionCaptureSystem.jsx',
  'src/front/js/component/MotionCaptureWithRecording.jsx',
  'src/front/js/component/VideoMocapSystem.jsx',
  'src/workspaces/mocap/MocapWorkspace.jsx',
];
let total = 0;
for (const f of files) {
  const n = (fs.readFileSync(f,'utf8').match(/style=\{\{/g)||[]).length;
  total += n;
  console.log(`  ${f.split('/').pop()}: ${n}`);
}
console.log(`Total remaining: ${total}`);
