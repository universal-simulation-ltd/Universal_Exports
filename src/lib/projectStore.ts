import { supabase } from './supabase'

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

export async function loadProjects(): Promise<ProjectData[]> {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('exports_projects').upsert({
    id: project.id,
    user_id: user.id,
    name: project.name,
    role: project.role ?? '',
    forms: project.forms,
    locked_sections: project.lockedSections ?? [],
    saved_sections: project.savedSections ?? [],
    eboxy_generated: project.eboxyGenerated ?? false,
    updated_at: new Date().toISOString(),
  })

  if (error) console.error('Error saving project:', error)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('exports_projects').delete().eq('id', id)
  if (error) console.error('Error deleting project:', error)
}

export function createProjectId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
