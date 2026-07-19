export interface Supplier {
  id: string
  name: string
  platform: 'Alibaba' | 'AliExpress'
  country: string
  product: string
  unit_price: number
  minimum_order_quantity: number
  rating: number
  delivery_days: number
  verified: boolean
  risk_level: 'Low Risk' | 'Medium Risk' | 'High Risk'
  aimoro_score: number
  recommendation: string
  supplier_url: string
}

export interface SavedSupplier extends Supplier {
  saved_id: number
}
