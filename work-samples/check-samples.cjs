'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = __dirname;
const load = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const office = load('office-data-quality/workflow.json');
const receiver = load('webhook-hmac-replay/receiver.json');
const sender = load('webhook-hmac-replay/sender.json');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function run(workflow, name, input) {
  const node = workflow.nodes.find(n => n.name === name);
  assert.ok(node, name);
  return vm.runInNewContext(`(function(){${node.parameters.jsCode}\n})()`, {
    $json: input, Buffer, require: module => {
      assert.equal(module, 'crypto'); return crypto;
    }
  }, { timeout: 1000 });
}
check('Inactive exports, empty pin data, unique node IDs and intact connections', () => {
  for (const workflow of [office, receiver, sender]) {
    assert.equal(workflow.active, false);
    assert.equal(Object.keys(workflow.pinData).length, 0);
    assert.equal(new Set(workflow.nodes.map(n => n.id)).size, workflow.nodes.length);
    const names = new Set(workflow.nodes.map(n => n.name));
    for (const [from, groups] of Object.entries(workflow.connections)) {
      assert.ok(names.has(from));
      for (const outputs of Object.values(groups)) for (const branch of outputs)
        for (const edge of branch) assert.ok(names.has(edge.node));
    }
    for (const node of workflow.nodes) {
      assert.equal(node.credentials, undefined);
      if (node.type === 'n8n-nodes-base.crypto' && node.parameters.action === 'hmac') {
        assert.equal(node.parameters.secret, ''); assert.equal(node.disabled, true);
      }
    }
  }
});
const input = run(office, 'Generate Sample Input', {})[0].json;
const normalized = run(office, 'Normalize and Validate', input)[0].json;
const result = run(office, 'Build Summary and Notification', normalized)[0].json;
check('Six synthetic rows produce five review cases and two possible duplicates', () => {
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.summary.records, 6);
  assert.equal(result.summary.records_with_review, 5);
  assert.equal(result.summary.possible_duplicates, 2);
  assert.equal(result.summary.gross_total, 4229.29);
});
check('Amounts, dates and missing fields retain the expected meaning', () => {
  assert.equal(result.cleaned_rows[0].gross, 1249.9);
  assert.equal(result.cleaned_rows[0].invoice_date, '2026-08-01');
  assert.equal(result.cleaned_rows[0].supplier, 'Example Office GmbH');
  assert.equal(result.cleaned_rows[3].gross, null);
  assert.equal(result.cleaned_rows[4].invoice_date, null);
  assert.equal(result.cleaned_rows[5].invoice_number, '');
});
check('Empty input produces an empty summary without errors', () => {
  const cleaned = run(office, 'Normalize and Validate', { invoices: [] })[0].json;
  const out = run(office, 'Build Summary and Notification', cleaned)[0].json;
  assert.equal(out.summary.records, 0); assert.equal(out.summary.gross_total, 0);
});
const now = Math.floor(Date.now() / 1000);
const signature = crypto.createHmac('sha256', 'synthetic-unit-test-key').update('synthetic body').digest('hex');
function verify({ supplied = signature, computed = signature, ts = now, nonce = 'synthetic-test-nonce-001' } = {}) {
  return run(receiver, 'VERIFY - Signature + Timestamp', {
    headers: { 'x-portfolio-signature': supplied }, computed_signature: computed,
    body: { _ts: ts, _nonce: nonce }
  })[0].json;
}
check('Valid signature, timestamp and nonce pass verification logic', () => {
  assert.equal(verify().security_pass, 1);
});
check('Tampered and malformed signatures fail', () => {
  assert.equal(verify({ supplied: '0'.repeat(64) }).security_pass, 0);
  assert.equal(verify({ supplied: 'bad-signature' }).security_pass, 0);
});
check('Expired and far-future timestamps fail', () => {
  assert.equal(verify({ ts: now - 600 }).security.timestamp_ok, false);
  assert.equal(verify({ ts: now + 600 }).security.timestamp_ok, false);
});
check('Invalid nonce fails verification logic', () => {
  assert.equal(verify({ nonce: 'short' }).security.nonce_ok, false);
});
check('Replay SQL uses parameter binding and conflict handling', () => {
  const query = receiver.nodes.find(n => n.type === 'n8n-nodes-base.postgres').parameters;
  assert.ok(query.query.includes('VALUES ($1, NOW())'));
  assert.ok(query.query.includes('ON CONFLICT (nonce) DO NOTHING'));
  assert.ok(query.options.queryReplacement.includes('security.nonce'));
});
const expected = load('office-data-quality/expected-summary.json');
check('Published summary matches execution of the Code nodes', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(result.summary)), expected.summary);
  assert.equal(result.status, expected.status);
});
console.log(`${checks} checks passed. No n8n, HTTP or PostgreSQL integration was run.`);
