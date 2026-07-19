import type { Supplier, SavedSupplier } from './types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

export interface SupplierSearchParams {
  product: string
  country: string
  max_price: number
  verified: boolean
}

export async function searchSuppliers(params: SupplierSearchParams): Promise<Supplier[]> {
  const query = new URLSearchParams({
    product: params.product,
    country: params.country,
    max_price: String(params.max_price),
    verified: String(params.verified),
  })
  const res = await fetch(`${API_BASE_URL}/suppliers?${query}`)
  if (!res.ok) throw new Error('Failed to fetch suppliers')
  return res.json()
}

export async function getSavedSuppliers(): Promise<SavedSupplier[]> {
  const res = await fetch(`${API_BASE_URL}/saved-suppliers`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch saved suppliers')
  return res.json()
}

export async function saveSupplier(supplierId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/save-supplier/${supplierId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to save supplier')
}

export async function deleteSavedSupplier(savedId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/saved-suppliers/${savedId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete supplier')
}

export async function getCatalogSnapshot(): Promise<Supplier[]> {
  const query = new URLSearchParams({
    product: '',
    country: '',
    max_price: '999999',
    verified: 'false',
  })
  const res = await fetch(`${API_BASE_URL}/suppliers?${query}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error('Failed to fetch catalog')
  return res.json()
}
