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
  PlatformSettings,
  Category,
} from '../../types/marketplace';
import {
  ShieldAlert,
  Users,
  Store,
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sliders,
  Settings,
  FileText,
  RotateCcw,
  Sparkles,
  Trash2,
  RefreshCw,
  Banknote,
  FileCheck,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';
import {
  calculateCommission,
  calculateCodReconciliationStats,
  calculateCourierCashInHand,
} from '../../utils/marketplaceLogic';
import type { CodDeposit } from '../../types/marketplace';

interface OwnerDashboardProps {
  settings: PlatformSettings;
  users: UserProfile[];
  products: Product[];
  orders: Order[];
  commissions: CommissionRecord[];
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  categories: Category[];
  codDeposits?: CodDeposit[];
  currentAdminUser?: UserProfile;
  onLogoutAdmin?: () => void;
  onUpdateAdminCredentials?: (currentPassword: string, newUsername?: string, newPassword?: string) => Promise<{ success: boolean; message: string; error?: string }>;
  onUpdateSettings: (newSettings: Partial<PlatformSettings>) => Promise<void>;
  onUpdateSellerStatus: (sellerId: string, status: string, commissionRate?: number) => Promise<void>;
  onUpdateCourierStatus: (courierId: string, status: string) => Promise<void>;
  onUpdateProductStatus: (productId: string, isApproved: boolean) => Promise<void>;
  onAssignCourierManually: (orderId: string, courierId: string) => Promise<void>;
  onProcessPayout: (payoutId: string, action: 'approve' | 'reject') => Promise<void>;
  onVerifyCodDeposit?: (depositId: string, action: 'verify' | 'reject', notes?: string) => Promise<void>;
  onSeedStarterCatalog: () => Promise<void>;
  onResetMarketplace: () => Promise<void>;
  onOpenInvoice: (order: Order) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  settings,
  users,
  products,
  orders,
  commissions,
  ledger,
  payouts,
  categories,
  codDeposits = [],
  currentAdminUser,
  onLogoutAdmin,
  onUpdateAdminCredentials,
  onUpdateSettings,
  onUpdateSellerStatus,
  onUpdateCourierStatus,
  onUpdateProductStatus,
  onAssignCourierManually,
  onProcessPayout,
  onVerifyCodDeposit,
  onSeedStarterCatalog,
  onResetMarketplace,
  onOpenInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'cod_management' | 'commission' | 'sellers' | 'couriers' | 'products' | 'orders' | 'financials' | 'settings'>('kpis');

  // Commission Controller state
  const [rateInput, setRateInput] = useState<number>(settings.platformCommissionRate);
  const [simPrice, setSimPrice] = useState<number>(1000);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Admin Direct Payment Config state
  const [adminUpiInput, setAdminUpiInput] = useState(settings.adminUpiId || 'himanshushivam4037@okhdfcbank');
  const [adminPayeeInput, setAdminPayeeInput] = useState(settings.adminPayeeName || 'Himanshu Kushwaha (HS market CLUB Owner)');
  const [adminBankHolder, setAdminBankHolder] = useState(settings.adminBankDetails?.accountHolder || 'Himanshu Kushwaha');
  const [adminBankAcc, setAdminBankAcc] = useState(settings.adminBankDetails?.accountNumber || '91823746192837');
  const [adminBankIfsc, setAdminBankIfsc] = useState(settings.adminBankDetails?.ifscCode || 'HDFC0001234');
  const [adminBankName, setAdminBankName] = useState(settings.adminBankDetails?.bankName || 'HDFC Bank Ltd, New Delhi Inner Circle');
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);

  // Admin Security & Credentials State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState(currentAdminUser?.username || 'admin');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showCredPasswords, setShowCredPasswords] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [credSuccessMsg, setCredSuccessMsg] = useState('');
  const [credErrorMsg, setCredErrorMsg] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredErrorMsg('');
    setCredSuccessMsg('');

    if (!currentPassInput) {
      setCredErrorMsg('Please enter your current admin password.');
      return;
    }

    if (newPassInput && newPassInput.length < 6) {
      setCredErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassInput && newPassInput !== confirmPassInput) {
      setCredErrorMsg('New password and confirmation password do not match.');
      return;
    }

    if (onUpdateAdminCredentials) {
      setIsUpdatingCreds(true);
      try {
        const res = await onUpdateAdminCredentials(
          currentPassInput,
          newUsernameInput,
          newPassInput || undefined
        );
        if (res.success) {
          setCredSuccessMsg(res.message || 'Admin credentials updated successfully in backend database!');
          setCurrentPassInput('');
          setNewPassInput('');
          setConfirmPassInput('');
          setTimeout(() => setCredSuccessMsg(''), 5000);
        } else {
          setCredErrorMsg(res.error || 'Failed to update credentials.');
        }
      } catch (err: any) {
        setCredErrorMsg(err.message || 'Error communicating with backend.');
      } finally {
        setIsUpdatingCreds(false);
      }
    }
  };

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Aggregated Marketplace KPIs
  const customers = users.filter((u) => u.role === 'customer');
  const sellers = users.filter((u) => u.role === 'seller');
  const couriers = users.filter((u) => u.role === 'courier');

  const completedOrders = orders.filter((o) => o.orderStatus === 'delivered');
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'cancelled');
  const returnRequests = orders.filter((o) => o.orderStatus === 'return_requested');

  const grossMerchandiseValue = orders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalPayable, 0);

  const totalPlatformCommission = commissions
    .filter((c) => c.status === 'settled')
    .reduce((sum, c) => sum + c.platformCommission, 0);

  const pendingWithdrawals = payouts.filter((p) => p.status === 'pending');

  // Balances
  const sellerCredits = ledger.filter((l) => l.entityType === 'seller' && l.type === 'credit').reduce((s, l) => s + l.amount, 0);
  const sellerDebits = ledger.filter((l) => l.entityType === 'seller' && l.type === 'debit').reduce((s, l) => s + l.amount, 0);
  const sellerPayableBalance = Math.max(0, sellerCredits - sellerDebits);

  const courierCredits = ledger.filter((l) => l.entityType === 'courier' && l.type === 'credit').reduce((s, l) => s + l.amount, 0);
  const courierDebits = ledger.filter((l) => l.entityType === 'courier' && l.type === 'debit').reduce((s, l) => s + l.amount, 0);
  const courierPayableBalance = Math.max(0, courierCredits - courierDebits);

  // COD Platform Reconciliation Stats & Calculations
  const codStats = calculateCodReconciliationStats(orders, codDeposits);
  const pendingCodDeposits = codDeposits.filter((d) => d.status === 'pending_verification');
  const [selectedDepositForReject, setSelectedDepositForReject] = useState<CodDeposit | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Commission Simulator Calculation (TEST CASE 3 verification: ₹1,000 @ 2.5% = ₹25 commission, ₹975 seller settlement)
  const simResult = calculateCommission(simPrice, rateInput);

  const handleUpdateCommissionRate = async () => {
    setIsUpdatingRate(true);
    try {
      await onUpdateSettings({ platformCommissionRate: rateInput });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.orderStatus !== orderStatusFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some((i) => i.productTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-xs">
      {/* Super Admin Top Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white">
                HS market CLUB Control Center
              </h1>
              <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Universal multi-vendor oversight, automatic commission engine, seller & courier approvals.
            </p>
          </div>
        </div>

        {/* Quick Testing & Catalog Helper Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onSeedStarterCatalog}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Load 4 authentic Indian products, 1 verified seller, and 1 active courier for instant testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Load Test Catalog</span>
          </button>

          <button
            onClick={onResetMarketplace}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset marketplace back to totally clean blank state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clean Marketplace</span>
          </button>

          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-900/30"
              title="Lock Admin Control Panel and return to customer shopping"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock / Exit Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* GMV */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Gross Merchandise Value (GMV)</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            ₹{grossMerchandiseValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{orders.length} total orders placed</div>
        </div>

        {/* Total Platform Commission */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Total Platform Commission</div>
          <div className="text-xl sm:text-2xl font-black text-[#2874f0] mt-1 tabular-nums">
            ₹{totalPlatformCommission.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            Current Rate: {settings.platformCommissionRate}%
          </div>
        </div>

        {/* Seller Payable Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Seller Payable Balance</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 tabular-nums">
            ₹{sellerPayableBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{sellers.length} registered sellers</div>
        </div>

        {/* Courier Payable Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Courier Payable Balance</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1 tabular-nums">
            ₹{courierPayableBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{couriers.length} delivery partners</div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs font-bold overflow-x-auto pb-1">
        {[
          { id: 'kpis', label: 'Marketplace Metrics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'cod_management', label: `COD Cash Management ${pendingCodDeposits.length > 0 ? `(${pendingCodDeposits.length} to verify)` : ''}`, icon: <Banknote className="w-4 h-4 text-emerald-500" /> },
          { id: 'settings', label: 'Admin Payment & Bank Setup', icon: <Settings className="w-4 h-4 text-amber-500" /> },
          { id: 'commission', label: 'Commission Engine (2.0% - 3.0%)', icon: <Percent className="w-4 h-4" /> },
          { id: 'sellers', label: `Sellers (${sellers.length})`, icon: <Store className="w-4 h-4" /> },
          { id: 'couriers', label: `Couriers (${couriers.length})`, icon: <Truck className="w-4 h-4" /> },
          { id: 'products', label: `Catalog (${products.length})`, icon: <Package className="w-4 h-4" /> },
          { id: 'orders', label: `All Orders (${orders.length})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'financials', label: `Payouts & Ledger (${pendingWithdrawals.length} pending)`, icon: <DollarSign className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-rose-600 text-rose-600 dark:text-rose-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: KPIS & OVERVIEW */}
      {activeTab === 'kpis' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Platform User Ecosystem
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Registered Customers:</span>
                <span className="font-bold text-slate-900 dark:text-white">{customers.length}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Registered Sellers:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sellers.length} ({sellers.filter((s) => s.status === 'active').length} active)
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Delivery Couriers:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {couriers.length} ({couriers.filter((c) => c.status === 'active').length} active)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" /> Order Fulfillment Pipeline
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Delivered Orders:</span>
                <span className="font-bold text-emerald-600">{completedOrders.length}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Active In-Transit:</span>
                <span className="font-bold text-blue-600">
                  {orders.filter((o) => ['picked_up', 'in_transit', 'out_for_delivery'].includes(o.orderStatus)).length}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Cancelled / Refunded:</span>
                <span className="font-bold text-rose-600">
                  {cancelledOrders.length + orders.filter((o) => o.orderStatus === 'refunded').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Financial Health & Payouts
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Pending Withdrawals:</span>
                <span className="font-bold text-amber-600">{pendingWithdrawals.length}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Courier Payout Per Delivery:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{settings.courierFeePerDelivery}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">Free Delivery Threshold:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{settings.freeDeliveryThreshold}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED COD CASH MANAGEMENT DASHBOARD (SPECIFICATION REQUIREMENT 4, 5, 6, 7, 8) */}
      {activeTab === 'cod_management' && (
        <div className="space-y-6">
          {/* Header & Financial Safety Notice */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="w-6 h-6 text-amber-300" />
                <h3 className="font-black text-base sm:text-lg">
                  Platform Cash on Delivery (COD) Control Center & Cash Reconciliation
                </h3>
              </div>
              <p className="text-xs text-emerald-100 max-w-3xl">
                Real-time tracking of courier cash collections, fleet liabilities, bank deposit verifications, and automated 2.5% commission realization.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/20 text-xs shrink-0 space-y-1">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Strict Financial Safety Active
              </div>
              <p className="text-[11px] text-emerald-100">
                Seller settlements & platform commissions are withheld until courier bank deposits are verified by owner.
              </p>
            </div>
          </div>

          {/* THE 9 CORE COD METRICS SPECIFIED */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total COD Orders */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Total COD Orders</span>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {codStats.totalCodOrders}
              </div>
              <span className="text-[10px] text-slate-500">Marketplace orders</span>
            </div>

            {/* 2. Total COD Amount */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Total COD Value</span>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                ₹{codStats.totalCodAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">Gross order book</span>
            </div>

            {/* 3. Cash Collected by Couriers */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Cash Collected</span>
              <div className="text-xl font-black text-blue-600 tabular-nums">
                ₹{codStats.cashCollectedByCouriers.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-blue-600 font-semibold">At customer doorsteps</span>
            </div>

            {/* 4. Cash Pending with Couriers (Liability!) */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-amber-300 dark:border-amber-800 shadow-xs space-y-1 bg-amber-50/30">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">4. Cash with Couriers</span>
              <div className="text-xl font-black text-amber-600 tabular-nums">
                ₹{codStats.cashPendingWithCouriers.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                Fleet Liability
              </span>
            </div>

            {/* 5. Cash Deposited Pending Verification */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5. Deposited (Pending)</span>
              <div className="text-xl font-black text-purple-600 tabular-nums">
                ₹{codStats.cashDepositedPendingVerification.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-purple-600 font-bold">{pendingCodDeposits.length} deposits to verify</span>
            </div>

            {/* 6. Cash Verified by Owner */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">6. Cash Verified</span>
              <div className="text-xl font-black text-emerald-600 tabular-nums">
                ₹{codStats.cashVerifiedByOwner.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">✓ Confirmed in Bank</span>
            </div>

            {/* 7. Seller Payable Amount from COD */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">7. Seller Net Payable</span>
              <div className="text-xl font-black text-indigo-600 tabular-nums">
                ₹{codStats.sellerPayableCodAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">Net after 2.5% fee</span>
            </div>

            {/* 8. Platform Commission Realized */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">8. Commission Realized</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                ₹{codStats.platformCommissionCodRealized.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">2.5% automated platform share</span>
            </div>

            {/* 9. Cash Discrepancies */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">9. Discrepancies</span>
              <div className="text-xl font-black text-rose-600 tabular-nums">
                ₹{codStats.cashDiscrepanciesAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-rose-600 font-bold">Flagged / Rejected</span>
            </div>

            {/* 10. Failed COD Deliveries */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed Deliveries</span>
              <div className="text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">
                {codStats.failedCodDeliveriesCount}
              </div>
              <span className="text-[10px] text-slate-500">Refused / RTO restocked</span>
            </div>
          </div>

          {/* AUTOMATED COD COMMISSION ENGINE BREAKDOWN CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#2874f0]" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Automated COD Commission Formula (Current Rate: {settings.platformCommissionRate}%)
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Formula: Product Amount (₹1,000) (-) 2.5% Platform Commission (₹25) = Seller Net Settlement (₹975).
                Commission and seller credits are ONLY posted to the ledger after owner verifies bank UTR!
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs font-bold shrink-0">
              <div className="text-center">
                <div className="text-slate-400 text-[10px] uppercase">Example Order</div>
                <div className="text-slate-900 dark:text-white text-sm font-black tabular-nums">₹1,000</div>
              </div>
              <div className="text-slate-400">→</div>
              <div className="text-center">
                <div className="text-emerald-600 text-[10px] uppercase">Platform Commission (2.5%)</div>
                <div className="text-emerald-600 text-sm font-black tabular-nums">₹25</div>
              </div>
              <div className="text-slate-400">→</div>
              <div className="text-center">
                <div className="text-[#2874f0] text-[10px] uppercase">Seller Net Payable</div>
                <div className="text-[#2874f0] text-sm font-black tabular-nums">₹975</div>
              </div>
            </div>
          </div>

          {/* COURIER DEPOSITS AWAITING OWNER VERIFICATION */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Courier Cash Deposits Awaiting Owner Verification ({pendingCodDeposits.length})
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                Verify UTR numbers against company bank statements before approving
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Deposit Number</th>
                    <th className="p-3">Courier Partner</th>
                    <th className="p-3">Orders Covered</th>
                    <th className="p-3">Deposit Mode</th>
                    <th className="p-3">Bank UTR / Transaction Reference</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Owner Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {codDeposits.length > 0 ? (
                    codDeposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white">{dep.depositNumber}</span>
                          <div className="text-[10px] text-slate-400">{new Date(dep.depositedAt).toLocaleString('en-IN')}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{dep.courierName}</div>
                          <div className="text-[10px] text-slate-400">{dep.courierPhone}</div>
                        </td>

                        <td className="p-3">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {dep.orderNumbers.join(', ') || `${dep.orderIds.length} orders`}
                          </span>
                        </td>

                        <td className="p-3 capitalize">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {dep.paymentMode.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded inline-block">
                            {dep.transactionReference}
                          </div>
                          {dep.notes && <p className="text-[10px] text-slate-500 mt-0.5">"{dep.notes}"</p>}
                        </td>

                        <td className="p-3 text-right font-black text-sm tabular-nums text-emerald-600">
                          ₹{dep.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="p-3 text-center">
                          {dep.status === 'pending_verification' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={async () => {
                                  if (onVerifyCodDeposit) {
                                    await onVerifyCodDeposit(dep.id, 'verify');
                                  } else {
                                    await fetch(`/api/cod/deposits/${dep.id}/action`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'verify' }),
                                    });
                                    window.location.reload();
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Verify bank UTR and release seller payouts & platform commission"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verify & Settle</span>
                              </button>

                              <button
                                onClick={async () => {
                                  setSelectedDepositForReject(dep);
                                  setRejectNotes('');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-colors cursor-pointer"
                                title="Reject if UTR is invalid or amount mismatch"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Flag Discrepancy</span>
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              dep.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {dep.status === 'verified' ? '✓ Verified & Settled' : '✕ Discrepancy Rejected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No courier cash deposits submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COURIER OUTSTANDING CASH LIABILITY AUDIT TABLE */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">Courier Fleet Outstanding Cash Liabilities</h4>
                <p className="text-xs text-slate-500">Real-time audit of cash held in hand by individual delivery partners</p>
              </div>
              <span className="text-xs text-slate-500">{couriers.length} registered couriers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Courier Name</th>
                    <th className="p-3">Vehicle / Phone</th>
                    <th className="p-3 text-right">Total Cash Collected</th>
                    <th className="p-3 text-right">Deposited (Verified)</th>
                    <th className="p-3 text-right">Deposits Pending</th>
                    <th className="p-3 text-right">Cash in Hand Liability</th>
                    <th className="p-3 text-center">Liability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {couriers.map((cour) => {
                    const cData = calculateCourierCashInHand(cour.id, orders, codDeposits);
                    const hasHighLiability = cData.cashInHand > 3000;

                    return (
                      <tr key={cour.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{cour.name}</td>
                        <td className="p-3 text-slate-500">
                          {cour.phone} • <span className="uppercase">{cour.vehicleType}</span> ({cour.vehicleNumber || 'N/A'})
                        </td>
                        <td className="p-3 text-right font-semibold tabular-nums">
                          ₹{cData.totalCollected.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 tabular-nums">
                          ₹{cData.verifiedDeposited.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-semibold text-amber-600 tabular-nums">
                          ₹{cData.pendingVerification.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-black tabular-nums text-slate-900 dark:text-white">
                          <span className={cData.cashInHand > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            ₹{cData.cashInHand.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {cData.cashInHand === 0 ? (
                            <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                              ✓ Clean (No Liability)
                            </span>
                          ) : hasHighLiability ? (
                            <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded">
                              ⚠ High Outstanding Cash
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded">
                              Holding Cash
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Reject Modal */}
      {selectedDepositForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Flag Deposit Discrepancy</h3>
              <button onClick={() => setSelectedDepositForReject(null)} className="p-1 hover:bg-slate-100 rounded">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-500">
              Deposit #{selectedDepositForReject.depositNumber} by {selectedDepositForReject.courierName} for ₹{selectedDepositForReject.amount}.
              Please state the reason for discrepancy (e.g. UTR not matching bank statement):
            </p>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="e.g. UTR reference not reflected in company HDFC account"
              className="w-full p-2 border rounded bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSelectedDepositForReject(null)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onVerifyCodDeposit) {
                    await onVerifyCodDeposit(selectedDepositForReject.id, 'reject', rejectNotes);
                  } else {
                    await fetch(`/api/cod/deposits/${selectedDepositForReject.id}/action`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'reject', notes: rejectNotes }),
                    });
                    window.location.reload();
                  }
                  setSelectedDepositForReject(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded"
              >
                Confirm Rejection & Retain Liability
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATIC PLATFORM COMMISSION SYSTEM (CRITICAL SPECIFICATION) */}
      {activeTab === 'commission' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border-2 border-blue-400 dark:border-blue-800 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  6. Automatic Platform Commission System
                </h3>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Owner configurable commission rate strictly enforced between <strong>2.0%</strong> and <strong>3.0%</strong> (Default: 2.5%).
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-2.5 rounded-lg border border-blue-200 text-right">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase">
                Active System Rate
              </span>
              <div className="text-xl font-black text-[#2874f0] tabular-nums">
                {settings.platformCommissionRate}%
              </div>
            </div>
          </div>

          {/* Setting Controller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Configure Commission Rate (2.0% - 3.0%)
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Platform Commission Rate:
                  </label>
                  <span className="font-black text-base text-[#2874f0] tabular-nums">
                    {rateInput}%
                  </span>
                </div>

                {/* Range slider strictly constrained between 2.0 and 3.0 */}
                <input
                  type="range"
                  min="2.0"
                  max="3.0"
                  step="0.1"
                  value={rateInput}
                  onChange={(e) => setRateInput(parseFloat(e.target.value))}
                  className="w-full accent-[#2874f0] cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>2.0% (Min)</span>
                  <span>2.5% (Default)</span>
                  <span>3.0% (Max)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUpdateCommissionRate}
                  disabled={isUpdatingRate || rateInput === settings.platformCommissionRate}
                  className="w-full py-2.5 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold rounded shadow transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingRate ? 'Saving System Configuration...' : `Apply New Rate (${rateInput}%)`}
                </button>
              </div>
            </div>

            {/* Live Interactive Commission Formula Simulator */}
            <div className="space-y-3 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Live Commission & Settlement Calculator
              </h4>
              <p className="text-slate-500 text-[11px]">
                Formula: Commission = Commissionable Product Amount × Commission Rate / 100
              </p>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Test Product Selling Price (₹):
                </label>
                <input
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(Number(e.target.value) || 0)}
                  className="p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-full font-black text-sm tabular-nums"
                />
              </div>

              {/* Exact breakdown box */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Product Selling Price:</span>
                  <span className="font-bold tabular-nums">₹{simPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>(-) Platform Commission ({simResult.commissionRate}%):</span>
                  <span className="tabular-nums">-₹{simResult.platformCommission.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between text-emerald-600 font-black text-sm">
                  <span>(=) Seller Gross Settlement:</span>
                  <span className="tabular-nums">₹{simResult.sellerGrossSettlement.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400">
                ✅ <strong>Test Case 3 Verification:</strong> ₹1,000 product at default 2.5% rate calculates exactly <strong>₹25 commission</strong> and <strong>₹975 seller gross settlement</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SELLER MANAGEMENT */}
      {activeTab === 'sellers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Registered Marketplace Merchants</h3>
              <p className="text-xs text-slate-500">Review KYC, approve pending accounts, and manage custom commissions</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{sellers.length} registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Business Name & Owner</th>
                  <th className="p-3">GSTIN / PAN</th>
                  <th className="p-3">Bank Details</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Commission Override</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sellers.length > 0 ? (
                  sellers.map((seller) => (
                    <tr key={seller.id}>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{seller.businessName || seller.name}</div>
                        <div className="text-slate-400 text-[11px]">{seller.phone} • {seller.email}</div>
                      </td>
                      <td className="p-3 font-mono">
                        <div>GST: {seller.gstin || 'None'}</div>
                        <div>PAN: {seller.panNumber || 'None'}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {seller.bankDetails?.bankName} A/C: {seller.bankDetails?.accountNumber}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          seller.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {seller.status}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        {seller.sellerCommissionRate ? `${seller.sellerCommissionRate}%` : 'Standard (2.5%)'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {seller.status === 'pending' ? (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.id, 'active')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          ) : seller.status === 'active' ? (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.id, 'suspended')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateSellerStatus(seller.id, 'active')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No sellers registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COURIER MANAGEMENT */}
      {activeTab === 'couriers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Delivery Partner Fleet</h3>
              <p className="text-xs text-slate-500">Approve drivers, verify vehicle registrations, manage delivery fees</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{couriers.length} couriers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Partner Name</th>
                  <th className="p-3">Vehicle Details</th>
                  <th className="p-3">Driving License</th>
                  <th className="p-3">Payout UPI</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {couriers.length > 0 ? (
                  couriers.map((courier) => (
                    <tr key={courier.id}>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{courier.name}</div>
                        <div className="text-slate-400 text-[11px]">{courier.phone}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold uppercase">{courier.vehicleType}</span> • <span className="font-mono">{courier.vehicleNumber}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {courier.drivingLicense || 'DL-PENDING'}
                      </td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">
                        {courier.upiId || 'Pending'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          courier.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {courier.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {courier.status === 'pending' ? (
                          <button
                            onClick={() => onUpdateCourierStatus(courier.id, 'active')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                          >
                            Approve Partner
                          </button>
                        ) : courier.status === 'active' ? (
                          <button
                            onClick={() => onUpdateCourierStatus(courier.id, 'suspended')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateCourierStatus(courier.id, 'active')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No delivery partners registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PRODUCT CATALOG MODERATION */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Platform-Wide Product Moderation</h3>
              <p className="text-xs text-slate-500">Approve, moderate, or remove listings across all sellers</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{products.length} products listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-center">Moderation</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.length > 0 ? (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={p.images[0]} alt="" className="w-8 h-8 object-contain rounded bg-slate-50" />
                          <span className="font-bold text-slate-900 dark:text-white max-w-xs truncate">{p.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">{p.sellerBusinessName}</td>
                      <td className="p-3 uppercase text-[10px] font-bold text-slate-400">{p.category}</td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white tabular-nums">
                        ₹{p.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center font-bold tabular-nums">{p.stock}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onUpdateProductStatus(p.id, !p.isApproved)}
                          className={`px-2.5 py-1 text-white font-bold rounded cursor-pointer ${
                            p.isApproved ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {p.isApproved ? 'Reject' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No products uploaded to the marketplace yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ORDER MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Universal Marketplace Orders</h3>
              <p className="text-xs text-slate-500">Every order with 10-stage tracking, OTP, and courier assignments</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order or customer..."
                className="p-1.5 border rounded text-xs"
              />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="p-1.5 border rounded text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="placed">Placed</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="courier_assigned">Courier Assigned</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Seller Store</th>
                  <th className="p-3 text-right">Total Payable</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Courier</th>
                  <th className="p-3 text-center">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">#{order.orderNumber}</td>
                      <td className="p-3">{order.customerName}</td>
                      <td className="p-3 font-semibold">{order.items[0]?.sellerBusinessName}</td>
                      <td className="p-3 text-right font-black tabular-nums">₹{order.totalPayable.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          {order.orderStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        {order.courierName ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{order.courierName}</span>
                        ) : order.orderStatus === 'ready_for_pickup' ? (
                          <select
                            onChange={(e) => {
                              if (e.target.value) onAssignCourierManually(order.id, e.target.value);
                            }}
                            className="p-1 border rounded text-[11px]"
                          >
                            <option value="">Assign Courier...</option>
                            {couriers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.vehicleType})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onOpenInvoice(order)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No marketplace orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: PAYOUTS & FINANCIAL AUDIT TRAIL */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Pending Payouts Approval Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-4 space-y-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Pending Withdrawal Payout Requests ({pendingWithdrawals.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Bank / UPI Destination</th>
                    <th className="p-3 text-right">Requested Amount</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingWithdrawals.length > 0 ? (
                    pendingWithdrawals.map((po) => (
                      <tr key={po.id}>
                        <td className="p-3 uppercase font-bold text-slate-400">{po.entityType}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{po.entityName}</td>
                        <td className="p-3 font-mono text-[11px]">{po.bankOrUpiDetails}</td>
                        <td className="p-3 text-right font-black text-emerald-600 tabular-nums">
                          ₹{po.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onProcessPayout(po.id, 'approve')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                            >
                              Approve & Settle
                            </button>
                            <button
                              onClick={() => onProcessPayout(po.id, 'reject')}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No pending payout requests from merchants or couriers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Ledger Audit Trail */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-4 space-y-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Marketplace Immutable Financial Ledger (Credits, Debits & Reversals)
            </h3>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Ref Order</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledger.length > 0 ? (
                    ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="p-3 text-slate-400">{new Date(entry.createdAt).toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white">{entry.entityName}</span>
                          <span className="text-[10px] text-slate-400 uppercase block">{entry.entityType}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{entry.description}</td>
                        <td className="p-3 font-mono text-[11px] text-blue-600">
                          {entry.referenceOrderId ? `#${entry.referenceOrderId}` : '-'}
                        </td>
                        <td className="p-3 text-right font-black tabular-nums">
                          <span className={entry.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}>
                            {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black tabular-nums text-slate-900 dark:text-white">
                          ₹{entry.balanceAfter.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Ledger is currently empty. Place an order to see automated commission accounting.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ADMIN DIRECT PAYMENT & BANK ACCOUNT SETUP */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Admin Direct Payment Gateway & Treasury Account
                </h3>
                <p className="text-xs text-slate-500">
                  Set the exact UPI ID and Bank Account where customer online payments (UPI, Cards, Netbanking) directly deposit.
                </p>
              </div>

              {paymentSettingsSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Admin Payment Credentials Saved Successfully!</span>
                </div>
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingPaymentSettings(true);
                setPaymentSettingsSuccess(false);
                try {
                  await onUpdateSettings({
                    adminUpiId: adminUpiInput,
                    adminPayeeName: adminPayeeInput,
                    adminBankDetails: {
                      accountHolder: adminBankHolder,
                      accountNumber: adminBankAcc,
                      ifscCode: adminBankIfsc,
                      bankName: adminBankName,
                    },
                  });
                  setPaymentSettingsSuccess(true);
                  setTimeout(() => setPaymentSettingsSuccess(false), 4000);
                } finally {
                  setIsSavingPaymentSettings(false);
                }
              }}
              className="space-y-5"
            >
              {/* UPI Direct Receiving Configuration */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#2874f0]" /> 1. Admin UPI Receiving Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Admin UPI ID (GPay / PhonePe / Paytm / BHIM)
                    </label>
                    <input
                      type="text"
                      value={adminUpiInput}
                      onChange={(e) => setAdminUpiInput(e.target.value)}
                      required
                      placeholder="e.g. himanshushivam4037@okhdfcbank"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">
                      Customer online payments generate a dynamic QR code linked directly to this UPI ID.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Payee Display Name
                    </label>
                    <input
                      type="text"
                      value={adminPayeeInput}
                      onChange={(e) => setAdminPayeeInput(e.target.value)}
                      required
                      placeholder="Himanshu Kushwaha (HS market CLUB)"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-500">
                      Verified merchant name shown to customers inside their UPI banking applications.
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Bank Account Details (NEFT / IMPS / RTGS) */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" /> 2. Admin Bank Account Details (Direct Transfer)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={adminBankHolder}
                      onChange={(e) => setAdminBankHolder(e.target.value)}
                      required
                      placeholder="Himanshu Kushwaha"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Bank Name & Branch
                    </label>
                    <input
                      type="text"
                      value={adminBankName}
                      onChange={(e) => setAdminBankName(e.target.value)}
                      required
                      placeholder="HDFC Bank Ltd, New Delhi Inner Circle"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={adminBankAcc}
                      onChange={(e) => setAdminBankAcc(e.target.value)}
                      required
                      placeholder="91823746192837"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={adminBankIfsc}
                      onChange={(e) => setAdminBankIfsc(e.target.value)}
                      required
                      placeholder="HDFC0001234"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Security & Direct Flow Notice */}
              <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold">Direct Admin Settlement Guarantee:</span>
                  <p className="text-[11px]">
                    All online checkout transactions (UPI, Cards, Netbanking) directly deposit into this configured account.
                    Sellers receive settlements only upon actual delivery, retaining your platform commission automatically.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPaymentSettings}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSavingPaymentSettings ? 'Saving Settings...' : 'Save & Update Admin Payment Gateway'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Security & Credentials Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  Admin Security & Access Credentials (सुरक्षित एडमिन पासवर्ड और यूजरनेम)
                </h3>
                <p className="text-xs text-slate-500">
                  Update your Super Admin username and password. Changes are immediately saved and persisted in the backend database.
                </p>
              </div>

              {credSuccessMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{credSuccessMsg}</span>
                </div>
              )}
            </div>

            {credErrorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{credErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Current Password (वर्तमान पासवर्ड) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showCredPasswords ? 'text' : 'password'}
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    required
                    placeholder="Enter current password (default: AdminPassword@123)"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Default if not changed: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">AdminPassword@123</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Admin Username (यूजरनेम)
                  </label>
                  <input
                    type="text"
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    required
                    placeholder="e.g. admin"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Current username: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentAdminUser?.username || 'admin'}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    New Password (नया पासवर्ड)
                  </label>
                  <input
                    type={showCredPasswords ? 'text' : 'password'}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Min 6 characters (leave empty to keep current)"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Confirm New Password (पासवर्ड दोबारा दर्ज करें)
                  </label>
                  <input
                    type={showCredPasswords ? 'text' : 'password'}
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCredPasswords(!showCredPasswords)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  {showCredPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCredPasswords ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isUpdatingCreds}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-lg shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isUpdatingCreds ? 'Updating in Database...' : 'Save & Update Admin Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
