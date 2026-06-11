import assert from "node:assert/strict";
import test from "node:test";
import { parseBearerToken } from "@/lib/auth/parse-bearer-token";

test("parseBearerToken returns null for missing header", () => {
    assert.equal(parseBearerToken(null), null);
    assert.equal(parseBearerToken(undefined), null);
    assert.equal(parseBearerToken(""), null);
});

test("parseBearerToken parses Bearer token case-insensitively", () => {
    assert.equal(parseBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
    assert.equal(parseBearerToken("bearer xyz"), "xyz");
});

test("parseBearerToken rejects non-Bearer schemes", () => {
    assert.equal(parseBearerToken("Basic dXNlcjpwYXNz"), null);
    assert.equal(parseBearerToken("Token abc"), null);
});

test("parseBearerToken trims surrounding whitespace", () => {
  assert.equal(parseBearerToken("  Bearer   token123  "), "token123");
});
