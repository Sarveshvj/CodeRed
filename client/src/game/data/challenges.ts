// Small local demo challenges. The backend will validate real multiplayer results later.
    export type Role = 'frontend' | 'backend' | 'devops';

    type Challenge = {
      title: string;
      filename: string;
      language: string;
      description: string;
      initialCode: string;
      initialTerminal: string;
      hint: string;
    };

    export const challenges: Record<Role, Challenge> = {
      frontend: {
        title: 'Fix the Frontend',
        filename: 'Counter.tsx',
        language: 'typescript',
        description: 'Clicking Increase should add 2, but the counter only goes up by 1.',
        initialCode: `import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  function increment() {
    setCount(count + 1);
    setCount(count + 1);
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increase</button>
    </div>
  );
}`,
        initialTerminal: '$ npm test\nFAIL src/Counter.test.tsx\n  ✕ counter should increase by 2\n  Expected: 2\n  Received: 1\n\nHint: React state updates can use a stale value.\nTests: 1 failed, 0 passed',
        hint: 'Try setCount(count + 2), or two functional updater calls.',
      },
      backend: {
        title: 'Fix the Backend',
        filename: 'inventory.js',
        language: 'javascript',
        description: 'Orders must not reduce stock below zero.',
        initialCode: `function purchase(stock, quantity) {
  // Bug: negative stock is allowed
  return stock - quantity;
}

module.exports = { purchase };`,
        initialTerminal: '$ npm test\nFAIL inventory.test.js\n  ✕ rejects a purchase larger than stock\n  Expected: order rejected\n  Received: -3\n\nHint: Validate the requested quantity before subtracting.\nTests: 1 failed, 0 passed',
        hint: 'Add an if statement that rejects quantity > stock.',
      },
      devops: {
        title: 'Fix the Deployment',
        filename: 'nginx.conf',
        language: 'plaintext',
        description: 'The backend listens on port 8080, but the reverse proxy is misconfigured.',
        initialCode: `server {
  listen 80;

  location /api/ {
    proxy_pass http://localhost:3000;
  }
}`,
        initialTerminal: '$ curl /api/health\n502 Bad Gateway\n  connect() failed (111: Connection refused)\n  Upstream port: 3000\n  Backend port: 8080\n\nHint: Check the proxy_pass port.\nTests: 1 failed, 0 passed',
        hint: 'Point proxy_pass at port 8080.',
      },
    };

    // This is a SIMULATED test, not a compiler or AI response.
    export function checkDemoCode(role: Role, code: string): boolean {
      // Ignore comments so that a hint pasted in a comment does not pass.
      const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (role === 'frontend') {
        const oneUpdate = /setCount\s*\(\s*count\s*\+\s*2\s*\)/.test(withoutComments);
        const functionalUpdates = withoutComments.match(/setCount\s*\(\s*(\w+)\s*=>\s*\1\s*\+\s*1\s*\)/g) || [];
        return oneUpdate || functionalUpdates.length >= 2;
      }
      if (role === 'backend') {
        return /if\s*\(\s*(quantity\s*>\s*stock|stock\s*<\s*quantity)\s*\)/.test(withoutComments)
          && /return|throw/.test(withoutComments);
      }
      return /proxy_pass\s+http:\/\/localhost:8080\s*;/.test(withoutComments);
    }
