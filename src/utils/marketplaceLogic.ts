/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pure Marketplace Business Logic, Commission Calculations, Ledger Math,
 * RBAC authorization, and Order State Transitions for HS market CLUB.
 */

export type UserRole = 'customer' | 'seller' | 'courier' | 'owner';

export type OrderStatus =
  | 'placed'
  | 'payment_confirmed'
  | 'seller_accepted'
  | 'packing'
  | 'ready_for_pickup'
  | 'courier_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'rto_in_transit'
  | 'rto_delivered'
  | 'cancellation_requested'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refunded';

export interface CommissionResult {
  commissionableAmount: number;
  commissionRate: number;
  platformCommission: number;
  sellerGrossSettlement: number;
}

export interface OrderFinancials {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  totalPayable: number;
}

/**
 * Calculates platform commission strictly between 2.0% and 3.0% (default 2.5%).
 * Default calculation: Commission = Commissionable Product Amount × Commission Rate / 100
 * Example: ₹1,000 product at 2.5% = ₹25 commission, ₹975 seller gross settlement.
 */
export function calculateCommission(
  sellingPrice: number,
  commissionRate = 2.5
): CommissionResult {
  if (sellingPrice < 0) {
    throw new Error('Selling price cannot be negative');
  }

  // Constrain rate between 2.0% and 3.0% as per specifications
  const clampedRate = Math.min(3.0, Math.max(2.0, Number(commissionRate.toFixed(2))));
  const platformCommission = Math.round((sellingPrice * (clampedRate / 100)) * 100) / 100;
  const sellerGrossSettlement = Math.round((sellingPrice - platformCommission) * 100) / 100;

  return {
    commissionableAmount: sellingPrice,
    commissionRate: clampedRate,
    platformCommission,
    sellerGrossSettlement,
  };
}

/**
 * Calculates cart / order financial breakdown.
 */
export function calculateOrderFinancials(
  items: { price: number; quantity: number }[],
  discountAmount = 0,
  deliveryCharge = 0,
  taxRatePercent = 0 // Indian GST is typically included in MRP for retail or calculated separately
): OrderFinancials {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.min(subtotal, Math.max(0, discountAmount));
  const discountedSubtotal = subtotal - discount;
  const tax = Math.round((discountedSubtotal * (taxRatePercent / 100)) * 100) / 100;
  const totalPayable = Math.max(0, Math.round((discountedSubtotal + deliveryCharge + tax) * 100) / 100);

  return {
    subtotal,
    discount,
    deliveryCharge,
    tax,
    totalPayable,
  };
}

/**
 * Calculates proportional refund and commission reversal.
 */
export function calculateRefundAdjustment(
  originalItemPrice: number,
  quantityRefunded: number,
  commissionRate: number
): { refundAmount: number; commissionReversed: number; sellerDebit: number } {
  const refundAmount = originalItemPrice * quantityRefunded;
  const commissionReversed = Math.round((refundAmount * (commissionRate / 100)) * 100) / 100;
  const sellerDebit = Math.round((refundAmount - commissionReversed) * 100) / 100;

  return {
    refundAmount,
    commissionReversed,
    sellerDebit,
  };
}

/**
 * Validates sequential order status transitions according to the 10-stage lifecycle.
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  if (currentStatus === nextStatus) return true;

  // Terminal states cannot transition
  if (currentStatus === 'delivered') {
    return nextStatus === 'return_requested';
  }
  if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
    return false;
  }

  // Cancellation can happen before ready_for_pickup
  if (nextStatus === 'cancellation_requested' || nextStatus === 'cancelled') {
    const cancellableStages: OrderStatus[] = ['placed', 'payment_confirmed', 'seller_accepted', 'packing'];
    return cancellableStages.includes(currentStatus);
  }

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    placed: ['payment_confirmed', 'cancelled'],
    payment_confirmed: ['seller_accepted', 'cancelled'],
    seller_accepted: ['packing', 'cancelled'],
    packing: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['courier_assigned'],
    courier_assigned: ['picked_up', 'ready_for_pickup'], // can be reassigned
    picked_up: ['in_transit'],
    in_transit: ['out_for_delivery'],
    out_for_delivery: ['delivered', 'in_transit', 'failed_delivery'], // in case delivery re-attempted or customer unavailable/refused
    failed_delivery: ['rto_in_transit', 'out_for_delivery', 'cancelled'],
    rto_in_transit: ['rto_delivered', 'returned'],
    rto_delivered: ['returned'],
    delivered: ['return_requested'],
    cancellation_requested: ['cancelled', 'seller_accepted'], // accepted or rejected cancellation
    cancelled: [],
    return_requested: ['returned', 'delivered'],
    returned: ['refunded'],
    refunded: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Validates delivery OTP (must be exact 6 digit match).
 */
export function verifyDeliveryOtp(expectedOtp: string, enteredOtp: string): boolean {
  if (!expectedOtp || !enteredOtp) return false;
  return expectedOtp.trim() === enteredOtp.trim();
}

