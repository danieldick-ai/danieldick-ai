# Office data quality

**Personal training sample.** A credential-free n8n workflow that turns six synthetic invoice rows into normalized records and a human-review summary. No email is sent and no business system is updated.

## Files and use

- `workflow.json`: import into an isolated n8n workspace and run the Manual Trigger.
- The `Generate Sample Input` node supplies fictional Example-company records.
- `Normalize and Validate` normalizes amounts, date formats, invoice numbers, terms, cost centers and statuses; it marks possible duplicates and missing/invalid fields.
- `Build Summary and Notification` creates an output object and a notification text, without sending it.

## Checked output

The standalone checks on 20 October 2026 executed all three Code nodes from this sanitized export:

- 6 records; 5 requiring review; 2 rows marked as possible duplicates.
- `1.249,90 EUR`-style input normalizes to `1249.90`.
- Invalid amount, missing date and missing invoice number remain review cases.
- The gross total is `4229.29`, **including duplicate rows**. It is a diagnostic sum, not a payable amount.

See `expected-summary.json` and run `node work-samples/check-samples.cjs` from the repository root.

## Limits

This is a format-normalization demo, not accounting software. Duplicate detection uses invoice number plus amount and can flag different suppliers. Date parsing does not fully reject impossible calendar dates. The summary flags review cases rather than blocking an external action; no such action is connected. Human review is required before downstream use. A fresh import/run of this sanitized version in n8n has not been performed during publication.
