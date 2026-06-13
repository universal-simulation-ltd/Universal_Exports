import { supabase } from './supabase'

export interface CatalogueProduct {
  id: string
  code: string
  hsCode: string
  name: string
  description: string
  unitPrice: number
  vatPercent: number
}

const LOCAL_KEY = 'eboxy_catalogue'

function getLocal(): CatalogueProduct[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

function setLocal(products: CatalogueProduct[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(products))
}

function rowToProduct(row: Record<string, string | number>): CatalogueProduct {
  return {
    id: row.id as string,
    code: (row.code as string) ?? '',
    hsCode: (row.hs_code as string) ?? '',
    name: (row.name as string) ?? '',
    description: (row.description as string) ?? '',
    unitPrice: Number(row.unit_price ?? 0),
    vatPercent: Number(row.vat_percent ?? 0),
  }
}

async function isAuthenticated(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

export async function loadCatalogue(): Promise<CatalogueProduct[]> {
  if (!(await isAuthenticated())) return getLocal()

  const { data, error } = await supabase
    .from('exports_product_catalogue')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error loading catalogue:', error)
    return getLocal()
  }

  return data.map(rowToProduct)
}

export async function addToCatalogue(product: Omit<CatalogueProduct, 'id'>): Promise<CatalogueProduct> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  if (!(await isAuthenticated())) {
    const newProduct = { ...product, id }
    setLocal([...getLocal(), newProduct])
    return newProduct
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('exports_product_catalogue')
    .insert({
      id,
      user_id: user!.id,
      code: product.code,
      hs_code: product.hsCode,
      name: product.name,
      description: product.description,
      unit_price: product.unitPrice,
      vat_percent: product.vatPercent,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding product:', error)
    throw error
  }

  return rowToProduct(data)
}

export async function removeFromCatalogue(id: string): Promise<void> {
  if (!(await isAuthenticated())) {
    setLocal(getLocal().filter((p) => p.id !== id))
    return
  }

  const { error } = await supabase.from('exports_product_catalogue').delete().eq('id', id)
  if (error) console.error('Error removing product:', error)
}

export async function updateCatalogueProduct(updated: CatalogueProduct): Promise<void> {
  if (!(await isAuthenticated())) {
    setLocal(getLocal().map((p) => p.id === updated.id ? updated : p))
    return
  }

  const { error } = await supabase
    .from('exports_product_catalogue')
    .update({
      code: updated.code,
      hs_code: updated.hsCode,
      name: updated.name,
      description: updated.description,
      unit_price: updated.unitPrice,
      vat_percent: updated.vatPercent,
    })
    .eq('id', updated.id)

  if (error) console.error('Error updating product:', error)
}

export function catalogueDisplayTitle(p: CatalogueProduct): string {
  return `${p.name} (${p.unitPrice.toFixed(2)})`
}
