/**
 * Parsers for common forensic tool output formats.
 * Used by MCP tool implementations to convert raw CLI output into typed objects.
 */

/**
 * Parse Volatility 3 JSON renderer output.
 * Vol3 with `-r json` produces a JSON array (or object with a "rows" key depending on version).
 */
export function parseVolatility3Json<T>(stdout: string): T[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);

  // Vol3 JSON renderer returns an array directly in most versions
  if (Array.isArray(parsed)) {
    return parsed as T[];
  }

  // Some versions wrap output in { "columns": [...], "rows": [...] }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.rows)) {
    const columns: string[] = parsed.columns ?? [];
    return parsed.rows.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
      }
      return obj as T;
    });
  }

  return [];
}

/**
 * Parse L2tCSV (log2timeline CSV) output from psort.py.
 *
 * L2tCSV format columns (pipe-delimited headers in first line):
 *   date,time,timezone,MACB,source,sourcetype,type,user,host,short,desc,
 *   version,filename,inode,notes,format,extra
 */
export function parseL2tCsv(stdout: string): Record<string, string>[] {
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // First line is the header
  const headers = lines[0].split(",").map((h) => h.trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;

    const entry: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      entry[headers[j]] = values[j];
    }
    results.push(entry);
  }

  return results;
}

/**
 * Simple CSV line parser that handles quoted fields.
 * Handles: "field with, commas","normal field",unquoted
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}
