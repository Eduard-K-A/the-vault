import {
  buildInventoryForBranchQuery,
  buildSaleInventoryLookupQuery,
} from '@/db/queries/inventoryQueries';
import {
  buildProductsForBusinessQuery,
  findProductByBarcode,
  findProductById,
  getProductsForBusiness,
} from '@/db/queries/productQueries';
import {
  buildPaymentsForBusinessQuery,
  buildSaleItemsForBusinessQuery,
  buildSalesForBusinessQuery,
} from '@/db/queries/salesQueries';
import { createProduct } from '../factories/models';

describe('query helpers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('buildProductsForBusinessQuery scopes primary and fallback products to a business', () => {
    expect(buildProductsForBusinessQuery('business-1')).toEqual({
      sql: expect.stringContaining('FROM products WHERE business_id = ?'),
      parameters: ['business-1', 'business-1'],
    });
  });

  it('buildProductsForBusinessQuery uses an impossible id without an active business', () => {
    expect(buildProductsForBusinessQuery(null).parameters).toEqual(['__no_active_business__', '__no_active_business__']);
  });

  it('getProductsForBusiness filters by business, role, search, and updated time', () => {
    const products = [
      createProduct({ id: 'inactive', business_id: 'business-1', name: 'Inactive', is_active: false }),
      createProduct({ id: 'older', business_id: 'business-1', name: 'Coffee', updated_at: '2026-01-01T00:00:00.000Z' }),
      createProduct({ id: 'newer', business_id: 'business-1', sku: 'BEAN-1', updated_at: '2026-01-02T00:00:00.000Z' }),
      createProduct({ id: 'other-business', business_id: 'business-2', name: 'Coffee' }),
    ];

    const result = getProductsForBusiness(products, 'business-1', 'employee', 'bean');

    expect(result.map((product) => product.id)).toEqual(['newer']);
  });

  it('findProductByBarcode respects business and employee active-product filtering', () => {
    const inactive = createProduct({ id: 'inactive', business_id: 'business-1', barcode: '123', is_active: false });
    const active = createProduct({ id: 'active', business_id: 'business-1', barcode: '456', is_active: true });

    expect(findProductByBarcode([inactive, active], 'business-1', '123', 'employee')).toBeNull();
    expect(findProductByBarcode([inactive, active], 'business-1', '123', 'owner')).toEqual(inactive);
    expect(findProductByBarcode([inactive, active], 'business-1', '456', 'employee')).toEqual(active);
  });

  it('findProductById returns the matching product or null', () => {
    const product = createProduct({ id: 'product-1' });

    expect(findProductById([product], 'product-1')).toEqual(product);
    expect(findProductById([product], 'missing')).toBeNull();
  });

  it('buildInventoryForBranchQuery scopes primary and fallback inventory to a branch', () => {
    expect(buildInventoryForBranchQuery('branch-1')).toEqual({
      sql: expect.stringContaining('FROM inventory_items WHERE branch_id = ?'),
      parameters: ['branch-1', 'branch-1'],
    });
    expect(buildInventoryForBranchQuery(null).parameters).toEqual(['__no_active_branch__', '__no_active_branch__']);
  });

  it('buildSaleInventoryLookupQuery searches primary inventory before fallback inventory', () => {
    expect(buildSaleInventoryLookupQuery('product-1', 'branch-1')).toEqual({
      sql: expect.stringContaining("'inventory_items' AS source_table"),
      parameters: ['product-1', 'branch-1', 'product-1', 'branch-1', 'product-1', 'branch-1'],
    });
  });

  it('buildSalesForBusinessQuery scopes primary and fallback sales', () => {
    expect(buildSalesForBusinessQuery('business-1')).toEqual({
      sql: expect.stringContaining('FROM sales WHERE business_id = ?'),
      parameters: ['business-1', 'business-1'],
    });
    expect(buildSalesForBusinessQuery(null).parameters).toEqual(['__no_active_business__', '__no_active_business__']);
  });

  it('buildSaleItemsForBusinessQuery scopes primary and fallback sale items', () => {
    expect(buildSaleItemsForBusinessQuery('business-1')).toEqual({
      sql: expect.stringContaining('FROM sale_items WHERE business_id = ?'),
      parameters: ['business-1', 'business-1'],
    });
  });

  it('buildPaymentsForBusinessQuery scopes primary and fallback payments', () => {
    expect(buildPaymentsForBusinessQuery('business-1')).toEqual({
      sql: expect.stringContaining('FROM payments WHERE business_id = ?'),
      parameters: ['business-1', 'business-1'],
    });
  });
});
