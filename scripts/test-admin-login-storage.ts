import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const loginFormPath = path.join(process.cwd(), "app/admin/(public)/login/LoginForm.tsx");
const source = readFileSync(loginFormPath, "utf8");

assert.match(source, /timesTentAdminIdentifier/, "Login form may remember the admin identifier");
assert.doesNotMatch(source, /localStorage\.setItem\("timesTentAdminPassword"/, "Login form must not store admin passwords");
assert.doesNotMatch(source, /setPassword\(savedPassword\)/, "Login form must not hydrate password from localStorage");
assert.doesNotMatch(source, /记住密码/, "Login form must not offer a remember-password control");
assert.match(source, /removeItem\("timesTentAdminPassword"\)/, "Login form should clear legacy saved passwords");
assert.match(source, /autoComplete="current-password"/, "Password input should keep browser-native password manager support");

console.log("Admin login storage checks passed");
