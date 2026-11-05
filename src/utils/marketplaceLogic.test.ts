/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommission,
  calculateOrderFinancials,
  calculateRefundAdjustment,
  isValidOrderStatusTransition,
  verifyDeliveryOtp,
  isAuthorizedAccess,
  calculateCodCommissionEligibility,
  calculateCourierCashInHand,
  calculateCodReconciliationStats,
  generateCashReceiptNumber,
} from './marketplaceLogic';

test('TEST CASE 3: calculates exact ₹25 commission and ₹975 seller gross settlement for ₹1,000 product at default 2.5% rate', () => {
  const result = calculateCommission(1000, 2.5);
  assert.equal(result.commissionableAmount, 1000);
  assert.equal(result.commissionRate, 2.5);
  assert.equal(result.platformCommission, 25);
  assert.equal(result.sellerGrossSettlement, 975);
});

test('clamps platform commission rate strictly within 2.0% and 3.0%', () => {
  // Test lower bound clamp
  const lowerResult = calculateCommission(1000, 1.2);
  assert.equal(lowerResult.commissionRate, 2.0);
  assert.equal(lowerResult.platformCommission, 20);
  assert.equal(lowerResult.sellerGrossSettlement, 980);

  // Test upper bound clamp
  const upperResult = calculateCommission(1000, 5.0);
  assert.equal(upperResult.commissionRate, 3.0);
  assert.equal(upperResult.platformCommission, 30);
  assert.equal(upperResult.sellerGrossSettlement, 970);
});

test('calculateOrderFinancials accurately handles items, coupon discounts and delivery charges', () => {
  const items = [
    { price: 600, quantity: 1 },
    { price: 200, quantity: 2 },
  ]; // subtotal = 1000
  const result = calculateOrderFinancials(items, 100, 40, 0);
  assert.equal(result.subtotal, 1000);
  assert.equal(result.discount, 100);
  assert.equal(result.deliveryCharge, 40);
  assert.equal(result.totalPayable, 940);
});

test('calculateRefundAdjustment correctly computes proportional commission reversal and seller debit', () => {
  // Refund a ₹1,000 item sold at 2.5% commission
  const adjustment = calculateRefundAdjustment(1000, 1, 2.5);
  assert.equal(adjustment.refundAmount, 1000);
  assert.equal(adjustment.commissionReversed, 25);
  assert.equal(adjustment.sellerDebit, 975);
});

test('isValidOrderStatusTransition follows the strict 10-stage order fulfillment sequence', () => {
  // Placed -> Payment Confirmed
  assert.equal(isValidOrderStatusTransition('placed', 'payment_confirmed'), true);
  // Payment Confirmed -> Seller Accepted
  assert.equal(isValidOrderStatusTransition('payment_confirmed', 'seller_accepted'), true);
  // Seller Accepted -> Packing
  assert.equal(isValidOrderStatusTransition('seller_accepted', 'packing'), true);
  // Packing -> Ready for pickup
  assert.equal(isValidOrderStatusTransition('packing', 'ready_for_pickup'), true);
  // Ready for pickup -> Courier assigned
  assert.equal(isValidOrderStatusTransition('ready_for_pickup', 'courier_assigned'), true);
  // Courier assigned -> Picked up
  assert.equal(isValidOrderStatusTransition('courier_assigned', 'picked_up'), true);
  // Picked up -> In transit
  assert.equal(isValidOrderStatusTransition('picked_up', 'in_transit'), true);
  // In transit -> Out for delivery
  assert.equal(isValidOrderStatusTransition('in_transit', 'out_for_delivery'), true);
  // Out for delivery -> Delivered
  assert.equal(isValidOrderStatusTransition('out_for_delivery', 'delivered'), true);

  // Illegal skip: Placed directly to Delivered is prohibited
  assert.equal(isValidOrderStatusTransition('placed', 'delivered'), false);
  // Illegal skip: In transit directly to Seller Accepted is prohibited
  assert.equal(isValidOrderStatusTransition('in_transit', 'seller_accepted'), false);
});

