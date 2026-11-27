import assert from "node:assert/strict";
import test from "node:test";
import { voiceDemoUrl } from "../src/voice-demo.js";

test("uses the local FastAPI console from a loopback host", () => {
  assert.equal(voiceDemoUrl(undefined, "127.0.0.1"), "http://127.0.0.1:8000/voice-test");
  assert.equal(voiceDemoUrl("", "localhost"), "http://127.0.0.1:8000/voice-test");
});

test("uses the same origin for a hosted showcase", () => {
  assert.equal(voiceDemoUrl(undefined, "vaani.example"), "/voice-test");
});

test("uses a valid configured HTTP(S) URL and ignores malformed settings", () => {
  assert.equal(voiceDemoUrl(" https://voice.example/voice-test ", "localhost"), "https://voice.example/voice-test");
  assert.equal(voiceDemoUrl("invalid", "vaani.example"), "/voice-test");
  assert.equal(voiceDemoUrl("javascript:alert(1)", "vaani.example"), "/voice-test");
});
