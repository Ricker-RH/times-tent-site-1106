import fs from "fs";
import path from "path";
import { Client } from "pg";
import { readUploadDiskCacheIndex, writeUploadDiskCacheRecord } from "../src/lib/uploadDiskCache";

type UploadRow = {
  id: string;
  file_name: string;
  mime_type: string;
  size: number;
  data: Buffer;
};

type Args = {
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
  const all = argv.includes("--all");
  const limitIndex = argv.indexOf("--limit");
  const batchIndex = argv.indexOf("--batch-size");
  const limitValue = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : 100;
  const batchValue = batchIndex >= 0 ? Number(argv[batchIndex + 1]) : 25;
  const limit = all ? null : Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 100;
  const batchSize = Number.isFinite(batchValue) && batchValue > 0 ? Math.min(Math.floor(batchValue), 100) : 25;
  return { limit, batchSize };
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function connectClient(connectionString: string): Promise<Client> {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  client.on("error", (error) => {
    console.warn(`database connection dropped: ${error.message}`);
  });
  await client.connect();
  return client;
}

async function closeClient(client: Client | null): Promise<void> {
  if (!client) return;
  try {
    await client.end();
  } catch {}
}

async function queryUploadBatch(
  client: Client,
  seenIds: string[],
  limit: number,
): Promise<UploadRow[]> {
  const { rows } = await client.query<UploadRow>(
    `
      SELECT id, file_name, mime_type, size, data
      FROM uploads
      WHERE NOT (id = ANY($1::text[]))
      ORDER BY id ASC
      LIMIT $2
    `,
    [seenIds, limit],
  );
  return rows;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = readDatabaseUrl();
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in .env.local or process env");
  }

  let client = await connectClient(connectionString);
  const existingCache = await readUploadDiskCacheIndex();
  const seenIds = Object.keys(existingCache);

  let cached = 0;
  let totalBytes = 0;

  while (args.limit === null || cached < args.limit) {
    const remaining = args.limit === null ? args.batchSize : Math.min(args.batchSize, args.limit - cached);
    if (remaining <= 0) break;

    let rows: UploadRow[];
    try {
      rows = await queryUploadBatch(client, seenIds, remaining);
    } catch (error) {
      console.warn(`query failed, reconnecting: ${error instanceof Error ? error.message : String(error)}`);
      await closeClient(client);
      client = await connectClient(connectionString);
      rows = await queryUploadBatch(client, seenIds, remaining);
    }
    if (!rows.length) break;

    for (const row of rows) {
      seenIds.push(row.id);
      await writeUploadDiskCacheRecord(row.id, {
        fileName: row.file_name,
        mimeType: row.mime_type,
        data: row.data,
      });
      cached += 1;
      totalBytes += row.size;
    }

    console.log(`cached ${cached} uploads (${formatMb(totalBytes)})`);
  }

  await closeClient(client);

  console.log(
    JSON.stringify(
      {
        cached,
        alreadyCached: Object.keys(existingCache).length,
        total: formatMb(totalBytes),
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