test('verifyDeliveryOtp matches customer verification code securely', () => {
  assert.equal(verifyDeliveryOtp('782910', '782910'), true);
  assert.equal(verifyDeliveryOtp('782910', '782911'), false);
  assert.equal(verifyDeliveryOtp('782910', ''), false);
});

test('TEST CASE 8 & 9: isAuthorizedAccess strictly isolates seller, courier and customer boundaries', () => {
  // Seller cannot access another seller's data
  assert.equal(
    isAuthorizedAccess('seller', 'seller_data', {
      resourceOwnerId: 'seller_123',
      currentUserId: 'seller_456',
    }),
    false
  );

  // Seller CAN access their own data
  assert.equal(
    isAuthorizedAccess('seller', 'seller_data', {
      resourceOwnerId: 'seller_123',
      currentUserId: 'seller_123',
    }),
    true
  );

  // Courier cannot access owner or seller dashboard
  assert.equal(isAuthorizedAccess('courier', 'owner_dashboard'), false);
  assert.equal(isAuthorizedAccess('courier', 'seller_dashboard'), false);

  // Courier cannot access another courier's data
  assert.equal(
    isAuthorizedAccess('courier', 'courier_data', {
      resourceOwnerId: 'courier_1',
      currentUserId: 'courier_2',
    }),
    false
  );

  // Owner has universal administrative access
  assert.equal(
    isAuthorizedAccess('owner', 'seller_data', {
      resourceOwnerId: 'seller_123',
      currentUserId: 'owner_1',
    }),
    true
  );
  assert.equal(isAuthorizedAccess('owner', 'owner_dashboard'), true);
});

test('COD MANAGEMENT: calculates 0 commission if cancelled before dispatch or failed delivery', () => {
  // Cancelled order
  const cancelledResult = calculateCodCommissionEligibility({
    isCod: true,
    orderStatus: 'cancelled',
    collectionStatus: 'cancelled',
    orderTotal: 1000,
    commissionRate: 2.5,
  });
  assert.equal(cancelledResult.isEligible, false);
  assert.equal(cancelledResult.platformCommission, 0);
  assert.equal(cancelledResult.sellerGrossSettlement, 0);

  // Customer refused delivery
  const refusedResult = calculateCodCommissionEligibility({
    isCod: true,
    orderStatus: 'failed_delivery',
    collectionStatus: 'failed',
    orderTotal: 1000,
    commissionRate: 2.5,
  });
  assert.equal(refusedResult.isEligible, false);
  assert.equal(refusedResult.platformCommission, 0);
  assert.equal(refusedResult.sellerGrossSettlement, 0);
});

test('COD FINANCIAL SAFETY: withholds commission when cash is self-reported by courier or deposited, realizes exact ₹25/₹975 only when verified by owner', () => {
  // Cash self-reported by courier (cash in courier's hand) -> Not eligible yet!
  const inHandResult = calculateCodCommissionEligibility({
    isCod: true,
    orderStatus: 'delivered',
    collectionStatus: 'collected_by_courier',
    orderTotal: 1000,
    commissionRate: 2.5,
  });
  assert.equal(inHandResult.isEligible, false);
  assert.equal(inHandResult.platformCommission, 0);
  assert.equal(inHandResult.sellerGrossSettlement, 0);

  // Cash deposited by courier but pending owner verification -> Not eligible yet!
  const depositedResult = calculateCodCommissionEligibility({
    isCod: true,
    orderStatus: 'delivered',
    collectionStatus: 'deposited',
    orderTotal: 1000,
    commissionRate: 2.5,
  });
  assert.equal(depositedResult.isEligible, false);
  assert.equal(depositedResult.platformCommission, 0);

  // Cash verified by owner -> Realized! ₹25 commission and ₹975 seller settlement
  const verifiedResult = calculateCodCommissionEligibility({
    isCod: true,
    orderStatus: 'delivered',
    collectionStatus: 'verified_by_owner',
    orderTotal: 1000,
    commissionRate: 2.5,
  });
  assert.equal(verifiedResult.isEligible, true);
  assert.equal(verifiedResult.platformCommission, 25);
  assert.equal(verifiedResult.sellerGrossSettlement, 975);
});

