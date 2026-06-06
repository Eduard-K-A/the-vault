export function buildDeleteBusinessEnvelope(businessId: string) {
  return {
    op: 'DELETE',
    payload: {
      id: businessId,
      table: 'businesses',
    },
  };
}
