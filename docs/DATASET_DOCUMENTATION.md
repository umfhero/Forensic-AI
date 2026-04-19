# Dataset Documentation

Every evidence set that forensic-AI was tested against. Required by hackathon submission component #5.

For each set: source, acquisition method, apparent ground truth, what the agent found, what it missed, and any integrity notes.

---

## Evidence set index

| ID         | Source                         | Type                  | Size    | Ground truth source            | Runs logged |
| ---------- | ------------------------------ | --------------------- | ------- | ------------------------------ | ----------- |
| starter-01 | SANS Protocol SIFT starter kit | disk image + memory   | _TBD_   | SANS write-up                  | 0           |
| starter-02 | SANS Protocol SIFT starter kit | disk image + memory   | _TBD_   | SANS write-up                  | 0           |

Extend this table as additional evidence sets are released during the hackathon.

---

## Per-set detail

### starter-01

- **Source URL:** https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- **Acquisition method:** provided by SANS as a pre-packaged case.
- **SHA-256:** _recorded at ingest; paste from execution log here_
- **Contents:**
  - Disk image: _path and format_
  - Memory image: _path, Volatility profile, size_
  - Network capture (if any): _path, duration_
- **Apparent ground truth** (per the SANS write-up):
  - _e.g. persistence via scheduled task at X_
  - _e.g. credential dumping process Y_
- **What the agent found:**
  - _fill after runs; link execution log entries by `function_call_id`_
- **What the agent missed:**
  - _fill after runs_
- **Integrity:** hash verified at ingest and after every run. Mount confirmed read-only.

### starter-02

- **Source URL:** _same archive, different case_
- **Acquisition method:** SANS.
- **SHA-256:** _TBD_
- **Contents:** _TBD_
- **Apparent ground truth:** _TBD_
- **What the agent found:** _TBD_
- **What the agent missed:** _TBD_
- **Integrity:** _TBD_

---

## Chain of custody

All evidence is mounted read-only; hashes are recorded at ingest and re-verified before every run. Any mismatch halts the run and is logged. The log is the primary chain-of-custody record and is preserved in `case-workspace/logs/` for submission.

## Update log

| Date         | Change                          | By      |
| ------------ | ------------------------------- | ------- |
| 2026-04-19   | Initial template.               | Yasmine |
