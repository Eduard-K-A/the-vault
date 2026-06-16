export const schemaStatements = {
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fullname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'employee',
      phone_number TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  businesses: `
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      owner_id UUID NOT NULL REFERENCES auth.users(id),
      join_code TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  branches: `
    CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  business_members: `
    CREATE TABLE IF NOT EXISTS business_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
      branch_id UUID REFERENCES branches(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (business_id, user_id)
    );
  `,
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL
    );
  `,
  products: `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      category_id UUID REFERENCES categories(id),
      name TEXT NOT NULL,
      barcode TEXT,
      sku TEXT,
      selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
      cost_price NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID NOT NULL REFERENCES auth.users(id),
      last_modified_by UUID NOT NULL REFERENCES auth.users(id)
    );
  `,
  inventory_items: `
    CREATE TABLE IF NOT EXISTS inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      business_id UUID NOT NULL REFERENCES businesses(id),
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (product_id, branch_id)
    );
  `,
  inventory_logs: `
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      product_id UUID NOT NULL REFERENCES products(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      action_type TEXT NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_changed INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id UUID,
      reason TEXT,
      performed_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      synced_at TIMESTAMPTZ
    );
  `,
  sales: `
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      employee_id UUID NOT NULL REFERENCES auth.users(id),
      total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
      discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'voided', 'refunded')),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      synced_at TIMESTAMPTZ,
      reference_number TEXT,
      vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      idempotency_key UUID NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'sync_pending' CHECK (sync_status IN ('local_only', 'sync_pending', 'syncing', 'synced', 'sync_failed', 'needs_review')),
      sync_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (sync_attempt_count >= 0),
      last_sync_error_code TEXT,
      last_sync_error_message TEXT,
      last_sync_error_at TIMESTAMPTZ,
      last_sync_attempt_at TIMESTAMPTZ,
      server_confirmed_at TIMESTAMPTZ,
      UNIQUE (business_id, idempotency_key)
    );
  `,
  sale_items: `
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES sales(id),
      product_id UUID NOT NULL REFERENCES products(id),
      business_id UUID NOT NULL REFERENCES businesses(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
      subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
    );
  `,
  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES sales(id),
      business_id UUID NOT NULL REFERENCES businesses(id),
      branch_id UUID REFERENCES branches(id),
      method TEXT NOT NULL,
      amount_peso NUMERIC(12,2) NOT NULL CHECK (amount_peso > 0),
      status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'authorized', 'captured', 'paid', 'failed', 'refunded', 'partially_refunded')),
      provider TEXT,
      provider_reference TEXT,
      offline_approved BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      synced_at TIMESTAMPTZ,
      UNIQUE (business_id, provider, provider_reference)
    );
  `,
  refunds: `
    CREATE TABLE IF NOT EXISTS refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      idempotency_key UUID NOT NULL UNIQUE,
      original_sale_id UUID NOT NULL REFERENCES sales(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      business_id UUID NOT NULL REFERENCES businesses(id),
      reason TEXT NOT NULL,
      total_peso NUMERIC(12,2) NOT NULL CHECK (total_peso > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID NOT NULL REFERENCES auth.users(id),
      source_device_id TEXT NOT NULL,
      reference_number TEXT NOT NULL
    );
  `,
  refund_items: `
    CREATE TABLE IF NOT EXISTS refund_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      refund_id UUID NOT NULL REFERENCES refunds(id),
      sale_item_id UUID NOT NULL REFERENCES sale_items(id),
      product_id UUID NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
      subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
    );
  `,
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id),
      branch_id UUID REFERENCES branches(id),
      actor_id UUID NOT NULL REFERENCES auth.users(id),
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      source_device_id TEXT
    );
  `,
  device_sessions: `
    CREATE TABLE IF NOT EXISTS device_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      business_id UUID NOT NULL REFERENCES businesses(id),
      device_id TEXT NOT NULL,
      device_name TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
} as const;

export const schemaTableOrder = [
  'profiles',
  'businesses',
  'branches',
  'business_members',
  'categories',
  'products',
  'inventory_items',
  'inventory_logs',
  'sales',
  'sale_items',
  'payments',
  'refunds',
  'refund_items',
  'audit_logs',
  'device_sessions',
] as const;
