# Weather log verification

Verified against `weather_logs` on 2026-10-22 using the SQLite MCP server.

| City | Rows | Average temperature (°C) |
|---|---:|---:|
| London | 1 | 13.10 |
| Mumbai | 1 | 32.20 |
| Pune | 1 | 30.00 |
| Tokyo | 2 | 15.55 |
| **Total** | **5** | — |

## Findings

- The CLI example cities are present: London (row 2) and Tokyo (row 1; Tokyo
  also has a second observation in row 3). The dashboard workflow's Mumbai
  observation is present (row 4). The app writes both CLI and dashboard
  additions to `weather_logs`.
- The table does not record an insertion source, so the database alone cannot
  independently attribute individual rows to the CLI or web UI. The source
  identification above follows the exercise workflow; all listed rows are
  present in the shared log.
- No null values were found in any of the 11 columns across all 5 rows.
- No duplicate `(city, created_at)` groups were found. The two Tokyo rows have
  distinct timestamps.
