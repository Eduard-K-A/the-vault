export type UserRole = 'employee' | 'owner' | 'manager';
export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'others';
export type SaleStatus = 'completed' | 'voided' | 'refunded';
export type InventoryActionType = 'sale' | 'restock' | 'adjustment' | 'refund' | 'initial';
export type InventoryReferenceType = 'sale' | 'manual' | 'system';
export type AuditEventType =
  | 'product_edit'
  | 'restock'
  | 'login'
  | 'employee_removed'
  | 'business_created'
  | 'sale_created'
  | 'sale_refunded'
  | 'branch_created'
  | 'product_archived';

export interface Profile {
  id: string;
  fullname: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  logo_url: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  branch_id: string | null;
  joined_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  barcode: string | null;
  sku: string | null;
  selling_price: number;
  cost_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  branch_id: string;
  stock_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  employee_id: string;
  total_amount: number;
  discount_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  branch_id: string;
  action_type: InventoryActionType;
  quantity_before: number;
  quantity_changed: number;
  quantity_after: number;
  reference_type: InventoryReferenceType;
  reference_id: string | null;
  performed_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  event_type: AuditEventType;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  quantity: number;
  selling_price: number;
  subtotal: number;
  image_url: string | null;
}

export interface BusinessSummary {
  businessId: string;
  businessName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

export interface AuthSession {
  userId: string;
  email: string;
  fullname: string;
  role: UserRole;
  accessToken: string;
}

export interface SaleMetrics {
  total: number;
  revenue: number;
  transactions: number;
  netRevenue: number;
}
