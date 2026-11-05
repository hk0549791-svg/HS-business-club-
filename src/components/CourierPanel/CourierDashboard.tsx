/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Order, UserProfile, LedgerEntry, CodDeposit, CodFailureReason } from '../../types/marketplace';
import {
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  Phone,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Package,
  Navigation,
  ArrowRight,
  KeyRound,
  RotateCcw,
  Banknote,
  Receipt,
  UploadCloud,
  FileCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateCourierCashInHand } from '../../utils/marketplaceLogic';
import { CashReceiptModal } from '../CashReceiptModal';

interface CourierDashboardProps {
  currentCourier: UserProfile;
  orders: Order[];
  ledger: LedgerEntry[];
  codDeposits?: CodDeposit[];
  courierFeePerDelivery: number;
  onAcceptDelivery: (orderId: string) => Promise<void>;
  onUpdateDeliveryStatus: (orderId: string, newStatus: any, note?: string) => Promise<void>;
  onVerifyDeliveryOtp: (orderId: string, otp: string) => Promise<boolean>;
  onCollectCash?: (orderId: string, amount: number) => Promise<void>;
  onReportFailedDelivery?: (orderId: string, reason: string, notes?: string) => Promise<void>;
  onSubmitDeposit?: (depositData: any) => Promise<void>;
  onRequestPayout: (amount: number, upiId: string) => Promise<void>;
}