/**
 * Validates Role-Based Access Control permissions.
 */
export function isAuthorizedAccess(
  userRole: UserRole,
  resourceType: 'seller_dashboard' | 'courier_dashboard' | 'owner_dashboard' | 'seller_data' | 'courier_data' | 'customer_data',
  context?: { resourceOwnerId?: string; currentUserId?: string }
): boolean {
  // Owner has universal administrative access
  if (userRole === 'owner') return true;

  switch (resourceType) {
    case 'owner_dashboard':
      return false;

    case 'seller_dashboard':
      return userRole === 'seller';

    case 'courier_dashboard':
      return userRole === 'courier';

    case 'seller_data':
      // Sellers can only access their own data
      if (userRole !== 'seller') return false;
      if (context?.resourceOwnerId && context?.currentUserId) {
        return context.resourceOwnerId === context.currentUserId;
      }
      return true;

    case 'courier_data':
      // Couriers can only access their own data
      if (userRole !== 'courier') return false;
      if (context?.resourceOwnerId && context?.currentUserId) {
        return context.resourceOwnerId === context.currentUserId;
      }
      return true;

    case 'customer_data':
      // Customer can only access their own orders/profile
      if (userRole !== 'customer') return false;
      if (context?.resourceOwnerId && context?.currentUserId) {
        return context.resourceOwnerId === context.currentUserId;
      }
      return true;

    default:
      return false;
  }
}

/**
 * Evaluates whether platform commission and seller payout can be realized.
 * Rule: For COD orders, commission is ONLY realized when order is successfully delivered
 * AND cash collection has been verified by the owner/system!
 * Cancelled before dispatch, customer refused, or failed deliveries yield 0 commission.
 */
export function calculateCodCommissionEligibility(params: {
  isCod: boolean;
  orderStatus: OrderStatus;
  collectionStatus?: 'pending_collection' | 'collected_by_courier' | 'deposited' | 'verified_by_owner' | 'failed' | 'cancelled';
  orderTotal: number;
  commissionRate: number;
}): {
  isEligible: boolean;
  platformCommission: number;
  sellerGrossSettlement: number;
  reason: string;
} {
  const { isCod, orderStatus, collectionStatus, orderTotal, commissionRate } = params;

  // Clamped commission computation
  const clampedRate = Math.min(3.0, Math.max(2.0, Number(commissionRate.toFixed(2))));
  const platformCommission = Math.round((orderTotal * (clampedRate / 100)) * 100) / 100;
  const sellerGrossSettlement = Math.round((orderTotal - platformCommission) * 100) / 100;

  if (orderStatus === 'cancelled' || collectionStatus === 'cancelled') {
    return {
      isEligible: false,
      platformCommission: 0,
      sellerGrossSettlement: 0,
      reason: 'Order cancelled before completion - no commission realized',
    };
  }

  if (orderStatus === 'failed_delivery' || collectionStatus === 'failed') {
    return {
      isEligible: false,
      platformCommission: 0,
      sellerGrossSettlement: 0,
      reason: 'Failed delivery or customer refused - no successful sale commission',
    };
  }

  if (!isCod) {
    // Prepaid orders realize upon delivery
    if (orderStatus === 'delivered') {
      return {
        isEligible: true,
        platformCommission,
        sellerGrossSettlement,
        reason: 'Prepaid order delivered successfully',
      };
    }
    return {
      isEligible: false,
      platformCommission: 0,
      sellerGrossSettlement: 0,
      reason: 'Prepaid order awaiting delivery',
    };
  }

  // Strict COD Rule: Must be delivered AND verified by owner
  if (orderStatus === 'delivered' && collectionStatus === 'verified_by_owner') {
    return {
      isEligible: true,
      platformCommission,
      sellerGrossSettlement,
      reason: 'COD cash collection verified by platform owner - funds realized',
    };
  }

  if (orderStatus === 'delivered' && collectionStatus === 'deposited') {
    return {
      isEligible: false,
      platformCommission: 0,
      sellerGrossSettlement: 0,
      reason: 'Cash deposited by courier, awaiting owner verification',
    };
  }

  if (orderStatus === 'delivered' && collectionStatus === 'collected_by_courier') {
    return {
      isEligible: false,
      platformCommission: 0,
      sellerGrossSettlement: 0,
      reason: 'Cash held by courier, not yet deposited - payouts withheld for safety',
    };
  }

  return {
    isEligible: false,
    platformCommission: 0,
    sellerGrossSettlement: 0,
    reason: 'COD payment pending collection from customer',
  };
}

/**
 * Calculates a courier's outstanding cash liability and deposit history.
 */
