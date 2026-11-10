import { supabase } from './supabase'
import { GUEST_KEYS, clearGuest, readGuest, signedInUserId, writeGuest } from './guestStore'

export interface ProjectData {
  id: string
  name: string
  createdAt: string
  role: string
  forms: Record<string, Record<string, string>>
  lockedSections: string[]
  savedSections: string[]
  eboxyGenerated: boolean
}

const readLocal = () => readGuest<ProjectData[]>(GUEST_KEYS.projects, [])

function toRow(userId: string, project: ProjectData) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    role: project.role ?? '',
    forms: project.forms,
    locked_sections: project.lockedSections ?? [],
    saved_sections: project.savedSections ?? [],
    eboxy_generated: project.eboxyGenerated ?? false,
    updated_at: new Date().toISOString(),
  }
}

/** Projects drafted signed out in this browser move into the account the first time it is signed in. */
async function moveGuestProjects(userId: string): Promise<void> {
  const local = readLocal()
  if (!local.length) return
  const { error } = await supabase.from('exports_projects').upsert(local.map((p) => toRow(userId, p)))
  if (error) console.error('Error moving this browser\'s projects to the account:', error)
  else clearGuest(GUEST_KEYS.projects)
}

export async function loadProjects(): Promise<ProjectData[]> {
  const userId = await signedInUserId()
  if (!userId) return readLocal()
  await moveGuestProjects(userId)

  const { data, error } = await supabase
    .from('exports_projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error loading projects:', error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    role: row.role ?? '',
    forms: row.forms ?? {},
    lockedSections: row.locked_sections ?? [],
    savedSections: row.saved_sections ?? [],
    eboxyGenerated: row.eboxy_generated ?? false,
  }))
}

export async function saveProject(project: ProjectData): Promise<void> {
  const userId = await signedInUserId()
  if (!userId) {
    // Signed out: this browser. Newest first, as the account's list is.
    const keep = readLocal().filter((p) => p.id !== project.id)
    writeGuest(GUEST_KEYS.projects, [{ ...project, createdAt: readLocal().find((p) => p.id === project.id)?.createdAt ?? project.createdAt }, ...keep])
    return
  }

  const { error } = await supabase.from('exports_projects').upsert(toRow(userId, project))
  if (error) console.error('Error saving project:', error)
}

export async function deleteProject(id: string): Promise<void> {
  if (!(await signedInUserId())) {
    writeGuest(GUEST_KEYS.projects, readLocal().filter((p) => p.id !== id))
    return
  }
  const { error } = await supabase.from('exports_projects').delete().eq('id', id)
  if (error) console.error('Error deleting project:', error)
}

export function createProjectId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
