export interface SnapshotBusinessAuditInput {
  id: string;
  owner_id?: string | null;
}

export interface SnapshotProductAuditInput {
  id: string;
  business_id: string;
  created_by?: string | null;
  last_modified_by?: string | null;
}

export function buildBusinessOwnerLookup(businesses: SnapshotBusinessAuditInput[]): Map<string, string> {
  const owners = new Map<string, string>();

  for (const business of businesses) {
    if (business.owner_id) {
      owners.set(business.id, business.owner_id);
    }
  }

  return owners;
}

export function resolveProductAuditUserIds(
  product: SnapshotProductAuditInput,
  businessOwnersById: Map<string, string>,
): {
  createdBy: string;
  lastModifiedBy: string;
} {
  const fallbackUserId = product.created_by ?? product.last_modified_by ?? businessOwnersById.get(product.business_id);

  if (!fallbackUserId) {
    throw new Error(
      `Product ${product.id} is missing created_by/last_modified_by and no business owner fallback was available.`,
    );
  }

  return {
    createdBy: product.created_by ?? fallbackUserId,
    lastModifiedBy: product.last_modified_by ?? product.created_by ?? fallbackUserId,
  };
}
