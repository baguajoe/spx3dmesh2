import React, { useState } from "react";
import { WORKSPACE_TREE } from "./workspaceMap";

export default function FeatureIndexPanel({ activeWorkspace, onApplyFunction }) {
  const [openFolders, setOpenFolders] = useState({});
  const folders = WORKSPACE_TREE[activeWorkspace] || [];

  const toggle = (folder) =>
    setOpenFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));

  return (
    <div className="fip-root">
      <div className="fip-header">
        <span className="fip-title">{activeWorkspace}</span>
        <span className="fip-count">
          {folders.reduce((n, f) => n + f.items.length, 0)} tools
        </span>
      </div>

      <div className="fip-body">
        {folders.map((group) => {
          const isOpen = openFolders[group.folder] !== false; // default open
          return (
            <div key={group.folder} className="fip-group">
              <button
                className={`fip-folder ${isOpen ? "fip-folder--open" : ""}`}
                onClick={() => toggle(group.folder)}
              >
                <span className="fip-folder-arrow">{isOpen ? "▾" : "▸"}</span>
                <span className="fip-folder-name">{group.folder}</span>
                <span className="fip-folder-count">{group.items.length}</span>
              </button>

              {isOpen && (
                <div className="fip-items">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className="fip-item"
                      onClick={() => onApplyFunction?.(item.id)}
                      title={item.system}
                    >
                      <span className="fip-item-dot" />
                      <span className="fip-item-label">{item.label}</span>
                      <span className="fip-item-system">{item.system}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
