/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'customer' | 'seller' | 'courier' | 'owner';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface Address {
  id: string;
  name: string;
  phone: string;
  pincode: string;
  locality: string;
  addressLine: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string;
  username?: string;
  password?: string;
  // Seller-specific details
  businessName?: string;
  gstin?: string;
  panNumber?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  storeLogo?: string;
  storeBanner?: string;
  sellerCommissionRate?: number; // custom override if permitted
  rating?: number;
  totalSales?: number;
  // Courier-specific details
  vehicleType?: 'bike' | 'scooter' | 'van' | 'electric_vehicle';
  vehicleNumber?: string;
  drivingLicense?: string;
  upiId?: string;
  isAvailable?: boolean;
  currentLocation?: { lat: number; lng: number; address: string };
  totalDeliveries?: number;
  courierRating?: number;
  // Customer-specific details
  savedAddresses?: Address[];
  wishlist?: string[]; // product IDs
}

export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  sku: string;
  stock: number;
  priceModifier?: number;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  mrp: number; // Maximum Retail Price
  sellingPrice: number; // Discounted Offer Price
  stock: number;
  sku: string;
  images: string[];
  variants?: ProductVariant[];
  selectedSizes?: string[];
  selectedColors?: string[];
  isApproved: boolean; // Needs owner approval if moderation enabled
  isActive: boolean; // Seller can toggle in stock / active
  featured?: boolean;
  ratingsCount: number;
  averageRating: number;
  createdAt: string;
  specifications?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  hindiName?: string;
  icon: string; // lucide icon identifier
  imageUrl?: string;
  subcategories: string[];
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

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

export type PaymentMethod = 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type CodCollectionStatus =
  | 'pending_collection'
  | 'collected_by_courier'
  | 'deposited'
  | 'verified_by_owner'
  | 'failed'
  | 'cancelled';

export type CodFailureReason =
  | 'customer_refused'
  | 'customer_unavailable'
  | 'incorrect_address'
  | 'cash_not_ready'
  | 'order_cancelled';

export interface CodDetails {
  isCod: boolean;
  amountToCollect: number;
  collectedAmount?: number;
  collectedAt?: string;
  courierId?: string;
  courierName?: string;
  collectionStatus: CodCollectionStatus;
  depositReference?: string;
  depositMode?: 'bank_transfer' | 'upi' | 'cash_counter';
  depositedAt?: string;
  depositId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  failureReason?: CodFailureReason;
  failureNotes?: string;
  receiptNumber?: string;
}

export interface CodDeposit {
  id: string;
  depositNumber: string;
  courierId: string;
  courierName: string;
  courierPhone: string;
  orderIds: string[];
  orderNumbers: string[];
  amount: number;
  paymentMode: 'bank_transfer' | 'upi' | 'cash_counter';
  transactionReference: string;
  depositReceiptUrl?: string;
  notes?: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  depositedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface CodReconciliationStats {
  totalCodOrders: number;
  totalCodAmount: number;
  cashCollectedByCouriers: number;
  cashPendingWithCouriers: number;
  cashDepositedPendingVerification: number;
  cashVerifiedByOwner: number;
  sellerPayableCodAmount: number;
  platformCommissionCodRealized: number;
  cashDiscrepanciesAmount: number;
  failedCodDeliveriesCount: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  size?: string;
  color?: string;
  image: string;
  sku: string;
  // Commission calculation for this line item
  commissionRate: number;
  platformCommission: number;
  sellerGrossSettlement: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  title: string;
  description: string;
  actorRole: UserRole;
  actorName?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryCharge: number;
  tax: number;
  totalPayable: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  orderStatus: OrderStatus;
  timeline: OrderTimelineEvent[];
  // Courier assignment
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  courierFee?: number;
  deliveryOtp: string; // 6-digit verification code
  proofOfDeliveryPhoto?: string;
  customerDeliverySignature?: string;
  // Live GPS simulation
  deliveryLocation?: {
    sellerLocation: { lat: number; lng: number; name: string };
    customerLocation: { lat: number; lng: number; name: string };
    courierCurrentLocation: { lat: number; lng: number; stepPercent: number };
    etaMinutes: number;
  };
  cancellationReason?: string;
  returnReason?: string;
  invoiceNumber: string;
  codDetails?: CodDetails;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  sellerId: string;
  sellerName: string;
  sellingPrice: number;
  commissionRate: number; // 2.0% - 3.0%
  platformCommission: number;
  sellerGrossSettlement: number;
  status: 'settled' | 'reversed' | 'adjusted';
  createdAt: string;
  note?: string;
}

export interface LedgerEntry {
  id: string;
  entityType: 'platform' | 'seller' | 'courier';
  entityId: string;
  entityName: string;
  type: 'credit' | 'debit';
  amount: number;
  referenceOrderId?: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  entityType: 'seller' | 'courier';
  entityId: string;
  entityName: string;
  amount: number;
  bankOrUpiDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  imageUrl?: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountAmount: number;
  minOrderValue: number;
  description: string;
  isActive: boolean;
}

export interface PlatformSettings {
  platformCommissionRate: number; // between 2.0 and 3.0, default 2.5
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  courierFeePerDelivery: number;
  autoAssignCouriers: boolean;
  productModerationRequired: boolean;
  supportPhone: string;
  supportEmail: string;
  // Admin Direct Payment Configuration
  adminUpiId?: string;
  adminPayeeName?: string;
  adminBankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

export interface MarketplaceStats {
  totalCustomers: number;
  totalSellers: number;
  totalCouriers: number;
  totalProducts: number;
  totalOrders: number;
  totalCompletedOrders: number;
  grossMerchandiseValue: number;
  totalPlatformCommission: number;
  sellerPayableBalance: number;
  courierPayableBalance: number;
  pendingWithdrawalsCount: number;
  refundRequestsCount: number;
  cancelledOrdersCount: number;
}
