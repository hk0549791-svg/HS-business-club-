/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Product,
  Order,
  UserProfile,
  CommissionRecord,
  LedgerEntry,
  PayoutRequest,
  Category,
} from '../../types/marketplace';
import {
  Store,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  FileText,
  Truck,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck,
  Send,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface SellerDashboardProps {
  currentSeller: UserProfile;
  products: Product[];
  orders: Order[];
  commissions: CommissionRecord[];
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  categories: Category[];
  platformCommissionRate: number;
  onCreateProduct: (productData: any) => Promise<void>;
  onUpdateProduct: (productId: string, data: any) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, newStatus: any, note?: string) => Promise<void>;
  onRequestPayout: (amount: number, bankDetails: string) => Promise<void>;
  onOpenInvoice: (order: Order) => void;
  onAcceptRto?: (orderId: string, notes?: string) => Promise<void>;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  currentSeller,
  products,
  orders,
  commissions,
  ledger,
  payouts,
  categories,
  platformCommissionRate,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onRequestPayout,
  onOpenInvoice,
  onAcceptRto,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'financials'>('overview');
  const [orderFilter, setOrderFilter] = useState<'all' | 'cod' | 'prepaid' | 'rto'>('all');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product state
  const [prodTitle, setProdTitle] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodCategory, setProdCategory] = useState(categories[0]?.id || 'electronics');
  const [prodMrp, setProdMrp] = useState('');
  const [prodSellingPrice, setProdSellingPrice] = useState('');
  const [prodStock, setProdStock] = useState('20');
  const [prodSku, setProdSku] = useState('');
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600');
  const [prodSizes, setProdSizes] = useState('S, M, L, XL');
  const [prodColors, setProdColors] = useState('Black, Navy, Silver');

  // Payout request
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  // Seller isolated data filters
  const myProducts = products.filter((p) => p.sellerId === currentSeller.id);
  const myOrders = orders.filter((o) => o.items.some((item) => item.sellerId === currentSeller.id));
  const myCommissions = commissions.filter((c) => c.sellerId === currentSeller.id);
  const myLedger = ledger.filter((l) => l.entityId === currentSeller.id);
  const myPayouts = payouts.filter((p) => p.entityId === currentSeller.id);

  // Financial calculations
  const totalSales = myOrders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => {
      const sellerItemsTotal = o.items
        .filter((item) => item.sellerId === currentSeller.id)
        .reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
      return sum + sellerItemsTotal;
    }, 0);

  const totalCommissionDeducted = myCommissions
    .filter((c) => c.status === 'settled')
    .reduce((sum, c) => sum + c.platformCommission, 0);

  const availableBalance = myLedger.reduce((sum, l) => (l.type === 'credit' ? sum + l.amount : sum - l.amount), 0);

  const pendingOrders = myOrders.filter((o) => ['placed', 'payment_confirmed', 'seller_accepted', 'packing'].includes(o.orderStatus));
  const readyOrders = myOrders.filter((o) => o.orderStatus === 'ready_for_pickup');
  const inTransitOrders = myOrders.filter((o) => ['courier_assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.orderStatus));
  const deliveredOrders = myOrders.filter((o) => o.orderStatus === 'delivered');

  // COD specific calculations
  const codOrders = myOrders.filter((o) => o.paymentMethod === 'cod');
  const prepaidOrders = myOrders.filter((o) => o.paymentMethod !== 'cod');
  const rtoOrders = myOrders.filter((o) => ['failed_delivery', 'rto_in_transit', 'rto_delivered', 'returned'].includes(o.orderStatus));

  const codVerifiedOrders = codOrders.filter((o) => o.codDetails?.collectionStatus === 'verified_by_owner');
  const codPendingSettlementOrders = codOrders.filter((o) => o.codDetails?.collectionStatus !== 'verified_by_owner' && !['cancelled', 'failed_delivery', 'returned'].includes(o.orderStatus));

  const filteredOrders =
    orderFilter === 'cod'
      ? codOrders
      : orderFilter === 'prepaid'
      ? prepaidOrders
      : orderFilter === 'rto'
      ? rtoOrders
      : myOrders;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle || !prodMrp || !prodSellingPrice) return;

    const payload = {
      sellerId: currentSeller.id,
      title: prodTitle,
      description: prodDescription,
      category: prodCategory,
      mrp: Number(prodMrp),
      sellingPrice: Number(prodSellingPrice),
      stock: Number(prodStock) || 10,
      sku: prodSku || `SKU-${Date.now().toString().slice(-6)}`,
      images: [prodImage],
      selectedSizes: prodSizes ? prodSizes.split(',').map((s) => s.trim()) : [],
      selectedColors: prodColors ? prodColors.split(',').map((c) => c.trim()) : [],
    };

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, payload);
      setEditingProduct(null);
    } else {
      await onCreateProduct(payload);
    }

    setShowAddProductModal(false);
    resetForm();
  };

  const resetForm = () => {
    setProdTitle('');
    setProdDescription('');
    setProdMrp('');
    setProdSellingPrice('');
    setProdStock('20');
    setProdSku('');
    setEditingProduct(null);
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setProdTitle(p.title);
    setProdDescription(p.description);
    setProdCategory(p.category);
    setProdMrp(p.mrp.toString());
    setProdSellingPrice(p.sellingPrice.toString());
    setProdStock(p.stock.toString());
    setProdSku(p.sku);
    setProdImage(p.images[0] || '');
    setProdSizes(p.selectedSizes?.join(', ') || '');
    setProdColors(p.selectedColors?.join(', ') || '');
    setShowAddProductModal(true);
  };

  const handleRequestPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payoutAmount);
    if (amt <= 0 || amt > availableBalance) {
      return;
    }
    const bankDetails = `${currentSeller.bankDetails?.bankName || 'Bank'} A/c: ${currentSeller.bankDetails?.accountNumber || 'xxxx'} (IFSC: ${currentSeller.bankDetails?.ifscCode || 'xxxx'})`;
    await onRequestPayout(amt, bankDetails);
    setShowPayoutModal(false);
    setPayoutAmount('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Pending Account Notice */}
      {currentSeller.status === 'pending' && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-sm">Seller Account Pending Owner Approval</h4>
            <p>
              Your merchant profile has been submitted for verification. You can add catalog products and configure your store while the platform owner reviews your KYC/GSTIN documents.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner / Store Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2874f0] flex items-center justify-center font-black text-lg shadow-inner">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                {currentSeller.businessName || currentSeller.name}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                currentSeller.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {currentSeller.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              GSTIN: <span className="font-mono font-semibold">{currentSeller.gstin || 'Not Provided'}</span> • PAN: <span className="font-mono font-semibold">{currentSeller.panNumber || 'AABCU9603R'}</span>
            </p>
          </div>
        </div>

        {/* Commission Transparency Badge */}
        <div className="bg-blue-50 dark:bg-blue-950/60 p-3 rounded-lg border border-blue-200 dark:border-blue-900 text-xs text-right">
          <div className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
            Platform Commission Rate
          </div>
          <div className="text-lg font-black text-[#2874f0] tabular-nums">
            {currentSeller.sellerCommissionRate || platformCommissionRate}%
          </div>
          <div className="text-[10px] text-slate-400">Deducted automatically on sales</div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            ₹{totalSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> From {myOrders.length} orders
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Balance</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 tabular-nums">
            ₹{Math.max(0, availableBalance).toLocaleString('en-IN')}
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={availableBalance <= 0}
            className="text-[11px] text-[#2874f0] font-bold mt-1 hover:underline cursor-pointer disabled:opacity-50"
          >
            Request Payout →
          </button>
        </div>

        {/* Commission Deducted */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Commission</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1 tabular-nums">
            ₹{totalCommissionDeducted.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">2.5% Automated Rate</div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Orders</div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1 tabular-nums">
            {pendingOrders.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{readyOrders.length} Ready for Courier</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs font-bold">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: <Store className="w-4 h-4" /> },
          { id: 'orders', label: `Orders (${myOrders.length})`, icon: <Package className="w-4 h-4" /> },
          { id: 'products', label: `Products Catalog (${myProducts.length})`, icon: <Store className="w-4 h-4" /> },
          { id: 'financials', label: 'Financial Statements & Ledgers', icon: <DollarSign className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-[#2874f0] text-[#2874f0]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Quick Business Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddProductModal(true);
                  }}
                  className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 text-left transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-[#2874f0] mb-1" />
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Add New Product</div>
                  <div className="text-[10px] text-slate-500">List variants & stock</div>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 text-left transition-colors cursor-pointer"
                >
                  <Package className="w-5 h-5 text-amber-600 mb-1" />
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Fulfill Orders</div>
                  <div className="text-[10px] text-slate-500">{pendingOrders.length} orders to pack</div>
                </button>
              </div>
            </div>

            {/* Payout Information */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Bank Account & Settlement</h3>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {currentSeller.bankDetails?.bankName || 'HDFC Bank'}
                </p>
                <p className="font-mono text-slate-600 dark:text-slate-300">
                  A/C: {currentSeller.bankDetails?.accountNumber || '50200012345678'} • IFSC: {currentSeller.bankDetails?.ifscCode || 'HDFC0001234'}
                </p>
                <p className="text-[11px] text-slate-400">Account Holder: {currentSeller.bankDetails?.accountHolderName || currentSeller.name}</p>
              </div>
              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={availableBalance <= 0}
                className="w-full py-2 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                Withdraw Available Earnings (₹{Math.max(0, availableBalance).toLocaleString('en-IN')})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Seller Orders & COD Pipeline</h3>
              <p className="text-xs text-slate-500">Track shipments, verify collections, and manage returns</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setOrderFilter('all')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  orderFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#2874f0] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({myOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('cod')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  orderFilter === 'cod'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <span>COD</span>
                <span className="text-[10px] bg-emerald-700/80 text-white px-1.5 py-0.2 rounded-full">{codOrders.length}</span>
              </button>
              <button
                onClick={() => setOrderFilter('prepaid')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  orderFilter === 'prepaid'
                    ? 'bg-white dark:bg-slate-700 text-[#2874f0] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Prepaid ({prepaidOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('rto')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  orderFilter === 'rto'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <span>RTO Returns</span>
                <span className="text-[10px] bg-rose-700/80 text-white px-1.5 py-0.2 rounded-full">{rtoOrders.length}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Payment / COD Status</th>
                  <th className="p-3">Items & Qty</th>
                  <th className="p-3">Customer & Address</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-right">Commission (2.5%)</th>
                  <th className="p-3 text-right">Net Settlement</th>
                  <th className="p-3">Fulfillment Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const sellerItems = order.items.filter((i) => i.sellerId === currentSeller.id);
                    const sellerGross = sellerItems.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
                    const sellerCommission = sellerItems.reduce((s, i) => s + i.platformCommission, 0);
                    const sellerNet = sellerItems.reduce((s, i) => s + i.sellerGrossSettlement, 0);
                    const isCod = order.paymentMethod === 'cod';
                    const isRtoStage = ['failed_delivery', 'rto_in_transit'].includes(order.orderStatus);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white">#{order.orderNumber}</span>
                          <div className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>

                        <td className="p-3">
                          {isCod ? (
                            <div className="space-y-1">
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                <DollarSign className="w-3 h-3" /> COD ₹{order.totalPayable.toLocaleString('en-IN')}
                              </span>
                              <div className="text-[10px]">
                                {order.codDetails?.collectionStatus === 'verified_by_owner' ? (
                                  <span className="text-emerald-600 font-bold">✓ Cash Verified & Settled</span>
                                ) : order.codDetails?.collectionStatus === 'collected_by_courier' ? (
                                  <span className="text-blue-600 font-bold">✓ With Courier (Cash Held)</span>
                                ) : order.codDetails?.collectionStatus === 'deposited' ? (
                                  <span className="text-purple-600 font-bold">⏳ Deposited (Pending Owner)</span>
                                ) : order.codDetails?.collectionStatus === 'failed' ? (
                                  <span className="text-rose-600 font-bold">✕ Delivery Failed</span>
                                ) : (
                                  <span className="text-amber-600 font-bold">⏳ Pending Collection</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">
                              Prepaid ({order.paymentMethod.toUpperCase()})
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {sellerItems.map((item) => (
                            <div key={item.id} className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.productTitle} × {item.quantity}
                            </div>
                          ))}
                        </td>

                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{order.customerName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{order.shippingAddress.city}, {order.shippingAddress.pincode}</div>
                        </td>

                        <td className="p-3 text-right font-bold tabular-nums">
                          ₹{sellerGross.toLocaleString('en-IN')}
                        </td>

                        <td className="p-3 text-right text-amber-600 font-bold tabular-nums">
                          -₹{sellerCommission.toLocaleString('en-IN')}
                        </td>

                        <td className="p-3 text-right font-black tabular-nums">
                          <div className="text-emerald-600">₹{sellerNet.toLocaleString('en-IN')}</div>
                          {isCod && (
                            <div className="text-[9px] font-semibold text-slate-400">
                              {order.codDetails?.collectionStatus === 'verified_by_owner'
                                ? '✓ Realized in Balance'
                                : 'Withheld until owner deposit verification'}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            order.orderStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.orderStatus === 'failed_delivery' || order.orderStatus === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : order.orderStatus === 'rto_in_transit' || order.orderStatus === 'returned'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.orderStatus.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* RTO Return Inspection & Restock */}
                            {isRtoStage && (
                              <button
                                onClick={async () => {
                                  if (onAcceptRto) {
                                    await onAcceptRto(order.id, 'Seller inspected returned merchandise & verified restock');
                                  } else {
                                    await fetch(`/api/orders/${order.id}/rto-accept`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ notes: 'Seller verified & accepted return', sellerId: currentSeller.id }),
                                    });
                                    window.location.reload();
                                  }
                                }}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Inspect returned merchandise and restore stock to inventory"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Inspect & Accept RTO</span>
                              </button>
                            )}

                            {/* Sequential state transition buttons */}
                            {order.orderStatus === 'placed' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'payment_confirmed', 'Payment verified')}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Accept Order
                              </button>
                            )}

                            {order.orderStatus === 'payment_confirmed' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'seller_accepted', 'Seller accepted')}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Accept Order
                              </button>
                            )}

                            {order.orderStatus === 'seller_accepted' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'packing', 'Packing items in warehouse')}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Pack Order
                              </button>
                            )}

                            {order.orderStatus === 'packing' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'ready_for_pickup', 'Parcel ready for courier pickup')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Mark Ready
                              </button>
                            )}

                            {order.orderStatus === 'ready_for_pickup' && (
                              <span className="text-[10px] text-amber-600 font-bold">
                                Awaiting Courier Dispatch
                              </span>
                            )}

                            <button
                              onClick={() => onOpenInvoice(order)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Print Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No orders found matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT CATALOG */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Your Product Catalog</h3>
              <p className="text-xs text-slate-500">Manage listings, variants, stock, and pricing</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddProductModal(true);
              }}
              className="px-3 py-2 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProducts.length > 0 ? (
              myProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 flex gap-3 bg-white dark:bg-slate-800/40 relative shadow-xs"
                >
                  <img
                    src={prod.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                    alt=""
                    className="w-16 h-16 object-contain rounded bg-slate-50 dark:bg-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{prod.title}</h4>
                    <p className="text-[11px] text-slate-400 uppercase font-mono">{prod.sku} • {prod.category}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                        ₹{prod.sellingPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through tabular-nums">
                        ₹{prod.mrp.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-emerald-600">Stock: {prod.stock}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(prod)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(prod.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                <Store className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No products listed yet.</p>
                <p className="text-xs">Click "Add New Product" to publish your first item on HS market CLUB.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL STATEMENTS & AUDIT LEDGER */}
      {activeTab === 'financials' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Seller Ledger & Payout History</h3>
              <p className="text-xs text-slate-500">Transparent statement: Product Selling Price (-) 2.5% Commission = Net Earnings</p>
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={availableBalance <= 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              Withdraw Available Balance (₹{Math.max(0, availableBalance).toLocaleString('en-IN')})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3 text-right">Credit (+)</th>
                  <th className="p-3 text-right">Debit (-)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myLedger.length > 0 ? (
                  myLedger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="p-3 text-slate-400">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {entry.description}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-blue-600">
                        {entry.referenceOrderId ? `#${entry.referenceOrderId}` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 tabular-nums">
                        {entry.type === 'credit' ? `+₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 tabular-nums">
                        {entry.type === 'debit' ? `-₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white tabular-nums">
                        ₹{entry.balanceAfter.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No financial transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            <div className="p-4 bg-[#2874f0] text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingProduct ? 'Edit Marketplace Listing' : 'Add New Product to Store'}
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="p-1 hover:bg-blue-700 rounded">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Product Title</label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="e.g. boAt Rockerz 450 Bluetooth Headphone"
                  className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">SKU Code</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="SKU-AUTO"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                    placeholder="3999"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    placeholder="1499"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Inventory Stock</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="25"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Product Image URL</label>
                <input
                  type="url"
                  required
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Available Sizes (comma-separated)</label>
                  <input
                    type="text"
                    value={prodSizes}
                    onChange={(e) => setProdSizes(e.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Colors (comma-separated)</label>
                  <input
                    type="text"
                    value={prodColors}
                    onChange={(e) => setProdColors(e.target.value)}
                    placeholder="Black, Navy, Silver"
                    className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Detailed Description</label>
                <textarea
                  rows={3}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Specifications, features, warranty..."
                  className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold rounded"
                >
                  {editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Request Earnings Withdrawal</h3>
            <p className="text-slate-500">
              Available for transfer: <strong className="text-emerald-600 font-bold">₹{Math.max(0, availableBalance).toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handleRequestPayoutSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  required
                  max={availableBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full mt-1 p-2 border rounded font-black text-base tabular-nums"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-[11px] text-slate-500 space-y-1">
                <p>Transfer to: {currentSeller.bankDetails?.bankName} (A/C: {currentSeller.bankDetails?.accountNumber})</p>
                <p>Funds will be credited via NEFT/IMPS upon owner approval.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-1.5 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded"
                >
                  Confirm Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
