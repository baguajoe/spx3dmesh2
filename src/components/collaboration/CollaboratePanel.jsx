import React, { useState, useRef } from "react";
import {
  createCollabSession, connectSession, disconnectSession,
  createUser, broadcastOperation, getCollabStats,
  createVersionSnapshot, createCommentPin,
} from "../../mesh/CollaborationSystem.js";

export default function CollaboratePanel({ open, onClose, sceneRef, setStatus }) {
  const sessionRef = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [sessionId,  setSessionId]  = useState("");
  const [userName,   setUserName]   = useState("User_" + Math.random().toString(36).slice(2,6));
  const [log,        setLog]        = useState(["Session log will appear here..."]);
  const [stats,      setStats]      = useState(null);
  const [snapshots,  setSnapshots]  = useState([]);
  const [comment,    setComment]    = useState("");

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
    broadcastOperation(sessionRef.current, pin);
    addLog(userName + ": " + comment);
    setComment("");
  };

  if (!open) return null;
  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-panel" onClick={e => e.stopPropagation()}>
        <div className="cp-header">
          <span className="cp-logo">SPX</span>
          <strong className="cp-title">Collaborate</strong>
          <span className={`cp-chip${connected ? " cp-chip--live" : " cp-chip--off"}`}>
            {connected ? "● Live" : "○ Offline"}
          </span>
          <button className="cp-close" onClick={onClose}>✕</button>
        </div>

        <div className="cp-body">
          <div>
            <div className="cp-label">Your Name</div>
            <input className="cp-input" value={userName}
              onChange={e => setUserName(e.target.value)} disabled={connected} />
          </div>

          <div>
            <div className="cp-label">Session</div>
            {!connected ? (
              <div className="cp-row">
                <button className="cp-btn cp-btn--green" onClick={startSession}>🔗 Start Session</button>
                <input className="cp-input cp-input--flex" placeholder="Session ID to join"
                  value={sessionId} onChange={e => setSessionId(e.target.value.toUpperCase())} />
                <button className="cp-btn" onClick={joinSession}>Join</button>
              </div>
            ) : (
              <div className="cp-session-active">
                <div className="cp-row">
                  <span className="cp-session-id">{sessionId}</span>
                  <button className="cp-btn" onClick={copySessionId}>📋 Copy ID</button>
                </div>
                <button className="cp-btn cp-btn--red" onClick={endSession}>✕ End Session</button>
              </div>
            )}
          </div>

          {connected && (
            <div>
              <div className="cp-label">Comment Pin</div>
              <div className="cp-row">
                <input className="cp-input cp-input--flex" placeholder="Leave a comment..."
                  value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendComment()} />
                <button className="cp-btn" onClick={sendComment}>Send</button>
              </div>
            </div>
          )}

          <div>
            <div className="cp-label">Version Snapshots ({snapshots.length})</div>
            <button className="cp-btn" onClick={takeSnapshot}>📸 Save Snapshot</button>
            {snapshots.slice(-3).reverse().map((snap, i) => (
              <div key={i} className="cp-snapshot">
                {snap.message}
                <span className="cp-snapshot__time">{new Date(snap.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="cp-label">Session Log</div>
            <div className="cp-log">{log.map((l,i) => <div key={i}>{l}</div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
