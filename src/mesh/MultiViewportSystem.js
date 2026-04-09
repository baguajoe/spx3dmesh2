import * as THREE from "three";

export function createQuadCameraSet(perspCamera) {
  const makeOrtho = () => new THREE.OrthographicCamera(-6, 6, 6, -6, 0.01, 1000);

  const top = makeOrtho();
  top.position.set(0, 12, 0);
  top.up.set(0, 0, -1);
  top.lookAt(0, 0, 0);

  const front = makeOrtho();
  front.position.set(0, 0, 12);
  front.up.set(0, 1, 0);
  front.lookAt(0, 0, 0);

  const right = makeOrtho();
  right.position.set(12, 0, 0);
  right.up.set(0, 1, 0);
  right.lookAt(0, 0, 0);

  return { persp: perspCamera, top, front, right };
}

export function resizeQuadCameraSet(cams, width, height) {
  if (!cams) return;
  const halfW = Math.max(width / 2, 1);
  const halfH = Math.max(height / 2, 1);
  const cellAspect = halfW / halfH;
  const orthoSize = 6;

  const resizeOrtho = (cam) => {
    if (!cam || !cam.isOrthographicCamera) return;
    cam.left = -orthoSize * cellAspect;
    cam.right = orthoSize * cellAspect;
    cam.top = orthoSize;
    cam.bottom = -orthoSize;
    cam.updateProjectionMatrix();
  };

  resizeOrtho(cams.top);
  resizeOrtho(cams.front);
  resizeOrtho(cams.right);

  if (cams.persp && cams.persp.isPerspectiveCamera) {
    cams.persp.aspect = cellAspect;
    cams.persp.updateProjectionMatrix();
  }
}

export function getViewportRects(width, height, splitX = 0.5, splitY = 0.5) {
  const leftW = Math.floor(width * splitX);
  const rightW = width - leftW;
  const bottomH = Math.floor(height * splitY);
  const topH = height - bottomH;

  // Maya style:
  // top-left: Top
  // top-right: Persp
  // bottom-left: Front
  // bottom-right: Side
  return {
    top:   { x: 0,      y: bottomH, w: leftW,  h: topH },
    persp: { x: leftW,  y: bottomH, w: rightW, h: topH },
    front: { x: 0,      y: 0,       w: leftW,  h: bottomH },
    right: { x: leftW,  y: 0,       w: rightW, h: bottomH },
  };
}

export function renderViewportSet(renderer, scene, cams, width, height, quadView, splitX = 0.5, splitY = 0.5) {
  if (!renderer || !scene || !cams?.persp) return null;

  if (!quadView) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, cams.persp);
    return { persp: { x: 0, y: 0, w: width, h: height } };
  }

  const rects = getViewportRects(width, height, splitX, splitY);

  renderer.setScissorTest(true);
  renderer.clear();

  const order = [
    { name: "top", cam: cams.top },
    { name: "persp", cam: cams.persp },
    { name: "front", cam: cams.front },
    { name: "right", cam: cams.right },
  ];

  for (const v of order) {
    const r = rects[v.name];
    renderer.setViewport(r.x, r.y, r.w, r.h);
    renderer.setScissor(r.x, r.y, r.w, r.h);
    renderer.render(scene, v.cam);
  }

  renderer.setScissorTest(false);
  return rects;
}

export function detectViewportFromPointer(event, canvas, quadView, splitX = 0.5, splitY = 0.5) {
  if (!quadView || !canvas) return "persp";

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const left = x < rect.width * splitX;
  const top = y < rect.height * (1 - splitY);

  if (top && left) return "top";
  if (top && !left) return "persp";
  if (!top && left) return "front";
  return "right";
}

export function getActiveViewportCamera(cams, activeViewport) {
  if (!cams) return null;
  return cams[activeViewport] || cams.persp || null;
}

export function snapCameraToAxis(camera, axis, distance = 12) {
  if (!camera) return;

  switch (axis) {
    case "x":  camera.position.set( distance, 0, 0); break;
    case "-x": camera.position.set(-distance, 0, 0); break;
    case "y":  camera.position.set(0, 0,  distance); break;
    case "-y": camera.position.set(0, 0, -distance); break;
    case "z":  camera.position.set(0,  distance, 0); break;
    case "-z": camera.position.set(0, -distance, 0); break;
    default: return;
  }

  if (axis === "z") camera.up.set(0, 0, -1);
  else if (axis === "-z") camera.up.set(0, 0, 1);
  else camera.up.set(0, 1, 0);

  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
