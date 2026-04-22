import React from "react";
import "../../styles/spx-tool-panels.css";
import { useSPXEditor } from "../../state/SPXEditorStore";

export default function UndoHistoryPanel() {
  const { history, redoStack, undo, redo } = useSPXEditor();

  return (
    <div className="spx-tool-panel spx-tool-panel--compact">
      <div className="spx-tool-panel__heading">Undo / Redo</div>
      <div className="spx-tool-panel__meta">Undo stack: {history.length}</div>
      <div className="spx-tool-panel__meta">Redo stack: {redoStack.length}</div>
      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={undo}>Undo</button>
        <button className="spx-tool-panel__button" onClick={redo}>Redo</button>
      </div>
      <div className="spx-tool-panel__section">
        {history.slice().reverse().map((item, i) => (
          <div key={i} className="spx-tool-panel__meta">{item.label || "Action"}</div>
        ))}
      </div>
    </div>
  );
}
