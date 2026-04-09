import * as THREE from "three";

// ── User presence ─────────────────────────────────────────────────────────────
export function createUser(options = {}) {
  return {
    id:       options.id       || crypto.randomUUID(),
    name:     options.name     || "User_" + Math.floor(Math.random()*1000),
    color:    options.color    || "#" + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0"),
    cursor:   new THREE.Vector3(),
    selectedObjectId: null,
    lastSeen: Date.now(),
    online:   true,
  };
}

// ── Comment pin ───────────────────────────────────────────────────────────────
export function createCommentPin(position, text, author) {
  return {
    id:        crypto.randomUUID(),
    position:  position.clone(),
    text,
    author,
    created:   Date.now(),
    resolved:  false,
    replies:   [],
    color:     "#ffaa00",
  };
}

// ── Version snapshot ──────────────────────────────────────────────────────────
export function createVersionSnapshot(sceneObjects, message = "") {
  return {
    id:        crypto.randomUUID(),
    timestamp: Date.now(),
    message:   message || "Snapshot " + new Date().toLocaleTimeString(),
    objects:   sceneObjects.map(obj => ({
      id:       obj.id,
      name:     obj.name,
      position: obj.mesh?.position.toArray() || [0,0,0],
      rotation: obj.mesh ? [obj.mesh.rotation.x,obj.mesh.rotation.y,obj.mesh.rotation.z] : [0,0,0],
      scale:    obj.mesh?.scale.toArray()    || [1,1,1],
      visible:  obj.visible,
    })),
    author:    "User",
  };
}

// ── Restore version ───────────────────────────────────────────────────────────
export function restoreVersion(snapshot, sceneObjects) {
  snapshot.objects.forEach(saved => {
    const obj = sceneObjects.find(o => o.id === saved.id);
    if (!obj?.mesh) return;
    obj.mesh.position.fromArray(saved.position);
    obj.mesh.rotation.set(...saved.rotation);
    obj.mesh.scale.fromArray(saved.scale);
    obj.visible = saved.visible;
    obj.mesh.visible = saved.visible;
  });
}

// ── Conflict resolution ───────────────────────────────────────────────────────
export function resolveConflict(localOp, remoteOp, strategy = "last-write-wins") {
  if (strategy === "last-write-wins") {
    return localOp.timestamp > remoteOp.timestamp ? localOp : remoteOp;
  }
  if (strategy === "merge") {
    return { ...localOp, ...remoteOp, timestamp: Date.now() };
  }
  return remoteOp; // remote wins
}

// ── Operation log ─────────────────────────────────────────────────────────────
export function createOperation(type, data, userId) {
  return {
    id:        crypto.randomUUID(),
    type,      // "move" | "rotate" | "scale" | "add" | "delete" | "material"
    data,
    userId,
    timestamp: Date.now(),
    applied:   false,
  };
}

// ── Apply operation ───────────────────────────────────────────────────────────
export function applyOperation(op, sceneObjects) {
  const obj = sceneObjects.find(o => o.id === op.data.objectId);
  if (!obj?.mesh) return false;
  switch (op.type) {
    case "move":
      obj.mesh.position.fromArray(op.data.position);
      break;
    case "rotate":
      obj.mesh.rotation.set(...op.data.rotation);
      break;
    case "scale":
      obj.mesh.scale.fromArray(op.data.scale);
      break;
    case "visible":
      obj.mesh.visible = op.data.visible;
      obj.visible = op.data.visible;
      break;
  }
  op.applied = true;
  return true;
}

// ── Collaboration session ─────────────────────────────────────────────────────
export function createCollabSession(options = {}) {
  return {
    id:          options.id    || crypto.randomUUID(),
    name:        options.name  || "Session_" + Date.now(),
    users:       [],
    localUser:   createUser({ name: options.userName || "You" }),
    operations:  [],
    comments:    [],
    versions:    [],
    maxVersions: 50,
    connected:   false,
    wsUrl:       options.wsUrl || null,
    ws:          null,
  };
}

// ── Simulate WebSocket connection (mock for browser) ─────────────────────────
export function connectSession(session, onMessage) {
  // In real impl, connect to WebSocket server
  // For now, simulate local multi-tab via BroadcastChannel
  try {
    const channel = new BroadcastChannel("spx-collab-" + session.id);
    session.channel = channel;
    session.connected = true;

    channel.onmessage = (e) => {
      const msg = e.data;
      if (msg.userId === session.localUser.id) return; // skip own messages
      onMessage?.(msg);
    };

    // Announce presence
    channel.postMessage({ type:"join", userId:session.localUser.id, user:session.localUser });
    return channel;
  } catch(e) {
    console.warn("BroadcastChannel not available:", e);
    session.connected = false;
    return null;
  }
}

// ── Broadcast operation ───────────────────────────────────────────────────────
export function broadcastOperation(session, op) {
  session.operations.push(op);
  session.channel?.postMessage({ type:"operation", op, userId:session.localUser.id });
}

// ── Broadcast comment ─────────────────────────────────────────────────────────
export function broadcastComment(session, comment) {
  session.comments.push(comment);
  session.channel?.postMessage({ type:"comment", comment, userId:session.localUser.id });
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export function disconnectSession(session) {
  session.channel?.postMessage({ type:"leave", userId:session.localUser.id });
  session.channel?.close();
  session.connected = false;
}

// ── Build comment pin mesh ────────────────────────────────────────────────────
export function buildCommentPinMesh(pin, scene) {
  const geo  = new THREE.SphereGeometry(0.08, 8, 8);
  const mat  = new THREE.MeshBasicMaterial({ color: pin.resolved ? "#888888" : "#ffaa00" });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pin.position);
  mesh.name  = "CommentPin_" + pin.id;
  mesh.userData.pinId = pin.id;
  scene.add(mesh);
  return mesh;
}

// ── Get collab stats ──────────────────────────────────────────────────────────
export function getCollabStats(session) {
  return {
    users:      session.users.length + 1,
    operations: session.operations.length,
    comments:   session.comments.length,
    versions:   session.versions.length,
    connected:  session.connected,
  };
}
