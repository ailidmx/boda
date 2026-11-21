import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGuestCsv,
  buildGuestTable,
  flatCell,
  flattenRecord,
  guestCsvFileName,
} from "../../shared/guest-export.js";

test("nested fields become dotted columns and never [object Object]", () => {
  const flat = flattenRecord({
    identity: { firstName: "Ana", lastName: "Pérez" },
    hosting: { cabin: "Lavanda", room: "2" },
    table: 5,
    travelsByPlane: true,
  });
  assert.equal(flat["identity.firstName"], "Ana");
  assert.equal(flat["hosting.cabin"], "Lavanda");
  assert.equal(flat.table, "5");
  assert.equal(flat.travelsByPlane, "true");
  assert.ok(!JSON.stringify(flat).includes("[object Object]"));
});

test("timestamps and arrays are flattened safely", () => {
  const date = new Date("2026-08-02T17:06:58.000Z");
  const stamp = { toDate: () => date };
  const flat = flattenRecord({
    createdAt: stamp,
    tags: ["a", "b"],
    nested: [{ a: 1 }],
  });
  assert.equal(flat.createdAt, "2026-08-02T17:06:58.000Z");
  assert.equal(flat.tags, "a | b");
  assert.equal(flat.nested, '[{"a":1}]');
  assert.equal(flatCell(null), "");
});

test("the CSV starts with the identity columns and one row per guest", () => {
  const records = [
    { docId: "d1", identity: { firstName: "Ana", lastName: "Pérez" }, table: 5 },
    { docId: "d2", identity: { firstName: "Beto", lastName: "Ruiz" } },
  ];
  const { columns, rows } = buildGuestTable(records);
  assert.equal(rows.length, 2);
  assert.equal(columns[0], "docId");
  assert.equal(columns[1], "identity.firstName");
  assert.equal(columns[2], "identity.lastName");
  assert.equal(rows[0].docId, "d1");
});

test("CSV has a BOM, CRLF and escapes quotes and commas", () => {
  const csv = buildGuestCsv([
    {
      docId: "d1",
      identity: { firstName: 'Ana "Anita"', lastName: "Pérez, Jr." },
      message: "linea 1\nlinea 2",
    },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("\r\n"));
  assert.ok(csv.includes('"Pérez, Jr."'));
  assert.ok(csv.includes('"Ana ""Anita"""'));
  assert.ok(csv.includes('"linea 1\nlinea 2"'));
});

test("rows sort by last name and the file name is timestamped", () => {
  const { rows } = buildGuestTable([
    { docId: "b", identity: { lastName: "Zurita", firstName: "Zoe" } },
    { docId: "a", identity: { lastName: "Ávila", firstName: "Ana" } },
  ]);
  assert.equal(rows[0].docId, "a");
  assert.match(guestCsvFileName(new Date("2026-11-21T01:28:00Z")), /^guests-20261121-0128\.csv$/);
});

test("the doc id wins over a raw id field", () => {
  const { rows } = buildGuestTable([{ docId: "doc-1", id: "raw-9", identity: {} }]);
  assert.equal(rows[0].docId, "doc-1");
  assert.equal(rows[0].id, "raw-9");
});
