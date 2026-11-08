import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { challenges, checkDemoCode, type Role } from '../game/data/challenges';

type Props = {
  role: Role;
  onComplete: () => void;
};

type FileName = 'code' | 'test' | 'readme';
type TabName = 'terminal' | 'problems' | 'output';

// VS Code-style mission editor. All UI is HTML/CSS, not an image.
export default function CodeWorkspace({ role, onComplete }: Props) {
  const task = challenges[role];
  const [code, setCode] = useState(task.initialCode);
  const [terminal, setTerminal] = useState(task.initialTerminal);
  const [file, setFile] = useState<FileName>('code');
  const [tab, setTab] = useState<TabName>('terminal');
  const [fullscreen, setFullscreen] = useState(false);
  const [passed, setPassed] = useState(false);

  // Start a new task when the player has a different role.
  useEffect(() => {
    setCode(challenges[role].initialCode);
    setTerminal(challenges[role].initialTerminal);
    setFile('code');
    setTab('terminal');
    setFullscreen(false);
    setPassed(false);
  }, [role]);

  const testName = role === 'frontend'
    ? 'Counter.test.tsx'
    : role === 'backend'
      ? 'inventory.test.js'
      : 'deployment.test.js';

  const testCode = role === 'frontend'
    ? "test('counter should increase by 2', () => {\n  expect(countAfterClick).toBe(2);\n});"
    : role === 'backend'
      ? "test('stock never goes negative', () => {\n  expect(purchase(2, 5)).toBeRejected();\n});"
      : '# Test: /api/health must reach port 8080';

  let filename = task.filename;
  let content = code;
  let language = task.language;

  if (file === 'test') {
    filename = testName;
    content = testCode;
    language = role === 'frontend' ? 'typescript' : 'javascript';
  }
  if (file === 'readme') {
    filename = 'README.md';
    content = '# Mission 01\n\n' + task.description + '\n\nFix the code and press Run Tests.';
    language = 'markdown';
  }

  function runTests() {
    // This is a local simulation. It does not execute player code.
    const success = checkDemoCode(role, code);
    setTab('terminal');
    setPassed(success);

    if (success) {
      setTerminal(
        '$ npm test\nPASS ' + testName +
        '\n  Test passed!\n\nTests: 1 passed, 0 failed' +
        '\n[Local simulation - no real compiler]'
      );
      if (!passed) onComplete();
    } else {
      setTerminal(
        '$ npm test\nFAIL ' + testName +
        '\n  ' + task.description +
        '\n\nHint: ' + task.hint +
        '\n\nTests: 1 failed, 0 passed' +
        '\n[Local simulation - no real compiler]'
      );
    }
  }

  return (
    <section className={'cr-ide' + (fullscreen ? ' cr-ide-fullscreen' : '')}>
      <div className="cr-ide-title">
        <strong><span className="cr-vs-logo">◇</span> CODE RED! — {task.title}</strong>
        <button
          type="button"
          className="cr-fullscreen-btn"
          onClick={() => setFullscreen(!fullscreen)}
          title={fullscreen ? 'Restore size' : 'Fullscreen'}
          aria-label={fullscreen ? 'Restore editor size' : 'Fullscreen editor'}
        >
          {fullscreen ? '⤢' : '⛶'}
        </button>
      </div>

      <div className="cr-ide-body">
        <div className="cr-activity-bar">
          <div title="Explorer">▤</div>
          <div title="Search">⌕</div>
          <div title="Source Control">⑂</div>
          <div title="Run and Debug">▷</div>
          <div className="cr-gear">⚙</div>
        </div>

        <aside className="cr-explorer">
          <div className="cr-explorer-heading">EXPLORER</div>
          <div className="cr-folder">⌄ mission-01/</div>
          <div className="cr-folder cr-subfolder">⌄ src/</div>
          <button type="button" className={file === 'code' ? 'cr-selected' : ''} onClick={() => setFile('code')}>
            {task.filename}
          </button>
          <button type="button" className={file === 'test' ? 'cr-selected' : ''} onClick={() => setFile('test')}>
            {testName}
          </button>
          <button type="button" className={file === 'readme' ? 'cr-selected' : ''} onClick={() => setFile('readme')}>
            README.md
          </button>
        </aside>

        <div className="cr-editor-main">
          <div className="cr-editor-tab">
            <span>{filename}</span>
            {file !== 'code' && <small>READ ONLY</small>}
          </div>

          <div className="cr-monaco-box">
            <Editor
              key={role + '-' + file}
              height="100%"
              width="100%"
              theme="vs-dark"
              language={language}
              value={content}
              onChange={(value) => {
                if (file === 'code') {
                  setCode(value || '');
                  setPassed(false);
                }
              }}
              options={{
                readOnly: file !== 'code',
                fontSize: 16,
                lineHeight: 23,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false
              }}
            />
          </div>

          <div className="cr-terminal-tabs">
            <button type="button" className={tab === 'terminal' ? 'cr-active' : ''} onClick={() => setTab('terminal')}>TERMINAL</button>
            <button type="button" className={tab === 'problems' ? 'cr-active' : ''} onClick={() => setTab('problems')}>PROBLEMS</button>
            <button type="button" className={tab === 'output' ? 'cr-active' : ''} onClick={() => setTab('output')}>OUTPUT</button>
            <button type="button" className="cr-run-btn" onClick={runTests}>▶ Run Tests</button>
          </div>

          <div className="cr-terminal-output">
            {tab === 'terminal' && terminal.split('\n').map((line, i) => {
              let color = '';
              if (line.startsWith('FAIL')) color = 'cr-error';
              if (line.startsWith('PASS')) color = 'cr-success';
              if (line.startsWith('Hint:')) color = 'cr-hint';
              if (line.startsWith('$')) color = 'cr-command';
              return <div key={i} className={color}>{line || '\u00a0'}</div>;
            })}
            {tab === 'problems' && (passed ? 'No simulated problems.' : 'Run Tests to see the current problem.')}
            {tab === 'output' && 'Local demo only. Gemini API is not connected yet.'}
          </div>

          <div className="cr-status-bar">
            <span>CODE RED!</span>
            <span>{filename} · Local simulation</span>
          </div>
        </div>
      </div>
    </section>
  );
}
