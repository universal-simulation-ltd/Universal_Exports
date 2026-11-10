import { describe, it, expect, beforeEach, vi } from "vitest";

// Projects and contacts drafted signed out stay in this browser, then move
// into the account at the first sign-in (drafting needs no account, 2026-11-10).
const db: Record<string, Record<string, unknown>[]> = {};
const session = { user: null as { id: string } | null };

vi.mock("./supabase", () => {
  const table = (name: string) => (db[name] ??= []);
  const from = (name: string) => ({
    upsert: async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      for (const r of [rows].flat()) {
        const t = table(name);
        const i = t.findIndex((x) => (r.id !== undefined ? x.id === r.id : x.user_id === r.user_id));
        if (i >= 0) t[i] = r;
        else t.push(r);
      }
      return { error: null };
    },
    insert: async (rows: Record<string, unknown>[]) => {
      table(name).push(...rows.map((r, n) => ({ id: `row-${n}`, created_at: "", ...r })));
      return { error: null };
    },
    select: () => {
      const q = {
        order: async () => ({ data: table(name), error: null }),
        eq: () => q,
        single: async () => ({ data: table(name)[0] ?? null, error: table(name)[0] ? null : { message: "none" } }),
        maybeSingle: async () => ({ data: table(name)[0] ?? null, error: null }),
      };
      return q;
    },
    delete: () => ({ eq: async () => ({ error: null }) }),
  });
  return {
    supabase: {
      from,
      auth: {
        getSession: async () => ({ data: { session: session.user ? { user: session.user } : null } }),
        getUser: async () => ({ data: { user: session.user } }),
      },
    },
  };
});

import { loadProjects, saveProject, deleteProject, type ProjectData } from "./projectStore";
import { loadContacts, loadYourDetails, saveContact, saveYourDetails, emptyDetails } from "./contactStore";

const project = (id: string, name: string): ProjectData => ({
  id, name, createdAt: "2026-11-10T00:00:00Z", role: "seller", forms: { transaction: { drawer: "Acme" } },
  lockedSections: [], savedSections: ["transaction"], eboxyGenerated: false,
});

beforeEach(() => {
  localStorage.clear();
  for (const k of Object.keys(db)) delete db[k];
  session.user = null;
});

describe("signed out", () => {
  it("saves projects in this browser, newest first, and deletes them there", async () => {
    await saveProject(project("a", "First"));
    await saveProject(project("b", "Second"));
    await saveProject({ ...project("a", "First, renamed") });
    expect((await loadProjects()).map((p) => p.name)).toEqual(["First, renamed", "Second"]);
    await deleteProject("b");
    expect((await loadProjects()).map((p) => p.id)).toEqual(["a"]);
    expect(db.exports_projects).toBeUndefined();
  });

  it("keeps your details and contacts in this browser", async () => {
    await saveYourDetails({ ...emptyDetails(), registeredName: "Acme Ltd" });
    await saveContact({ ...emptyDetails(), registeredName: "Buyer GmbH" });
    expect((await loadYourDetails()).registeredName).toBe("Acme Ltd");
    const contacts = await loadContacts();
    expect(contacts.map((c) => c.registeredName)).toEqual(["Buyer GmbH"]);
    await saveContact({ ...contacts[0], telephone: "123" });
    expect((await loadContacts())[0].telephone).toBe("123");
  });
});

describe("the first sign-in", () => {
  it("moves this browser's projects into the account and out of the browser", async () => {
    await saveProject(project("a", "Drafted signed out"));
    session.user = { id: "user-1" };
    const list = await loadProjects();
    expect(list.map((p) => p.name)).toEqual(["Drafted signed out"]);
    expect(db.exports_projects[0].user_id).toBe("user-1");
    session.user = null;
    expect(await loadProjects()).toEqual([]);
  });

  it("moves contacts, and your details only into an account that has none", async () => {
    await saveYourDetails({ ...emptyDetails(), registeredName: "Browser Ltd" });
    await saveContact({ ...emptyDetails(), registeredName: "Buyer GmbH" });
    db.exports_your_details = [{ user_id: "user-1", registered_name: "Account Ltd" }];
    session.user = { id: "user-1" };
    expect((await loadYourDetails()).registeredName).toBe("Account Ltd");
    expect((await loadContacts()).map((c) => c.registeredName)).toEqual(["Buyer GmbH"]);
    expect(db.exports_contacts[0].id).toBe("row-0");
  });
});
