// src/hooks/usePythonBridge.js
// Connects MeshScriptPanel to real Python via Electron IPC

export async function checkPython() {
  if (!window.electronAPI) return { available: false, version: 'Web mode — JS only' };
  return window.electronAPI.checkPython();
}

export async function runPython(code) {
  if (!window.electronAPI) return { ok: false, stderr: 'Python requires desktop app', stdout: '' };
  return window.electronAPI.runPython(code);
}

// Wraps Python output for the script console
export async function runPythonScript(code, onOutput) {
  onOutput('system', 'Running Python...');
  const result = await runPython(code);
  if (result.stdout) {
    result.stdout.trim().split('\n').forEach(line => onOutput('result', line));
  }
  if (result.stderr) {
    result.stderr.trim().split('\n').forEach(line => onOutput('error', line));
  }
  if (result.ok) {
    onOutput('system', `Python exited OK`);
  } else {
    onOutput('error', `Python exited with code ${result.exitCode}`);
  }
  return result;
}
