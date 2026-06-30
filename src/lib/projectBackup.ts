import { type ProjectData, createProjectId } from "./projectStore";

// "Save to desktop" backup for Universal Exports — the editable middle tier
// between the on-device PDF download and the paid "Hosted by UNI·SIM" cloud.
//
// Unlike the hosted store (which keeps the generated agreement *PDF* online),
// the desktop backup is the whole editable *project*: the form data across
// every section, the role, and the section lock/save flags. Re-importing it
// rebuilds the project so the guest can carry on editing and regenerate — the
// finished PDF can always be re-made from this, but not the other way round.
// It deliberately carries no signature (that lives only on the signed PDF).

const MAGIC = "universal-exports-backup";
const VERSION = 1;

interface BackupFile {
  app: typeof MAGIC;
  version: number;
  createdAt: string;
  project: ProjectData;
}

function safeStem(name: string): string {
  const slug = (name || "export-project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "export-project";
}

/** Serialise a project to a JSON backup blob + suggested filename. */
export function buildBackup(project: ProjectData): { blob: Blob; fileName: string } {
  const payload: BackupFile = {
    app: MAGIC,
    version: VERSION,
    createdAt: new Date().toISOString(),
    project,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return { blob, fileName: `${safeStem(project.name)}.uniexport.json` };
}

/** Save the project to the guest's device as a re-importable backup. */
export function downloadBackup(project: ProjectData): void {
  const { blob, fileName } = buildBackup(project);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parse a previously-downloaded backup into a ready-to-load ProjectData.
 *  Throws a user-facing message if the file isn't a valid Universal Exports
 *  backup. A fresh id + createdAt are assigned so restoring never overwrites a
 *  different existing project when it's next saved. */
export async function readBackupFile(file: File): Promise<ProjectData> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a Universal Exports backup (it isn't valid JSON).");
  }

  const data = json as Partial<BackupFile>;
  const p = data?.project as Partial<ProjectData> | undefined;
  if (!data || data.app !== MAGIC || !p || typeof p !== "object" || typeof p.forms !== "object") {
    throw new Error("That file isn't a Universal Exports backup.");
  }
  if (typeof data.version === "number" && data.version > VERSION) {
    throw new Error("This backup was made by a newer version of Universal Exports — update the app to open it.");
  }

  return {
    id: createProjectId(),
    name: typeof p.name === "string" ? p.name : "Imported project",
    createdAt: new Date().toISOString(),
    role: typeof p.role === "string" ? p.role : "",
    forms: (p.forms as Record<string, Record<string, string>>) ?? {},
    lockedSections: Array.isArray(p.lockedSections) ? p.lockedSections : [],
    savedSections: Array.isArray(p.savedSections) ? p.savedSections : [],
    eboxyGenerated: !!p.eboxyGenerated,
  };
}
