#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'

for rel_path, func_name in [
    ('src/components/panels/AnimGraphPanel.jsx', 'AnimGraphPanel'),
    ('src/components/panels/MeshScriptPanel.jsx', 'MeshScriptPanel'),
]:
    path = os.path.join(ROOT, rel_path)
    src  = open(path).read()

    if '</WithViewport>' in src:
        print(f'✓ {func_name}: already wrapped')
        continue

    # Find the return ( in the main component function
    # AnimGraph has: return ( \n    <div className="ms-overlay"
    # MeshScript has a different pattern
    # Strategy: find the last `return (` in the file (the component's return)
    # and wrap its first JSX child

    lines = src.split('\n')
    return_idx = None
    for i in range(len(lines)-1, -1, -1):
        stripped = lines[i].strip()
        if stripped == 'return (' or stripped.startswith('return ('):
            return_idx = i
            break

    if return_idx is None:
        print(f'⚠ {func_name}: no return ( found')
        continue

    # Find the first JSX line after return (
    first_jsx_idx = None
    for i in range(return_idx + 1, min(return_idx + 5, len(lines))):
        if lines[i].strip().startswith('<'):
            first_jsx_idx = i
            break

    if first_jsx_idx is None:
        print(f'⚠ {func_name}: no JSX after return (')
        continue

    indent = len(lines[first_jsx_idx]) - len(lines[first_jsx_idx].lstrip())
    pad = ' ' * indent

    # Find closing ); of the return block (last ); in file)
    close_idx = None
    for i in range(len(lines)-1, return_idx, -1):
        if lines[i].strip() in (');', ');'):
            close_idx = i
            break

    if close_idx is None:
        print(f'⚠ {func_name}: no closing ); found')
        continue

    # Insert <WithViewport> after return ( line
    lines.insert(first_jsx_idx, pad + '<WithViewport rendererRef={rendererRef} open={open}>')

    # Insert </WithViewport> before closing );
    # Adjust index since we inserted a line
    close_idx += 1
    lines.insert(close_idx, pad + '</WithViewport>')

    open(path, 'w').write('\n'.join(lines))
    print(f'✓ {func_name}: WithViewport wrapper added at line {first_jsx_idx}')

print('\nRun: git add -A && git commit -m "fix: AnimGraph+MeshScript WithViewport wrapper" && git push')
