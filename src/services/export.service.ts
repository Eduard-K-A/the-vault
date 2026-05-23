import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { getLocalDbState } from '@/db/localDb';
import { getInventoryForBranch } from '@/db/queries/inventoryQueries';
import { getSalesForBusiness } from '@/db/queries/salesQueries';

async function writeWorkbook(fileName: string, sheets: Record<string, unknown[]>): Promise<string> {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: fileName,
    });
  }

  return uri;
}

export async function exportSalesReport(businessId: string): Promise<string> {
  const state = getLocalDbState();
  const sales = getSalesForBusiness(state, businessId).map((sale) => ({
    id: sale.id,
    created_at: sale.created_at,
    employee_id: sale.employee_id,
    total_amount: sale.total_amount,
    discount_amount: sale.discount_amount,
    payment_method: sale.payment_method,
    status: sale.status,
    notes: sale.notes ?? '',
  }));

  const saleItems = state.saleItems
    .filter((item) => sales.some((sale) => sale.id === item.sale_id))
    .map((item) => ({
      id: item.id,
      sale_id: item.sale_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));

  return writeWorkbook(`sales-report-${Date.now()}.xlsx`, {
    Sales: sales,
    Items: saleItems,
  });
}

export async function exportInventoryReport(branchId: string): Promise<string> {
  const state = getLocalDbState();
  const inventory = getInventoryForBranch(state, branchId).map((item) => {
    const product = state.products.find((entry) => entry.id === item.product_id);
    return {
      product_id: item.product_id,
      product_name: product?.name ?? 'Unknown',
      stock_quantity: item.stock_quantity,
      low_stock_threshold: item.low_stock_threshold,
      status:
        item.stock_quantity <= 0
          ? 'out_of_stock'
          : item.stock_quantity <= item.low_stock_threshold
            ? 'low_stock'
            : 'ok',
    };
  });

  return writeWorkbook(`inventory-report-${Date.now()}.xlsx`, {
    Inventory: inventory,
  });
}

