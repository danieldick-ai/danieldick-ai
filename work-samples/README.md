# Selected n8n work samples

Two small examples selected from existing personal projects. The published exports are sanitized copies; the original workflows are unchanged.

| Sample | Demonstrates | Setup |
| --- | --- | --- |
| [Office data quality](office-data-quality) | Normalization, possible duplicate detection, review summary | Manual run; synthetic input; no credentials |
| [Webhook HMAC and replay protection](webhook-hmac-replay) | Raw-body signature checking, timestamp checks, PostgreSQL nonce guard | Isolated n8n/PostgreSQL test setup; own test secret required |

Run the standalone checks from the repository root with Node.js:

```sh
node work-samples/check-samples.cjs
```

These checks execute selected Code-node logic and validate export structure. They do not replace an n8n import, HTTP integration test or PostgreSQL test. No packages or network access are required for the checks.