test('COD CASH IN HAND: computes courier liability and deposit tracking accurately', () => {
  const sampleOrders = [
    {
      courierId: 'courier_1',
      paymentMethod: 'cod',
      totalPayable: 1000,
      codDetails: { isCod: true, collectionStatus: 'collected_by_courier', collectedAmount: 1000 },
    },
    {
      courierId: 'courier_1',
      paymentMethod: 'cod',
      totalPayable: 500,
      codDetails: { isCod: true, collectionStatus: 'collected_by_courier', collectedAmount: 500 },
    },
    {
      courierId: 'courier_2', // other courier
      paymentMethod: 'cod',
      totalPayable: 800,
      codDetails: { isCod: true, collectionStatus: 'collected_by_courier', collectedAmount: 800 },
    },
  ];

  // No deposits yet -> Courier 1 holds ₹1500 cash in hand
  const result1 = calculateCourierCashInHand('courier_1', sampleOrders, []);
  assert.equal(result1.totalCollected, 1500);
  assert.equal(result1.cashInHand, 1500);
  assert.equal(result1.pendingVerification, 0);
  assert.equal(result1.verifiedDeposited, 0);

  // Courier 1 submits a deposit of ₹1000 pending verification
  const sampleDeposits = [
    {
      courierId: 'courier_1',
      amount: 1000,
      status: 'pending_verification' as const,
    },
  ];
  const result2 = calculateCourierCashInHand('courier_1', sampleOrders, sampleDeposits);
  assert.equal(result2.cashInHand, 500); // remaining liability
  assert.equal(result2.pendingVerification, 1000);

  // Owner verifies deposit
  const verifiedDeposits = [
    {
      courierId: 'courier_1',
      amount: 1000,
      status: 'verified' as const,
    },
  ];
  const result3 = calculateCourierCashInHand('courier_1', sampleOrders, verifiedDeposits);
  assert.equal(result3.cashInHand, 500);
  assert.equal(result3.verifiedDeposited, 1000);
});

test('COD RECONCILIATION: platform-wide stats calculate discrepancies, failed deliveries and settlements correctly', () => {
  const sampleOrders = [
    {
      paymentMethod: 'cod',
      totalPayable: 1000,
      orderStatus: 'delivered' as const,
      items: [{ platformCommission: 25, sellerGrossSettlement: 975 }],
      codDetails: { isCod: true, amountToCollect: 1000, collectionStatus: 'verified_by_owner' },
    },
    {
      paymentMethod: 'cod',
      totalPayable: 600,
      orderStatus: 'delivered' as const,
      items: [{ platformCommission: 15, sellerGrossSettlement: 585 }],
      codDetails: { isCod: true, amountToCollect: 600, collectionStatus: 'collected_by_courier' },
    },
    {
      paymentMethod: 'cod',
      totalPayable: 400,
      orderStatus: 'failed_delivery' as const,
      codDetails: { isCod: true, amountToCollect: 400, collectionStatus: 'failed' },
    },
  ];

  const sampleDeposits = [
    { amount: 1000, status: 'verified' as const },
    { amount: 200, status: 'rejected' as const }, // discrepancy
  ];

  const stats = calculateCodReconciliationStats(sampleOrders, sampleDeposits);
  assert.equal(stats.totalCodOrders, 3);
  assert.equal(stats.totalCodAmount, 2000);
  assert.equal(stats.cashCollectedByCouriers, 1600); // 1000 + 600
  assert.equal(stats.cashVerifiedByOwner, 1000);
  assert.equal(stats.cashPendingWithCouriers, 600); // remaining with courier
  assert.equal(stats.sellerPayableCodAmount, 975); // only verified order realized
  assert.equal(stats.platformCommissionCodRealized, 25); // only verified order realized
  assert.equal(stats.failedCodDeliveriesCount, 1);
  assert.equal(stats.cashDiscrepanciesAmount, 200);
});
