// Validates challenge submissions, tracks progress, and unlocks dependent tasks.
//
// The Mission 01 tasks, as written in shared/mission01.md. The browser shows the same
// starter code (client/src/game/data/challenges.ts). The server keeps its own copy so
// Gemini knows exactly what each player was asked to fix.

import { reviewWithGemini } from './aiReview.js';

export const MAX_CODE_LENGTH = 10_000;

const CHALLENGES = {
  frontend: {
    role: 'frontend',
    filename: 'Counter.tsx',
    testFile: 'Counter.test.tsx',
    language: 'TypeScript (React)',
    task: 'Clicking Increase should add 2, but the counter only goes up by 1. '
      + 'increment() calls setCount(count + 1) twice, and both calls read the same old value.',
    expected: 'Clicking Increase once raises the count by exactly 2 (0 -> 2 -> 4).',
    criteria: [
      'One click of Increase raises count by exactly 2.',
      'Accepted approaches include setCount(count + 2) or two functional updates such as setCount(c => c + 1).',
      'The component still renders the count and the Increase button.',
    ],
    starterCode: `import React, { useState } from 'react';

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
  },

  backend: {
    role: 'backend',
    filename: 'inventory.js',
    testFile: 'inventory.test.js',
    language: 'JavaScript (Node.js)',
    task: 'Orders must not reduce stock below zero. purchase() subtracts quantity from stock without checking it first.',
    expected: 'If quantity is greater than stock, the order is rejected (return early or throw). '
      + 'Otherwise it returns stock - quantity. Buying exactly the remaining stock is allowed and leaves 0.',
    criteria: [
      'An order with quantity greater than stock is rejected by returning early or throwing an error.',
      'The check actually runs before the subtraction; an empty or unreachable check does not count.',
      'Valid orders (quantity <= stock) still return stock - quantity.',
    ],
    starterCode: `function purchase(stock, quantity) {
  // Bug: negative stock is allowed
  return stock - quantity;
}

module.exports = { purchase };`,
  },

  devops: {
    role: 'devops',
    filename: 'nginx.conf',
    testFile: 'deployment.test.js',
    language: 'nginx configuration',
    task: 'The backend listens on port 8080, but the reverse proxy sends /api/ traffic to port 3000, causing 502 Bad Gateway.',
    expected: 'Requests to /api/ are forwarded to http://localhost:8080.',
    criteria: [
      'The /api/ location proxies to http://localhost:8080 with valid nginx syntax (including the semicolon).',
      'No active proxy_pass to port 3000 remains.',
      'Lines commented out with # do not count.',
    ],
    starterCode: `server {
  listen 80;

  location /api/ {
    proxy_pass http://localhost:3000;
  }
}`,
  },
};

// Builds the text shown in the player's terminal panel.
function formatTerminal(challenge, review) {
  const lines = [`$ ai-review ${challenge.filename}`];

  if (review.passed) {
    lines.push(`PASS ${challenge.testFile}`, `  ${review.explanation}`, '', 'Tests: 1 passed, 0 failed');
  } else {
    lines.push(`FAIL ${challenge.testFile}`, `  ${review.explanation}`);
    if (review.hint) lines.push('', `Hint: ${review.hint}`);
    lines.push('', 'Tests: 1 failed, 0 passed');
  }

  lines.push('[Reviewed by Gemini AI - your code was not run]');
  return lines.join('\n');
}

// Reviews one player's code for their role.
// Returns { passed, terminal }. Throws if the AI review isn't available.
export async function reviewSubmission(role, code) {
  const challenge = CHALLENGES[role];
  const review = await reviewWithGemini(challenge, code);
  return { passed: review.passed, terminal: formatTerminal(challenge, review) };
}
