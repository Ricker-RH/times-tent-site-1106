import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const CONFIG_KEY = '产品详情';
const PLACEHOLDER = '产品2';

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) {
      let url = m[1].trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith('\'') && url.endsWith('\''))) {
        url = url.slice(1, -1);
      }
      return url;
    }
  }
  return process.env.DATABASE_URL || '';
}

function isLocalizedRecord(value: any): boolean {
  return value && typeof value === 'object' && !Array.isArray(value) && (
    'zh-CN' in value || 'en' in value || 'zh-TW' in value
  );
}

function sanitizeLocalizedRecord(rec: any): { changed: boolean } {
  if (!isLocalizedRecord(rec)) return { changed: false };
  let changed = false;
  const cn = typeof rec['zh-CN'] === 'string' ? (rec['zh-CN'] as string) : '';
  ['zh-CN', 'en', 'zh-TW'].forEach((loc) => {
    const v = rec[loc];
    if (typeof v === 'string' && v.trim() === PLACEHOLDER) {
      rec[loc] = cn || '';
      changed = true;
    }
  });
  return { changed };
}

function sanitizeValue(value: any): { next: any; changed: boolean } {
  if (value === null || value === undefined) return { next: value, changed: false };
  if (typeof value === 'string') {
    if (value.trim() === PLACEHOLDER) return { next: '', changed: true };
    return { next: value, changed: false };
  }
  if (Array.isArray(value)) {
    let anyChanged = false;
    const next = value.map((item) => {
      const { next: ni, changed } = sanitizeValue(item);
      anyChanged = anyChanged || changed;
      return ni;
    });
    return { next, changed: anyChanged };
  }
  if (typeof value === 'object') {
    // Localized record
    if (isLocalizedRecord(value)) {
      const { changed } = sanitizeLocalizedRecord(value);
      return { next: value, changed };
    }
    // Generic object: sanitize each property
    let anyChanged = false;
    const next: any = Array.isArray(value) ? [] : { ...value };
    for (const key of Object.keys(next)) {
      const { next: nv, changed } = sanitizeValue(next[key]);
      if (changed) anyChanged = true;
      next[key] = nv;
    }
    return { next, changed: anyChanged };
  }
  return { next: value, changed: false };
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query('SELECT key, value FROM site_configs WHERE key = $1', [CONFIG_KEY]);
    if (!res.rows.length) throw new Error(`Config '${CONFIG_KEY}' not found`);
    const value = res.rows[0].value || {};

    let totalChanges = 0;
    const slugs = Object.keys(value || {});
    const report: Array<{ slug: string; changes: number }> = [];

    for (const slug of slugs) {
      const detail = value[slug];
      if (!detail) continue;
      let changes = 0;

      function apply(obj: any, pathLabel: string) {
        const { next, changed } = sanitizeValue(obj);
        if (changed) {
          changes++;
        }
        return next;
      }

      // Title and hero.title are common places for placeholder
      detail.title = apply(detail.title, `${slug}.title`);
      if (detail.hero) {
        detail.hero.title = apply(detail.hero.title, `${slug}.hero.title`);
        detail.hero.description = apply(detail.hero.description, `${slug}.hero.description`);
        detail.hero.scenarios = apply(detail.hero.scenarios, `${slug}.hero.scenarios`);
        detail.hero.badge = apply(detail.hero.badge, `${slug}.hero.badge`);
      }
      // Breadcrumb
      if (Array.isArray(detail.breadcrumb)) {
        detail.breadcrumb = apply(detail.breadcrumb, `${slug}.breadcrumb`);
      }
      // Sections, gallery, cta
      if (Array.isArray(detail.sections)) {
        detail.sections = apply(detail.sections, `${slug}.sections`);
      }
      if (detail.gallery) {
        detail.gallery.alt = apply(detail.gallery.alt, `${slug}.gallery.alt`);
      }
      if (detail.cta) {
        detail.cta.title = apply(detail.cta.title, `${slug}.cta.title`);
        detail.cta.description = apply(detail.cta.description, `${slug}.cta.description`);
        detail.cta.primaryLabel = apply(detail.cta.primaryLabel, `${slug}.cta.primaryLabel`);
        detail.cta.phoneLabel = apply(detail.cta.phoneLabel, `${slug}.cta.phoneLabel`);
      }

      value[slug] = detail;
      if (changes > 0) {
        totalChanges += changes;
        report.push({ slug, changes });
      }
    }

    if (totalChanges > 0) {
      await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CONFIG_KEY, value]);
    }

    console.log(`[Sanitize Completed] total changes: ${totalChanges}`);
    report.forEach((r) => console.log(`- ${r.slug}: ${r.changes} section(s) updated`));

    // Final scan to assert no occurrences remain
    function containsPlaceholder(obj: any): boolean {
      if (obj === null || obj === undefined) return false;
      if (typeof obj === 'string') return obj.trim() === PLACEHOLDER;
      if (Array.isArray(obj)) return obj.some((it) => containsPlaceholder(it));
      if (typeof obj === 'object') return Object.values(obj).some((v) => containsPlaceholder(v));
      return false;
    }

    const slugsWithPlaceholder = slugs.filter((slug) => containsPlaceholder(value[slug]));
    if (slugsWithPlaceholder.length) {
      console.log('Placeholders still present in:', slugsWithPlaceholder);
      process.exitCode = 1;
    } else {
      console.log('No placeholders (产品2) remain in 产品详情 across all slugs.');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});