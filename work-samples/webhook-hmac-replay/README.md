# HMAC webhook and replay protection

**Personal local test project, not a security audit or client deployment.** A receiver checks an HMAC-SHA256 signature over the raw request body, a five-minute timestamp tolerance and a nonce. A PostgreSQL primary key provides an atomic insert/conflict replay check. Response branches are 200, 401 and 409.

## Files

- `receiver.json`: sanitized receiver export.
- `sender.json`: companion test sender, initially configured for the replay scenario.
- `init-replay-guard.sql`: dedicated demo table, separate from the original project's table.

## Setup in an isolated test environment

1. Import both JSON files into n8n. Both workflows are inactive. Both HMAC Crypto nodes are intentionally disabled and their secret fields are empty.
2. Create the table from `init-replay-guard.sql` in a dedicated test PostgreSQL database. Attach your own PostgreSQL credential to the receiver's replay-guard node.
3. Generate your own random test secret, set the same value in the two HMAC Crypto nodes and only then enable those nodes. Never commit that secret or a configured workflow export.
4. The receiver's verification Code node requires Node.js `crypto`. Follow the [official module configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/) for your deployment, including its task runner if applicable. Do not grant access to all modules.
5. Set the sender's URL to the receiver's actual local test/production webhook URL. The included `127.0.0.1` URL is a local example; in Docker it refers to the sender's own container.
6. Activate the configured receiver only within that isolated test setup, then manually run the sender scenarios below. This repository does not configure a public endpoint.

## Test scenarios

| Scenario | Sender configuration | Expected response |
| --- | --- | --- |
| Fresh signed request | Fresh mode, offset 0, tamper false | 200 |
| Invalid signature | Tamper true | 401 |
| Expired timestamp | Fresh mode, offset -600, tamper false | 401 |
| Repeated nonce | Replay mode, same fixed nonce, twice | First 200, then 409 |

## Evidence and limits

The original local project was tested on 27 September 2026 with n8n 2.40.7 and PostgreSQL 18: valid request 200, tampered signature 401, expired timestamp 401 and repeated nonce 409. Its original receiver and sender exports were matched to the recorded SHA-256 values before making these public copies.

On 20 October 2026, the standalone checks executed the sanitized signature/timestamp/nonce verification logic and inspected workflow structure. **The sanitized exports have not been re-imported or tested end to end with n8n/PostgreSQL.** The standalone tests do not exercise the Crypto node, raw-body parsing, HTTP response nodes, database cleanup/concurrency or credential setup.

Sanitization removed credentials, secrets, pinned data and instance/workflow metadata; replaced node IDs, sample labels and the demo table/path; deactivated exports and disabled HMAC nodes until local configuration. The originals are unchanged.

This is a bounded demonstration. It provides no exactly-once processing guarantee, availability commitment or production-readiness claim. Further deployment-specific review is needed before real use.

Reference: [n8n export/import and credential-removal guidance](https://docs.n8n.io/workflows/export-import/).
