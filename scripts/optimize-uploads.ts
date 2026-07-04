import fs from "fs";
import path from "path";
import { Client } from "pg";
import { optimizeUploadedImage } from "../src/lib/imageOptimizationCore";

type UploadRow = {
  id: string;
  file_name: string;
  mime_type: string;
  size: number;
  data: Buffer;
};

type Args = {
  apply: boolean;
  limit: number | null;
  batchSize: number;
};

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let fromFile = "";
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(/^DATABASE_URL=(.+)$/m);
    fromFile = match?.[1]?.trim() ?? "";
  } catch {}

  let value = (process.env.DATABASE_URL || fromFile).trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.charCodeAt(0) === 39 && value.charCodeAt(value.length - 1) === 39)
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const all = argv.includes("--all");
  const limitIndex = argv.indexOf("--limit");
  const batchIndex = argv.indexOf("--batch-size");
  const limitValue = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : 50;
  const batchValue = batchIndex >= 0 ? Number(argv[batchIndex + 1]) : 10;
  const limit = all ? null : Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 50;
  const batchSize = Number.isFinite(batchValue) && batchValue > 0 ? Math.min(Math.floor(batchValue), 25) : 10;
  return { apply, limit, batchSize };
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = readDatabaseUrl();
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in .env.local or process env");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let scanned = 0;
  let optimizedCount = 0;
  let skipped = 0;
  let originalBytes = 0;
  let optimizedBytes = 0;
  const seenIds: string[] = [];

  while (args.limit === null || scanned < args.limit) {
    const remaining = args.limit === null ? args.batchSize : Math.min(args.batchSize, args.limit - scanned);
    if (remaining <= 0) break;

    const { rows } = await client.query<UploadRow>(
      `
        SELECT id, file_name, mime_type, size, data
        FROM uploads
        WHERE mime_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/tiff')
          AND NOT (id = ANY($1::text[]))
        ORDER BY size DESC
        LIMIT $2
      `,
      [seenIds, remaining],
    );
    if (!rows.length) break;

    for (const row of rows) {
      seenIds.push(row.id);
      scanned += 1;
      const result = await optimizeUploadedImage({
        data: row.data,
        fileName: row.file_name,
        mimeType: row.mime_type,
      });

      if (!result.optimized || result.data.length >= row.size) {
        skipped += 1;
        continue;
      }

      optimizedCount += 1;
      originalBytes += row.size;
      optimizedBytes += result.data.length;

      const savedPct = ((1 - result.data.length / row.size) * 100).toFixed(1);
      console.log(
        `${args.apply ? "UPDATE" : "DRY"} ${row.id} ${formatMb(row.size)} -> ${formatMb(result.data.length)} saved ${savedPct}%`,
      );

      if (args.apply) {
        await client.query(
          `
            UPDATE uploads
            SET file_name = $2,
                mime_type = $3,
                size = $4,
                data = $5
            WHERE id = $1
          `,
          [row.id, result.fileName, result.mimeType, result.data.length, result.data],
        );
      }
    }
  }

  await client.end();

  const savedBytes = originalBytes - optimizedBytes;
  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        scanned,
        optimized: optimizedCount,
        skipped,
        original: formatMb(originalBytes),
        optimizedSize: formatMb(optimizedBytes),
        saved: formatMb(savedBytes),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
