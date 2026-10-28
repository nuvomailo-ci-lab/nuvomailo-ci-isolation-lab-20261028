import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database.mjs";

describe("pool-c", () => {
  it("selects three via shared pool", async () => {
    const r = await pool.query("SELECT 3 AS n");
    assert.equal(r.rows[0].n, 3);
  });
  after(async () => {
    await pool.end();
  });
});
