export function pushHistorySafe(editor, entry) {
  if (!editor || typeof editor.pushHistory !== "function") return;
  editor.pushHistory(entry);
}
