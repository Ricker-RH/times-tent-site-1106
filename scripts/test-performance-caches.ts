import assert from "assert";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

import { TimedSiteConfigCache } from "../src/lib/siteConfigCache";
import {
  readUploadDiskCacheRecord,
  writeUploadDiskCacheRecord,
} from "../src/lib/uploadDiskCache";

async function testUploadDiskCache() {
  const root = await mkdtemp(path.join(os.tmpdir(), "times-upload-cache-"));
  try {
    const data = Buffer.from("cached image bytes");
    await writeUploadDiskCacheRecord(
      "../../unsafe-id",
      {
        fileName: "source.jpg",
        mimeType: "image/webp",
        data,
      },
      root,
    );

    const cached = await readUploadDiskCacheRecord("../../unsafe-id", root);
    assert(cached, "expected upload disk cache hit");
    assert.equal(cached.mimeType, "image/webp");
    assert.deepEqual(cached.data, data);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function testTimedSiteConfigCache() {
  const cache = new TimedSiteConfigCache(1_000);

  assert.deepEqual(cache.get("产品中心", 1_000), { hit: false });

  cache.set("产品中心", { products: [] }, 1_000);
  assert.deepEqual(cache.get("产品中心", 1_999), {
    hit: true,
    value: { products: [] },
  });
  assert.deepEqual(cache.get("产品中心", 2_001), { hit: false });

  cache.set("产品中心", null, 3_000);
  assert.deepEqual(cache.get("产品中心", 3_100), { hit: true, value: null });

  cache.delete("产品中心");
  assert.deepEqual(cache.get("产品中心", 3_100), { hit: false });
}

async function main() {
  await testUploadDiskCache();
  testTimedSiteConfigCache();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
