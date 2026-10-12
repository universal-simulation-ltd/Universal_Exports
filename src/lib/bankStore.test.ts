import { describe, it, expect, beforeEach, vi } from "vitest";

// A stand-in for exports_bank_accounts: rows in memory, and a log of writes.
const db: { rows: Record<string, string>[]; writes: string[] } = { rows: [], writes: [] };
const session = { user: { id: "user-1" } as { id: string } | null };

vi.mock("./supabase", () => {
  const from = () => ({
    select: async () => ({ data: db.rows, error: null }),
    delete: () => {
      db.writes.push("delete");
      // Filters build up; the delete runs when the query is awaited.
      const where: [string, string][] = [];
      const q = {
        eq: (col: string, val: string) => { where.push([col, val]); return q; },
        then: (resolve: (v: { error: null }) => void) => {
          db.rows = db.rows.filter((r) => !where.every(([c, v]) => r[c] === v));
          resolve({ error: null });
        },
      };
      return q;
    },
    insert: async (rows: Record<string, string>[]) => {
      db.writes.push("insert");
      db.rows.push(...rows);
      return { error: null };
    },
  });
  return {
    supabase: {
      from,
      auth: { getSession: async () => ({ data: { session: session.user ? { user: session.user } : null } }) },
    },
  };
});

import { loadBanks, saveBanks, setBankCloudSync, removeCloudBanks, emptyBankAccount } from "./bankStore";

const gbp = { ...emptyBankAccount("GBP"), accountName: "Acme Ltd", sortCode: "20-00-00", accountNumber: "12345678" };

beforeEach(() => {
  localStorage.clear();
  db.rows = [];
  db.writes = [];
  session.user = { id: "user-1" };
});

describe("bank details", () => {
  it("stay on this device by default — nothing is written to the account", async () => {
    const loaded = await loadBanks();
    expect(loaded.cloudSync).toBe(false);
    await saveBanks("your", { GBP: gbp });
    expect(db.writes).toEqual([]);
    const again = await loadBanks();
    expect(again.your.GBP.accountNumber).toBe("12345678");
    expect(again.cloudSync).toBe(false);
  });

  it("keep loading from the account for anyone who saved them there before the choice existed", async () => {
    db.rows = [{ user_id: "user-1", type: "your", key: "GBP", account_name: "Acme Ltd", account_number: "999", currency: "GBP" }];
    const loaded = await loadBanks();
    expect(loaded.cloudSync).toBe(true);
    expect(loaded.your.GBP.accountNumber).toBe("999");
    await saveBanks("your", { GBP: { ...gbp, accountNumber: "111" } });
    expect(db.writes).toContain("insert");
  });

  it("stop syncing when unticked, and keep the account copy until it is removed on purpose", async () => {
    db.rows = [{ user_id: "user-1", type: "your", key: "GBP", account_name: "Acme Ltd", account_number: "999", currency: "GBP" }];
    const loaded = await loadBanks();
    await setBankCloudSync(false, { your: loaded.your, party: loaded.party });
    db.writes = [];
    await saveBanks("your", { GBP: { ...gbp, accountNumber: "222" } });
    expect(db.writes).toEqual([]);
    const after = await loadBanks();
    expect(after.cloudSync).toBe(false);
    expect(after.cloudCopy).toBe(true);
    expect(after.your.GBP.accountNumber).toBe("222");
    expect(await removeCloudBanks()).toBe(true);
    expect(db.rows).toEqual([]);
  });

  it("are not kept at all when signed out", async () => {
    session.user = null;
    await saveBanks("your", { GBP: gbp });
    const loaded = await loadBanks();
    expect(loaded.signedIn).toBe(false);
    expect(loaded.your).toEqual({});
    expect(db.writes).toEqual([]);
  });
});