export const CourierDashboard: React.FC<CourierDashboardProps> = ({
  currentCourier,
  orders,
  ledger,
  codDeposits = [],
  courierFeePerDelivery,
  onAcceptDelivery,
  onUpdateDeliveryStatus,
  onVerifyDeliveryOtp,
  onCollectCash,
  onReportFailedDelivery,
  onSubmitDeposit,
  onRequestPayout,
}) => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'active' | 'completed' | 'cod_cash' | 'earnings'>('deliveries');
  
  // OTP Verification Modal
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState<Order | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Cash Receipt Modal
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Failed Delivery Modal
  const [selectedOrderForFail, setSelectedOrderForFail] = useState<Order | null>(null);
  const [failReason, setFailReason] = useState<CodFailureReason>('customer_refused');
  const [failNotes, setFailNotes] = useState('');
  const [isSubmittingFail, setIsSubmittingFail] = useState(false);

  // Deposit Modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMode, setDepositMode] = useState<'bank_transfer' | 'upi' | 'cash_counter'>('bank_transfer');
  const [depositReference, setDepositReference] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositError, setDepositError] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Payout request
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutError, setPayoutError] = useState('');

  // Courier ledger & stats
  const courierLedger = ledger.filter((l) => l.entityId === currentCourier.id);
  const totalEarnings = courierLedger
    .filter((l) => l.type === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);

  const availableEarnings = courierLedger.reduce(
    (sum, l) => (l.type === 'credit' ? sum + l.amount : sum - l.amount),
    0
  );

  // Available deliveries: Ready for pickup and unassigned
  const availableDeliveries = orders.filter(
    (o) => o.orderStatus === 'ready_for_pickup' && !o.courierId
  );

  // Assigned / active to this courier
  const myActiveDeliveries = orders.filter(
    (o) =>
      o.courierId === currentCourier.id &&
      ['courier_assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.orderStatus)
  );

  // Completed deliveries
  const myCompletedDeliveries = orders.filter(
    (o) => o.courierId === currentCourier.id && o.orderStatus === 'delivered'
  );

  // COD Cash in Hand & Liability Calculation
  const cashStats = calculateCourierCashInHand(currentCourier.id, orders, codDeposits);

  // Orders collected but not yet deposited
  const collectedUndepositedOrders = orders.filter(
    (o) =>
      o.courierId === currentCourier.id &&
      o.paymentMethod === 'cod' &&
      o.codDetails?.collectionStatus === 'collected_by_courier'
  );

  // Deposits made by this courier
  const myDeposits = codDeposits.filter((d) => d.courierId === currentCourier.id);

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForOtp || !enteredOtp) return;

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const success = await onVerifyDeliveryOtp(selectedOrderForOtp.id, enteredOtp);
      if (success) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        setSelectedOrderForOtp(null);
        setEnteredOtp('');
      } else {
        setOtpError('Invalid Customer OTP. Please ask the customer to check their order screen.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCollectCashClick = async (order: Order) => {
    try {
      if (onCollectCash) {
        await onCollectCash(order.id, order.totalPayable);
      } else {
        await fetch(`/api/orders/${order.id}/cod-collect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courierId: currentCourier.id, amount: order.totalPayable }),
        });
        window.location.reload();
      }
    } catch (err) {
      console.error('Error collecting cash:', err);
    }
  };

  const handleReportFailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForFail) return;
    setIsSubmittingFail(true);

    try {
      if (onReportFailedDelivery) {
        await onReportFailedDelivery(selectedOrderForFail.id, failReason, failNotes);
      } else {
        await fetch(`/api/orders/${selectedOrderForFail.id}/failed-delivery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: failReason, notes: failNotes, courierId: currentCourier.id }),
        });
        window.location.reload();
      }
      setSelectedOrderForFail(null);
      setFailNotes('');
    } catch (err) {
      console.error('Error marking delivery failed:', err);
    } finally {
      setIsSubmittingFail(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depositAmount);
    if (amt <= 0) {
      setDepositError('Please enter a valid deposit amount');
      return;
    }
    if (!depositReference.trim()) {
      setDepositError('Transaction Reference / Bank UTR / UPI Ref is mandatory to verify deposit');
      return;
    }

    setIsSubmittingDeposit(true);
    setDepositError('');

    try {
      const orderIds = collectedUndepositedOrders.map((o) => o.id);
      const payload = {
        courierId: currentCourier.id,
        orderIds,
        amount: amt,
        paymentMode: depositMode,
        transactionReference: depositReference.trim(),
        notes: depositNotes,
      };

      if (onSubmitDeposit) {
        await onSubmitDeposit(payload);
      } else {
        const res = await fetch('/api/cod/deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Deposit failed');
        }
        window.location.reload();
      }

      setShowDepositModal(false);
      setDepositAmount('');
      setDepositReference('');
      setDepositNotes('');
    } catch (err: any) {
      setDepositError(err.message || 'Failed to submit cash deposit');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payoutAmount);
    if (amt <= 0 || amt > availableEarnings) {
      setPayoutError(`Invalid amount. Max available withdrawal: ₹${availableEarnings}`);
      return;
    }
    await onRequestPayout(amt, currentCourier.upiId || 'courier@upi');
    setShowPayoutModal(false);
    setPayoutAmount('');
    setPayoutError('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Pending Account Notice */}
      {currentCourier.status === 'pending' && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-sm">Courier Partner Account Pending Verification</h4>
            <p>
              Your delivery fleet profile and driving credentials ({currentCourier.drivingLicense || 'DL-PENDING'}) have been submitted. You can browse pickup hubs while the marketplace admin activates your fleet status.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner / Courier Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#2874f0] flex items-center justify-center font-black text-lg shadow-inner">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                {currentCourier.name}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                currentCourier.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {currentCourier.status} Fleet
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Vehicle: <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{currentCourier.vehicleType || 'Bike'} ({currentCourier.vehicleNumber || 'DL 01 AB 1234'})</span> • UPI: <span className="font-mono">{currentCourier.upiId || 'courier@upi'}</span>
            </p>
          </div>
        </div>

        {/* Top Cash in Hand Quick Banner */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-right">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Cash in Hand Liability</span>
            <div className="text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              ₹{cashStats.cashInHand.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={() => {
              setDepositAmount(cashStats.cashInHand.toString());
              setShowDepositModal(true);
            }}
            disabled={cashStats.cashInHand <= 0}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Deposit Cash</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2 font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'deliveries'
              ? 'bg-[#2874f0] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Available Hub Pickups ({availableDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-[#2874f0] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Active On Road ({myActiveDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-[#2874f0] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Delivered ({myCompletedDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cod_cash')}
          className={`px-4 py-2 font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cod_cash'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>COD Cash & Deposits (₹{cashStats.cashInHand})</span>
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'earnings'
              ? 'bg-[#2874f0] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Earnings & Payouts</span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE PICKUPS */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Ready for Hub Pickup (₹{courierFeePerDelivery} Flat Compensation Per Delivery)
            </h3>
            <span className="text-xs text-slate-500">{availableDeliveries.length} available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableDeliveries.length > 0 ? (
              availableDeliveries.map((order) => {
                const isCod = order.paymentMethod === 'cod';
                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          Order #{order.orderNumber}
                        </span>
                        {isCod && (
                          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded">
                            COD: ₹{order.totalPayable}
                          </span>
                        )}
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Earn ₹{courierFeePerDelivery}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Pickup Address */}
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="w-3 h-3" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Pickup: {order.items[0]?.sellerBusinessName || 'Seller Hub'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.deliveryLocation?.sellerLocation.name || 'Fulfillment Center, Delhi'}
                          </div>
                        </div>
                      </div>

                      {/* Drop Address */}
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Drop: {order.shippingAddress.name} ({order.shippingAddress.city} - {order.shippingAddress.pincode})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.shippingAddress.addressLine}, {order.shippingAddress.locality}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-xs">
                        Payment: <strong className="uppercase">{order.paymentMethod}</strong>
                      </span>

                      <button
                        onClick={() => onAcceptDelivery(order.id)}
                        className="px-4 py-2 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold rounded flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Accept Delivery</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                <Truck className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No parcels currently awaiting courier pickup.</p>
                <p className="text-xs">When sellers pack orders and mark them ready, they will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE ON ROAD WITH COD CASH COLLECTION & OTP */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Active Assigned Deliveries
          </h3>

          <div className="space-y-4">
            {myActiveDeliveries.length > 0 ? (
              myActiveDeliveries.map((order) => {
                const isCod = order.paymentMethod === 'cod';
                const isCashCollected = order.codDetails?.collectionStatus === 'collected_by_courier';

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-5 border-2 border-blue-400 dark:border-blue-800 shadow-md space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            Order #{order.orderNumber}
                          </span>
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {order.orderStatus.replace('_', ' ')}
                          </span>
                          {isCod && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                              Cash on Delivery
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Customer: <strong className="text-slate-800 dark:text-slate-200">{order.customerName}</strong> ({order.customerPhone})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Customer
                        </a>
                      </div>
                    </div>

                    {/* COD CASH TO COLLECT BANNER */}
                    {isCod && (
                      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0">
                            ₹
                          </div>
                          <div>
                            <div className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                              💰 CASH TO COLLECT: ₹{order.totalPayable.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                              {isCashCollected
                                ? `✓ Cash of ₹${order.codDetails?.collectedAmount || order.totalPayable} collected from customer! Receipt #${order.codDetails?.receiptNumber || 'N/A'}`
                                : 'Collect exact cash or UPI payment before verifying Customer OTP and handing over package.'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCashCollected ? (
                            <button
                              onClick={() => handleCollectCashClick(order)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Mark Cash Collected</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedReceiptOrder(order);
                                setShowReceiptModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 text-emerald-700 dark:text-emerald-300 rounded text-xs font-bold hover:bg-emerald-50 cursor-pointer flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Route details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pickup Location:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{order.items[0]?.sellerBusinessName}</p>
                        <p className="text-slate-500 text-[11px]">{order.deliveryLocation?.sellerLocation.name}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Destination:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{order.shippingAddress.name}</p>
                        <p className="text-slate-500 text-[11px]">
                          {order.shippingAddress.addressLine}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
                        </p>
                      </div>
                    </div>

                    {/* STEP-BY-STEP PROGRESS UPDATE BUTTONS */}
                    <div className="space-y-2 pt-2 text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        Courier Delivery Action Pipeline:
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {order.orderStatus === 'courier_assigned' && (
                          <button
                            onClick={() => onUpdateDeliveryStatus(order.id, 'picked_up', 'Courier picked up parcel from seller')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>1. Picked Up from Seller</span>
                          </button>
                        )}

                        {order.orderStatus === 'picked_up' && (
                          <button
                            onClick={() => onUpdateDeliveryStatus(order.id, 'in_transit', 'Package in transit to customer locality')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>2. Mark In Transit</span>
                          </button>
                        )}

                        {order.orderStatus === 'in_transit' && (
                          <button
                            onClick={() => onUpdateDeliveryStatus(order.id, 'out_for_delivery', 'Courier is out for delivery to doorstep')}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>3. Out for Delivery</span>
                          </button>
                        )}

                        {order.orderStatus === 'out_for_delivery' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedOrderForOtp(order);
                                setEnteredOtp('');
                                setOtpError('');
                              }}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                              <span>4. Verify Customer OTP & Complete</span>
                            </button>

                            {/* Mark Failed Delivery Button */}
                            <button
                              onClick={() => {
                                setSelectedOrderForFail(order);
                                setFailReason('customer_refused');
                                setFailNotes('');
                              }}
                              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                            >
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>Report Failed Delivery</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
                <p className="text-sm font-semibold">No active deliveries on the road.</p>
                <p className="text-xs">Accept ready parcels from the 'Available Hub Pickups' tab to start delivering!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETED DELIVERIES */}
      {activeTab === 'completed' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Delivered Orders History</h3>
            <span className="text-xs text-slate-500">{myCompletedDeliveries.length} completed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Delivery Date</th>
                  <th className="p-3">OTP Verified</th>
                  <th className="p-3 text-right">Compensation</th>
                  <th className="p-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myCompletedDeliveries.length > 0 ? (
                  myCompletedDeliveries.map((order) => {
                    const isCod = order.paymentMethod === 'cod';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">#{order.orderNumber}</td>
                        <td className="p-3">{order.customerName}</td>
                        <td className="p-3">
                          {isCod ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              COD: ₹{order.totalPayable}
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              Prepaid
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{new Date(order.updatedAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 text-emerald-600 font-bold">✓ Verified via OTP</td>
                        <td className="p-3 text-right font-black text-emerald-600 tabular-nums">
                          +₹{courierFeePerDelivery}
                        </td>
                        <td className="p-3 text-center">
                          {isCod && (
                            <button
                              onClick={() => {
                                setSelectedReceiptOrder(order);
                                setShowReceiptModal(true);
                              }}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="View Cash Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No completed deliveries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COD CASH & DEPOSITS MANAGEMENT */}
      {activeTab === 'cod_cash' && (
        <div className="space-y-6">
          {/* Key Cash In Hand Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Currently Held</span>
              <div className="text-xl font-black text-emerald-600 tabular-nums">
                ₹{cashStats.cashInHand.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                Outstanding Liability
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Customer Cash Collected</span>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                ₹{cashStats.totalCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500">From {myCompletedDeliveries.filter((o) => o.paymentMethod === 'cod').length} COD deliveries</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposits Pending Verification</span>
              <div className="text-xl font-black text-amber-600 tabular-nums">
                ₹{cashStats.pendingVerification.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500">Submitted with UTR/reference</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposits Verified by Owner</span>
              <div className="text-xl font-black text-indigo-600 tabular-nums">
                ₹{cashStats.verifiedDeposited.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-bold text-emerald-600">✓ Safely Settled</span>
            </div>
          </div>

          {/* Deposit Trigger Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-300" />
                <h4 className="font-extrabold text-sm sm:text-base">Deposit Cash to Platform / Owner</h4>
              </div>
              <p className="text-xs text-emerald-100 max-w-xl">
                Transfer collected doorstep cash via Bank NEFT/RTGS, UPI, or Cash Office. Enter your transaction UTR reference for owner verification.
              </p>
            </div>

            <button
              onClick={() => {
                setDepositAmount(cashStats.cashInHand.toString());
                setShowDepositModal(true);
              }}
              disabled={cashStats.cashInHand <= 0}
              className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit Cash Deposit Now</span>
            </button>
          </div>

          {/* Deposit History & Audit Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Your Cash Deposit Submissions</h3>
              <span className="text-xs text-slate-500">{myDeposits.length} deposits recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Deposit #</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Orders Covered</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Bank UTR / Transaction Ref</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myDeposits.length > 0 ? (
                    myDeposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{dep.depositNumber}</td>
                        <td className="p-3 text-slate-500">{new Date(dep.depositedAt).toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            {dep.orderNumbers.join(', ') || `${dep.orderIds.length} orders`}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{dep.paymentMode.replace('_', ' ')}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{dep.transactionReference}</td>
                        <td className="p-3 text-right font-black tabular-nums text-slate-900 dark:text-white">
                          ₹{dep.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            dep.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dep.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {dep.status === 'verified'
                              ? '✓ Verified by Owner'
                              : dep.status === 'rejected'
                              ? '✕ Discrepancy / Rejected'
                              : '⏳ Pending Verification'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No deposits submitted yet. Once you collect cash on delivery, submit your deposit here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EARNINGS & PAYOUTS */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Earned</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500">₹{courierFeePerDelivery} per successfully delivered order</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available for Withdrawal</span>
              <div className="text-2xl font-black text-emerald-600 tabular-nums">
                ₹{Math.max(0, availableEarnings).toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500">Instant transfer to your registered UPI</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI Handle</span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-1">
                  {currentCourier.upiId || 'courier@upi'}
                </p>
              </div>

              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={availableEarnings <= 0}
                className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                Request Earnings Payout
              </button>
            </div>
          </div>

          {/* Ledger table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Courier Compensation Ledger</h3>
              <span className="text-xs text-slate-500">{courierLedger.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {courierLedger.length > 0 ? (
                    courierLedger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                        <td className="p-3 font-mono text-slate-500">#{item.referenceOrderId || 'SYSTEM'}</td>
                        <td className={`p-3 text-right font-black tabular-nums ${item.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.type === 'credit' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                          ₹{item.balanceAfter.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No transactions recorded yet in your courier ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OTP Delivery Verification Modal */}
      {selectedOrderForOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Verify Customer Delivery OTP</h3>
              </div>
              <button onClick={() => setSelectedOrderForOtp(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              Ask the customer for the 6-digit verification code shown on their order tracking screen:
            </p>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full p-3 border-2 border-emerald-500 rounded-lg text-center font-mono text-2xl font-black tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {otpError && (
                <div className="text-rose-600 font-bold text-center text-xs bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200">
                  {otpError}
                </div>
              )}

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Payment Collection: <strong>{selectedOrderForOtp.paymentMethod.toUpperCase()}</strong> ({selectedOrderForOtp.paymentStatus === 'paid' ? 'Paid Online' : `Collect ₹${selectedOrderForOtp.totalPayable} Cash`})
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForOtp(null)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || enteredOtp.length !== 6}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded disabled:opacity-50 transition-colors"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Failed Delivery Modal */}
      {selectedOrderForFail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Report Delivery Failure</h3>
              </div>
              <button onClick={() => setSelectedOrderForFail(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Order #{selectedOrderForFail.orderNumber} will be marked as failed and queued for Return to Origin (RTO).
            </p>

            <form onSubmit={handleReportFailSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Failure Reason</label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value as CodFailureReason)}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="customer_refused">Customer refused delivery</option>
                  <option value="customer_unavailable">Customer unavailable / Door locked</option>
                  <option value="incorrect_address">Incorrect address or phone unreachable</option>
                  <option value="cash_not_ready">Customer cash was not ready for COD</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Courier Remarks (Optional)</label>
                <textarea
                  rows={3}
                  value={failNotes}
                  onChange={(e) => setFailNotes(e.target.value)}
                  placeholder="e.g. Called customer 3 times, door locked at Connaught Place"
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForFail(null)}
                  className="px-3 py-1.5 border rounded text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFail}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded"
                >
                  {isSubmittingFail ? 'Submitting...' : 'Confirm Delivery Failure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Cash Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Deposit Cash to Platform</h3>
              </div>
              <button onClick={() => setShowDepositModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Cash currently held in hand: <strong className="text-emerald-600 font-extrabold">₹{cashStats.cashInHand.toLocaleString('en-IN')}</strong>.
              Enter bank/UPI deposit details for owner verification:
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deposit Amount (₹)</label>
                <input
                  type="number"
                  required
                  max={cashStats.cashInHand}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-2 border rounded font-black text-base tabular-nums bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deposit Mode</label>
                <select
                  value={depositMode}
                  onChange={(e) => setDepositMode(e.target.value as any)}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value="upi">UPI Transfer (to owner handle)</option>
                  <option value="cash_counter">Cash Office Counter Receipt</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Bank UTR / UPI Ref / Slip Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="e.g. UTR198273645281 or UPI 40982312"
                  className="w-full p-2 border rounded font-mono font-bold bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. Deposited at Delhi Central HDFC branch"
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>

              {depositError && (
                <div className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200">
                  {depositError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-1.5 border rounded text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded"
                >
                  {isSubmittingDeposit ? 'Submitting...' : 'Submit Deposit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Withdrawal Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Withdraw Delivery Earnings</h3>
            <p className="text-slate-500">
              Available for withdrawal: <strong className="text-emerald-600 font-bold">₹{Math.max(0, availableEarnings).toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handlePayoutSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Amount to Withdraw (₹)</label>
                <input
                  type="number"
                  required
                  max={availableEarnings}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full mt-1 p-2 border rounded font-black text-base tabular-nums"
                />
              </div>

              {payoutError && (
                <div className="text-rose-600 font-bold text-xs bg-rose-50 p-2 rounded">
                  {payoutError}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-[11px] text-slate-500">
                Direct UPI Transfer to: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentCourier.upiId || 'courier@upi'}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPayoutModal(false)} className="px-3 py-1.5 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded">
                  Confirm Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Collection Receipt Modal */}
      {showReceiptModal && selectedReceiptOrder && (
        <CashReceiptModal
          order={selectedReceiptOrder}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
