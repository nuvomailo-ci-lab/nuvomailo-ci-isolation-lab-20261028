import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database.mjs";

describe("pool-b", () => {
  it("selects two via shared pool", async () => {
    const r = await pool.query("SELECT 2 AS n");
    assert.equal(r.rows[0].n, 2);
  });
  after(async () => {
    await pool.end();
  });
});
