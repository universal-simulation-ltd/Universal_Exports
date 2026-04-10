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

export async function loadCatalogue(): Promise<CatalogueProduct[]> {
  const { data, error } = await supabase
    .from('product_catalogue')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error loading catalogue:', error)
    return []
  }

  return data.map(rowToProduct)
}

export async function addToCatalogue(product: Omit<CatalogueProduct, 'id'>): Promise<CatalogueProduct> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  const { data, error } = await supabase
    .from('product_catalogue')
    .insert({
      id,
      user_id: user.id,
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
  const { error } = await supabase.from('product_catalogue').delete().eq('id', id)
  if (error) console.error('Error removing product:', error)
}

export async function updateCatalogueProduct(updated: CatalogueProduct): Promise<void> {
  const { error } = await supabase
    .from('product_catalogue')
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
