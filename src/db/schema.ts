export const schemaStatements = {
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY,
      fullname TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  businesses: `
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      owner_id UUID NOT NULL REFERENCES profiles(id),
      join_code TEXT UNIQUE,
      logo_url TEXT,
      address TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  business_members: `
    CREATE TABLE IF NOT EXISTS business_members (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      user_id UUID NOT NULL REFERENCES profiles(id),
      role TEXT,
      branch_id UUID,
      joined_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  branches: `
    CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true
    );
  `,
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL
    );
  `,
  products: `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      category_id UUID REFERENCES categories(id),
      name TEXT NOT NULL,
      barcode TEXT,
      sku TEXT,
      selling_price NUMERIC(10,2),
      cost_price NUMERIC(10,2),
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  inventory: `
    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  sales: `
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      employee_id UUID NOT NULL REFERENCES profiles(id),
      total_amount NUMERIC(10,2) NOT NULL,
      discount_amount NUMERIC(10,2) DEFAULT 0,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      synced_at TIMESTAMPTZ
    );
  `,
  sale_items: `
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY,
      sale_id UUID NOT NULL REFERENCES sales(id),
      product_id UUID NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL
    );
  `,
  inventory_logs: `
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      action_type TEXT NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_changed INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id UUID,
      performed_by UUID NOT NULL REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `,
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES businesses(id),
      event_type TEXT NOT NULL,
      actor_id UUID NOT NULL REFERENCES profiles(id),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `,
} as const;

export const schemaTableOrder = [
  'profiles',
  'businesses',
  'business_members',
  'branches',
  'categories',
  'products',
  'inventory',
  'sales',
  'sale_items',
  'inventory_logs',
  'audit_logs',
] as const;