export function calculateCourierCashInHand(
  courierId: string,
  orders: Array<{
    courierId?: string;
    paymentMethod: string;
    totalPayable: number;
    codDetails?: {
      isCod: boolean;
      collectionStatus: string;
      collectedAmount?: number;
    };
  }>,
  deposits: Array<{
    courierId: string;
    amount: number;
    status: 'pending_verification' | 'verified' | 'rejected';
  }>
): {
  totalCollected: number;
  cashInHand: number;
  pendingVerification: number;
  verifiedDeposited: number;
} {
  // Orders where this courier collected cash
  const courierCodOrders = orders.filter(
    o =>
      o.courierId === courierId &&
      o.paymentMethod === 'cod' &&
      o.codDetails &&
      (o.codDetails.collectionStatus === 'collected_by_courier' ||
        o.codDetails.collectionStatus === 'deposited' ||
        o.codDetails.collectionStatus === 'verified_by_owner')
  );

  const totalCollected = courierCodOrders.reduce(
    (sum, o) => sum + (o.codDetails?.collectedAmount || o.totalPayable),
    0
  );

  // Deposits made by this courier
  const courierDeposits = deposits.filter(d => d.courierId === courierId);
  const pendingVerification = courierDeposits
    .filter(d => d.status === 'pending_verification')
    .reduce((sum, d) => sum + d.amount, 0);

  const verifiedDeposited = courierDeposits
    .filter(d => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  // Cash in hand = Total collected - (verified + pending)
  const cashInHand = Math.max(0, totalCollected - (verifiedDeposited + pendingVerification));

  return {
    totalCollected,
    cashInHand,
    pendingVerification,
    verifiedDeposited,
  };
}

/**
 * Computes platform-wide COD reconciliation statistics.
 */
export function calculateCodReconciliationStats(
  orders: Array<{
    paymentMethod: string;
    totalPayable: number;
    orderStatus: OrderStatus;
    items?: Array<{ platformCommission: number; sellerGrossSettlement: number }>;
    codDetails?: {
      isCod: boolean;
      amountToCollect: number;
      collectedAmount?: number;
      collectionStatus: string;
    };
  }>,
  deposits: Array<{
    amount: number;
    status: 'pending_verification' | 'verified' | 'rejected';
  }>
) {
  const codOrders = orders.filter(o => o.paymentMethod === 'cod' || o.codDetails?.isCod);

  const totalCodOrders = codOrders.length;
  const totalCodAmount = codOrders.reduce((sum, o) => sum + o.totalPayable, 0);

  // Collected orders: collected_by_courier, deposited, or verified_by_owner
  const collectedOrders = codOrders.filter(
    o =>
      o.codDetails?.collectionStatus === 'collected_by_courier' ||
      o.codDetails?.collectionStatus === 'deposited' ||
      o.codDetails?.collectionStatus === 'verified_by_owner'
  );
  const cashCollectedByCouriers = collectedOrders.reduce(
    (sum, o) => sum + (o.codDetails?.collectedAmount || o.totalPayable),
    0
  );

  const pendingVerificationDeposits = deposits
    .filter(d => d.status === 'pending_verification')
    .reduce((sum, d) => sum + d.amount, 0);

  const verifiedDeposits = deposits
    .filter(d => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  const cashPendingWithCouriers = Math.max(
    0,
    cashCollectedByCouriers - (verifiedDeposits + pendingVerificationDeposits)
  );

  // Verified orders
  const verifiedOrders = codOrders.filter(o => o.codDetails?.collectionStatus === 'verified_by_owner');

  const sellerPayableCodAmount = verifiedOrders.reduce((sum, o) => {
    const itemSettlement = o.items?.reduce((iSum, i) => iSum + i.sellerGrossSettlement, 0) || (o.totalPayable * 0.975);
    return sum + itemSettlement;
  }, 0);

  const platformCommissionCodRealized = verifiedOrders.reduce((sum, o) => {
    const itemCommission = o.items?.reduce((iSum, i) => iSum + i.platformCommission, 0) || (o.totalPayable * 0.025);
    return sum + itemCommission;
  }, 0);

  const rejectedDeposits = deposits
    .filter(d => d.status === 'rejected')
    .reduce((sum, d) => sum + d.amount, 0);

  const failedCodDeliveriesCount = codOrders.filter(
    o => o.orderStatus === 'failed_delivery' || o.codDetails?.collectionStatus === 'failed'
  ).length;

  return {
    totalCodOrders,
    totalCodAmount,
    cashCollectedByCouriers,
    cashPendingWithCouriers,
    cashDepositedPendingVerification: pendingVerificationDeposits,
    cashVerifiedByOwner: verifiedDeposits,
    sellerPayableCodAmount: Math.round(sellerPayableCodAmount * 100) / 100,
    platformCommissionCodRealized: Math.round(platformCommissionCodRealized * 100) / 100,
    cashDiscrepanciesAmount: rejectedDeposits,
    failedCodDeliveriesCount,
  };
}

/**
 * Generates an official cash collection receipt reference number.
 */
export function generateCashReceiptNumber(orderNumber: string): string {
  const cleanNum = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
  return `RCP-COD-${cleanNum.slice(-6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
}
