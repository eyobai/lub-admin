/** The statuses each list can be filtered by, as the API names them. */
export const PRODUCT_STATUSES = ['AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'ARCHIVED'] as const;
export const AUCTION_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'CLOSING',
  'COMPLETED',
  'CANCELLED',
] as const;
export const VERIFICATION = ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'] as const;
export const DELIVERY = ['PENDING', 'CONTACTED', 'VERIFIED', 'DISPATCHED', 'DELIVERED', 'DISPUTED'] as const;
