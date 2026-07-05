import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const fromRoot = (filePath: string) => path.join(root, filePath);
const read = (filePath: string) => readFileSync(fromRoot(filePath), "utf8");

const helperPath = "src/server/apiAuth.ts";
assert.ok(existsSync(fromRoot(helperPath)), "API auth helper should exist");

const helper = read(helperPath);
assert.match(helper, /requireAdmin/, "API auth helper should delegate to requireAdmin");
assert.match(helper, /AdminRedirectError/, "API auth helper should convert admin redirects into API responses");
assert.match(helper, /status:\s*401/, "API auth helper should return 401 for unauthenticated API callers");

for (const routePath of ["app/api/uploads/route.ts", "app/api/translations/route.ts"]) {
  const source = read(routePath);
  assert.match(source, /ensureApiAdmin/, `${routePath} should call ensureApiAdmin`);

  const guardIndex = source.indexOf("ensureApiAdmin");
  const requestReadIndex = Math.min(
    ...["request.formData", "request.json"].map((needle) => {
      const index = source.indexOf(needle);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    }),
  );

  assert.ok(
    guardIndex !== -1 && guardIndex < requestReadIndex,
    `${routePath} should authenticate before reading request payload`,
  );
}

console.log("Admin API auth checks passed");
