import assert from "node:assert/strict";
import test from "node:test";
import {
  createSongSearchService,
  MIN_QUERY_LENGTH,
} from "../src/song-search/song-search-service.js";
import {
  createMusicBrainzProvider,
  normalizeRecording,
  dedupeRecordings,
} from "../src/song-search/musicbrainz-provider.js";

// ── normalizeRecording ──────────────────────────────────────────────────

test("normalizeRecording maps a raw MusicBrainz recording", () => {
  const rec = {
    id: "abc-123",
    title: "La Bikina",
    "artist-credit": [{ name: "Luis Miguel" }],
    "first-release-date": "1987-05-01",
    isrcs: ["MXF018700001"],
  };
  assert.deepEqual(normalizeRecording(rec), {
    title: "La Bikina",
    artist: "Luis Miguel",
    year: 1987,
    externalId: "abc-123",
    source: "musicbrainz",
    isrc: "MXF018700001",
  });
});

test("normalizeRecording tolerates missing optional fields", () => {
  const rec = { id: "x", title: "  Solo  " };
  const out = normalizeRecording(rec);
  assert.equal(out.title, "Solo");
  assert.equal(out.artist, "");
  assert.equal(out.year, undefined);
  assert.equal(out.isrc, undefined);
});

test("normalizeRecording handles missing id", () => {
  const out = normalizeRecording({ title: "Tema" });
  assert.equal(out.externalId, "");
});

// ── dedupeRecordings ────────────────────────────────────────────────────

test("dedupeRecordings collapses same title+artist, preferring ISRC", () => {
  const results = [
    { title: "La Bikina", artist: "Luis Miguel", year: 1987, isrc: undefined },
    { title: "La Bikina", artist: "Luis Miguel", year: 1990, isrc: "MXF018700001" },
  ];
  const out = dedupeRecordings(results);
  assert.equal(out.length, 1);
  assert.equal(out[0].isrc, "MXF018700001");
});

test("dedupeRecordings prefers earliest year when ISRCs match", () => {
  const results = [
    { title: "La Bikina", artist: "Luis Miguel", year: 1990, isrc: "X" },
    { title: "La Bikina", artist: "Luis Miguel", year: 1987, isrc: "X" },
  ];
  const out = dedupeRecordings(results);
  assert.equal(out.length, 1);
  assert.equal(out[0].year, 1987);
});

test("dedupeRecordings keeps distinct songs", () => {
  const results = [
    { title: "La Bikina", artist: "Luis Miguel", year: 1987 },
    { title: "Cielito Lindo", artist: "Mariachi", year: 1950 },
  ];
  assert.equal(dedupeRecordings(results).length, 2);
});

test("dedupeRecordings drops entries without title or artist", () => {
  const results = [
    { title: "", artist: "X", year: 2000 },
    { title: "Tema", artist: "", year: 2000 },
    { title: "Real", artist: "Artist", year: 2000 },
  ];
  assert.equal(dedupeRecordings(results).length, 1);
});

// ── createMusicBrainzProvider ──────────────────────────────────────────

test("provider builds a MusicBrainz URL and normalizes the response", async () => {
  let capturedUrl = null;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({
        recordings: [
          {
            id: "r1",
            title: "La Bikina",
            "artist-credit": [{ name: "Luis Miguel" }],
            "first-release-date": "1987-05-01",
          },
        ],
      }),
    };
  };

  const provider = createMusicBrainzProvider({ fetchImpl });
  const results = await provider.search("bikina");

  assert.ok(capturedUrl.includes("musicbrainz.org/ws/2/recording/"));
  assert.ok(capturedUrl.includes("query=bikina"));
  assert.ok(capturedUrl.includes("fmt=json"));
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "La Bikina");
  assert.equal(results[0].source, "musicbrainz");
});

test("provider throws on non-ok response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 429 });
  const provider = createMusicBrainzProvider({ fetchImpl });
  await assert.rejects(() => provider.search("bikina"), /failed \(429\)/);
});

test("provider passes the abort signal through", async () => {
  let seenSignal = null;
  const fetchImpl = async (_url, opts) => {
    seenSignal = opts.signal;
    return { ok: true, json: async () => ({ recordings: [] }) };
  };
  const provider = createMusicBrainzProvider({ fetchImpl });
  const controller = new AbortController();
  await provider.search("bikina", { signal: controller.signal });
  assert.equal(seenSignal, controller.signal);
});

// ── createSongSearchService ─────────────────────────────────────────────

test("service returns empty for short queries", async () => {
  const service = createSongSearchService({
    provider: { search: async () => { throw new Error("should not be called"); } },
  });
  assert.deepEqual(await service.search("a"), []);
  assert.deepEqual(await service.search(""), []);
  assert.deepEqual(await service.search("   "), []);
});

test("service delegates to the provider and caches results", async () => {
  let calls = 0;
  const provider = {
    search: async () => {
      calls += 1;
      return [{ title: "La Bikina", artist: "Luis Miguel" }];
    },
  };
  const service = createSongSearchService({ provider });

  const first = await service.search("bikina");
  const second = await service.search("bikina");
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(calls, 1, "second identical query should hit the cache");
});

test("service passes the abort signal to the provider", async () => {
  let seenSignal = null;
  const provider = {
    search: async (_q, { signal }) => {
      seenSignal = signal;
      return [];
    },
  };
  const service = createSongSearchService({ provider });
  const controller = new AbortController();
  // Use a unique query so it doesn't hit the shared in-memory cache.
  await service.search("unique-abort-query", { signal: controller.signal });
  assert.equal(seenSignal, controller.signal);
});


test("MIN_QUERY_LENGTH is exported and >= 2", () => {
  assert.equal(typeof MIN_QUERY_LENGTH, "number");
  assert.ok(MIN_QUERY_LENGTH >= 2);
});
