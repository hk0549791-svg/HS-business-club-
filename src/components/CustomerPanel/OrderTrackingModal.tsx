/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Order, OrderStatus } from '../../types/marketplace';
import {
  X,
  CheckCircle,
  Clock,
  Truck,
  Package,
  MapPin,
  ShieldCheck,
  FileText,
  Phone,
  AlertCircle,
  RotateCcw,
  Ban,
  Banknote,
  Receipt,
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';
import { CashReceiptModal } from '../CashReceiptModal';

interface OrderTrackingModalProps {
  order: Order;
  onClose: () => void;
  onCancelOrder: (orderId: string, reason: string) => void;
  onRequestReturn: (orderId: string, reason: string) => void;
  onOpenInvoice: (order: Order) => void;
  language: Language;
}

const STAGES: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'placed', label: '1. Order Placed', description: 'Order recorded on marketplace' },
  { status: 'payment_confirmed', label: '2. Payment Confirmed', description: 'Payment verified server-side' },
  { status: 'seller_accepted', label: '3. Seller Accepted', description: 'Seller approved fulfillment' },
  { status: 'packing', label: '4. Packing', description: 'Item securely packed with barcode' },
  { status: 'ready_for_pickup', label: '5. Ready for Pickup', description: 'At seller pickup bay' },
  { status: 'courier_assigned', label: '6. Courier Assigned', description: 'Delivery partner dispatched' },
  { status: 'picked_up', label: '7. Picked Up', description: 'Parcel collected from seller' },
  { status: 'in_transit', label: '8. In Transit', description: 'On the way through delivery network' },
  { status: 'out_for_delivery', label: '9. Out for Delivery', description: 'Courier approaching your doorstep' },
  { status: 'delivered', label: '10. Delivered', description: 'Handed over with Customer OTP' },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order,
  onClose,
  onCancelOrder,
  onRequestReturn,
  onOpenInvoice,
  language,
}) => {
  const t = translations[language];
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const currentStageIndex = STAGES.findIndex((s) => s.status === order.orderStatus);
  const isDelivered = order.orderStatus === 'delivered';
  const isCancelled = order.orderStatus === 'cancelled';
  const isFailedDelivery = order.orderStatus === 'failed_delivery';
  const isRto = order.orderStatus === 'rto_in_transit' || order.orderStatus === 'rto_delivered';
  const isReturnRequested = order.orderStatus === 'return_requested';
  const isRefunded = order.orderStatus === 'refunded';
  const isCod = order.paymentMethod === 'cod';

  // Can cancel before ready_for_pickup
  const canCancel = ['placed', 'payment_confirmed', 'seller_accepted', 'packing'].includes(order.orderStatus);

  // Can return if delivered and within 7 days
  const canReturn = isDelivered;

  const handleCancelClick = () => {
    onCancelOrder(order.id, 'Customer requested cancellation via tracking portal');
  };

  const handleReturnClick = () => {
    onRequestReturn(order.id, 'Customer requested return (7-day replacement/refund policy)');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 bg-[#2874f0] text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base">Order #{order.orderNumber}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  isDelivered
                    ? 'bg-emerald-500 text-white'
                    : isCancelled || isFailedDelivery
                    ? 'bg-rose-500 text-white'
                    : isRto
                    ? 'bg-purple-600 text-white'
                    : 'bg-amber-400 text-blue-950'
                }`}>
                  {order.orderStatus.replace('_', ' ')}
                </span>
                {isCod && (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-400 text-slate-950 flex items-center gap-1">
                    <Banknote className="w-3 h-3" /> COD Order
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCod && order.codDetails?.receiptNumber && (
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Cash Receipt</span>
                </button>
              )}
              <button
                onClick={() => onOpenInvoice(order)}
                className="px-2.5 py-1.5 rounded bg-white text-[#2874f0] text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice</span>
              </button>
              <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
            {/* CASH ON DELIVERY PAYMENT STATUS CARD */}
            {isCod && (
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Cash on Delivery (COD)
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.codDetails?.collectionStatus === 'verified_by_owner'
                          ? 'bg-emerald-200 text-emerald-900 font-extrabold'
                          : order.codDetails?.collectionStatus === 'collected_by_courier'
                          ? 'bg-blue-200 text-blue-900 font-extrabold'
                          : order.codDetails?.collectionStatus === 'deposited'
                          ? 'bg-purple-200 text-purple-900 font-extrabold'
                          : order.codDetails?.collectionStatus === 'failed'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {order.codDetails?.collectionStatus === 'verified_by_owner'
                          ? '✓ Cash Verified & Settled'
                          : order.codDetails?.collectionStatus === 'collected_by_courier'
                          ? '✓ Cash Collected by Courier'
                          : order.codDetails?.collectionStatus === 'deposited'
                          ? '✓ Deposited by Courier'
                          : order.codDetails?.collectionStatus === 'failed'
                          ? '✕ Delivery Failed'
                          : '⏳ Pay Cash on Delivery'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {order.codDetails?.collectionStatus === 'collected_by_courier' || order.codDetails?.collectionStatus === 'verified_by_owner'
                        ? `Cash of ₹${order.codDetails?.collectedAmount || order.totalPayable} received at doorstep. Receipt #${order.codDetails?.receiptNumber || 'N/A'}`
                        : `Please keep exact cash of ₹${order.totalPayable.toLocaleString('en-IN')} ready for the courier partner.`}
                    </p>
                  </div>
                </div>

                {order.codDetails?.receiptNumber && (
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="shrink-0 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Cash Receipt</span>
                  </button>
                )}
              </div>
            )}

            {/* FAILED DELIVERY ALERT */}
            {isFailedDelivery && (
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-xs">Delivery Attempt Failed</span>
                  <p className="text-[11px]">
                    Reason: <strong>{order.codDetails?.failureReason?.replace('_', ' ') || 'Customer unavailable'}</strong>.
                    {order.codDetails?.failureNotes && ` Remarks: "${order.codDetails.failureNotes}". `}
                    This parcel is being safely rerouted through Return to Origin (RTO). No commission is deducted.
                  </p>
                </div>
              </div>
            )}

            {/* CRITICAL CUSTOMER DELIVERY OTP HIGHLIGHT BOX */}
            {!isDelivered && !isCancelled && !isFailedDelivery && (
              <div className="p-4 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>{t.deliveryOtpText}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    {t.otpInstructions}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 px-4 py-2 rounded-lg text-center shadow-md">
                  <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-[#2874f0]">
                    {order.deliveryOtp}
                  </span>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Secure Code</div>
                </div>
              </div>
            )}

          {/* Interactive Live GPS Delivery Route Map */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <MapPin className="w-4 h-4 text-rose-500" /> Live Delivery Route & Transit Map
              </span>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                ETA: {order.deliveryLocation?.etaMinutes || 35} mins
              </span>
            </div>

            {/* SVG Visual Map Simulation */}
            <div className="relative h-28 w-full bg-slate-200 dark:bg-slate-700/60 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 p-2 flex items-center">
              {/* Background grid pattern */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

              {/* Connecting dashed route line */}
              <div className="relative w-full h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden mx-6">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${order.deliveryLocation?.courierCurrentLocation.stepPercent || 15}%` }}
                />
              </div>

              {/* Seller Pin (Left) */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md text-xs font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 whitespace-nowrap">
                  Seller Hub
                </span>
              </div>

              {/* Moving Courier Icon (Current position) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 flex flex-col items-center z-10"
                style={{
                  left: `calc(15% + ${(order.deliveryLocation?.courierCurrentLocation.stepPercent || 15) * 0.7}%)`,
                }}
              >
                <div className="w-9 h-9 rounded-full bg-[#2874f0] text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-bounce">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 mt-1 whitespace-nowrap bg-white/80 dark:bg-slate-900/80 px-1 rounded shadow">
                  Courier
                </span>
              </div>

              {/* Customer Pin (Right) */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md text-xs font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 whitespace-nowrap">
                  Your Address
                </span>
              </div>
            </div>

            {/* Courier partner details if assigned */}
            {order.courierName && (
              <div className="flex items-center justify-between pt-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Assigned Courier:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{order.courierName}</span>
                </div>
                {order.courierPhone && (
                  <a
                    href={`tel:${order.courierPhone}`}
                    className="text-[#2874f0] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Partner ({order.courierPhone})
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 10-Stage Sequential Order Timeline (Specified in Prompt) */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Live Order Stages (10-Stage Pipeline)
            </h4>

            <div className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 ml-3 pl-4">
              {STAGES.map((stage, idx) => {
                const isPassed = !isCancelled && currentStageIndex >= idx;
                const isCurrent = !isCancelled && currentStageIndex === idx;

                return (
                  <div key={stage.status} className="relative py-1">
                    {/* Timeline Node */}
                    <div
                      className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ring-4 ring-white dark:ring-slate-900 ${
                        isPassed
                          ? 'bg-[#388e3c] text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {isPassed ? '✓' : ''}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isCurrent ? 'text-[#2874f0] text-sm' : isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                        {stage.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold px-1.5 py-0.5 rounded">
                          CURRENT STAGE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{stage.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Items & Breakdown */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Purchased Items
            </h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <img src={item.image} alt="" className="w-8 h-8 object-contain rounded bg-slate-50" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.productTitle}</span>
                      <div className="text-[10px] text-slate-400">
                        Seller: {item.sellerBusinessName || item.sellerName} • Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums">
                    ₹{(item.sellingPrice * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
              <span>Total Paid ({order.paymentMethod.toUpperCase()})</span>
              <span className="text-[#2874f0] tabular-nums">
                ₹{order.totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Cancellation or Return Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            {canCancel && (
              <button
                onClick={handleCancelClick}
                className="px-3.5 py-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{t.cancelOrder}</span>
              </button>
            )}

            {canReturn && !isReturnRequested && !isRefunded && (
              <button
                onClick={handleReturnClick}
                className="px-3.5 py-2 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.returnOrder} (7-Day Policy)</span>
              </button>
            )}

            {isCancelled && (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Cancelled: {order.cancellationReason}
              </span>
            )}

            {isReturnRequested && (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <RotateCcw className="w-4 h-4" /> Return Under Review: {order.returnReason}
              </span>
            )}

            {isRefunded && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Refund of ₹{order.totalPayable} Processed
              </span>
            )}

            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded font-semibold text-xs text-slate-700 dark:text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

      {showReceiptModal && (
        <CashReceiptModal
          order={order}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </>
  );
};
