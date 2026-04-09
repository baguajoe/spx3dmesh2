
import React, { useState, useRef } from "react";
import {
  createCollabSession, connectSession, disconnectSession,
  createUser, broadcastOperation, getCollabStats,
  createVersionSnapshot, createCommentPin,
} from "../../mesh/CollaborationSystem.js";

const s = {
  overlay: { position:"fixed",inset:0,zIndex:8700,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"stretch",justifyContent:"flex-end" },
  panel: { width:380,background:"#0d1117",borderLeft:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden" },
  header: { display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid #21262d",flexShrink:0 },
  logo: { background:"#00ffc8",color:"#000",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:4 },
  body: { flex:1,overflow:"auto",padding:14,display:"flex",flexDirection:"column",gap:14 },
  label: { fontSize:10,color:"#6b7280",letterSpacing:1,textTransform:"uppercase",marginBottom:4 },
  btn: { padding:"6px 14px",borderRadius:6,border:"1px solid #21262d",background:"#1a1a2e",color:"#e0e0e0",cursor:"pointer",fontSize:12 },
  btnGreen: { padding:"6px 14px",borderRadius:6,border:"1px solid #00ffc8",background:"rgba(0,255,200,0.1)",color:"#00ffc8",cursor:"pointer",fontSize:12 },
  btnRed: { padding:"6px 14px",borderRadius:6,border:"1px solid #ef4444",background:"rgba(239,68,68,0.1)",color:"#ef4444",cursor:"pointer",fontSize:12 },
  input: { width:"100%",background:"#0d1117",border:"1px solid #21262d",borderRadius:6,color:"#e0e0e0",padding:"6px 10px",fontSize:12,boxSizing:"border-box" },
  row: { display:"flex",gap:6,flexWrap:"wrap" },
  chip: { padding:"3px 8px",borderRadius:20,fontSize:11,background:"rgba(0,255,200,0.1)",color:"#00ffc8",border:"1px solid rgba(0,255,200,0.2)" },
  chipOff: { padding:"3px 8px",borderRadius:20,fontSize:11,background:"rgba(107,114,128,0.1)",color:"#6b7280",border:"1px solid #21262d" },
  log: { background:"#06060f",border:"1px solid #21262d",borderRadius:6,padding:10,fontSize:11,color:"#6b7280",maxHeight:140,overflow:"auto",fontFamily:"monospace" },
  close: { marginLeft:"auto",padding:"4px 10px",border:"1px solid #21262d",borderRadius:6,background:"transparent",color:"#6b7280",cursor:"pointer" },
};

export default function CollaboratePanel({ open, onClose, sceneRef, setStatus }) {
  const sessionRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [userName, setUserName] = useState("User_" + Math.random().toString(36).slice(2,6));
  const [log, setLog] = useState(["Session log will appear here..."]);
  const [stats, setStats] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [comment, setComment] = useState("");

  const addLog = (msg) => setLog(prev => [...prev.slice(-20), msg]);

  const startSession = () => {
    const id = "spx-" + Math.random().toString(36).slice(2,8).toUpperCase();
    setSessionId(id);
    const session = createCollabSession({ id, userId: userName });
    connectSession(session, (msg) => {
      addLog("[" + new Date().toLocaleTimeString() + "] " + JSON.stringify(msg).slice(0, 80));
    });
    sessionRef.current = session;
    setConnected(true);
    setStatus("Collaboration session started: " + id);
    addLog("Session started: " + id);
    addLog("Share this ID with collaborators");
  };

  const joinSession = () => {
    if (!sessionId) return;
    const session = createCollabSession({ id: sessionId, userId: userName });
    connectSession(session, (msg) => {
      addLog("[" + new Date().toLocaleTimeString() + "] " + JSON.stringify(msg).slice(0, 80));
    });
    sessionRef.current = session;
    setConnected(true);
    setStatus("Joined session: " + sessionId);
    addLog("Joined session: " + sessionId);
  };

  const endSession = () => {
    if (sessionRef.current) disconnectSession(sessionRef.current);
    sessionRef.current = null;
    setConnected(false);
    setStatus("Session ended");
    addLog("Session disconnected");
  };

  const takeSnapshot = () => {
    const snap = createVersionSnapshot([], "Snapshot " + (snapshots.length + 1));
    setSnapshots(prev => [...prev, snap]);
    addLog("Snapshot saved: " + snap.message);
    setStatus("Version snapshot saved");
  };

  const copySessionId = () => {
    navigator.clipboard?.writeText(sessionId);
    addLog("Session ID copied to clipboard");
  };

  const sendComment = () => {
    if (!comment || !sessionRef.current) return;
    const pin = createCommentPin({x:0,y:0,z:0}, comment, userName);
    broadcastComment(sessionRef.current, pin);
    addLog(userName + ": " + comment);
    setComment("");
  };

  if (!open) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.logo}>SPX</span>
          <strong style={{color:"#e0e0e0"}}>Collaborate</strong>
          <span style={{...s.chip, ...(connected?{}:s.chipOff)}}>{connected ? "● Live" : "○ Offline"}</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>
          {/* Identity */}
          <div>
            <div style={s.label}>Your Name</div>
            <input style={s.input} value={userName} onChange={e => setUserName(e.target.value)} disabled={connected} />
          </div>

          {/* Session */}
          <div>
            <div style={s.label}>Session</div>
            {!connected ? (
              <div style={s.row}>
                <button style={s.btnGreen} onClick={startSession}>🔗 Start Session</button>
                <input style={{...s.input, flex:1}} placeholder="Session ID to join" value={sessionId}
                  onChange={e => setSessionId(e.target.value.toUpperCase())} />
                <button style={s.btn} onClick={joinSession}>Join</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={s.row}>
                  <span style={{...s.chip, fontFamily:"monospace",fontSize:13}}>{sessionId}</span>
                  <button style={s.btn} onClick={copySessionId}>📋 Copy ID</button>
                </div>
                <button style={s.btnRed} onClick={endSession}>✕ End Session</button>
              </div>
            )}
          </div>

          {/* Comments */}
          {connected && (
            <div>
              <div style={s.label}>Comment Pin</div>
              <div style={s.row}>
                <input style={{...s.input,flex:1}} placeholder="Leave a comment..." value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendComment()} />
                <button style={s.btn} onClick={sendComment}>Send</button>
              </div>
            </div>
          )}

          {/* Snapshots */}
          <div>
            <div style={s.label}>Version Snapshots ({snapshots.length})</div>
            <button style={s.btn} onClick={takeSnapshot}>📸 Save Snapshot</button>
            {snapshots.slice(-3).reverse().map((snap, i) => (
              <div key={i} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #21262d",marginTop:4,fontSize:11,color:"#aaa"}}>
                {snap.message} <span style={{color:"#6b7280",marginLeft:8}}>{new Date(snap.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>

          {/* Log */}
          <div>
            <div style={s.label}>Session Log</div>
            <div style={s.log}>{log.map((l,i) => <div key={i}>{l}</div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
