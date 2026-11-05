/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Banknote } from 'lucide-react';
import type { Order } from '../types/marketplace.js';

interface CashReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CashReceiptModal: React.FC<CashReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const receiptNumber = order.codDetails?.receiptNumber || `RCP-COD-${order.orderNumber}`;
  const collectionDate = order.codDetails?.collectedAt
    ? new Date(order.codDetails.collectedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date(order.updatedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6 flex flex-col">
        {/* Header Actions */}
        <div className="p-4 bg-emerald-700 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-sm sm:text-base">
              COD Cash Collection Receipt
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 bg-white space-y-5 text-xs sm:text-sm font-sans" id="cod-receipt-content">
          {/* Top Brand Banner */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-base font-extrabold tracking-tight text-[#2874f0]">
              <span className="bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded text-xs font-black">HS</span>
              <span>market CLUB</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Official Doorstep Cash Collection Acknowledgement
            </p>
            <div className="pt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>CASH RECEIVED AT DOORSTEP</span>
            </div>
          </div>

          {/* Receipt Identifiers */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Receipt Number</p>
              <p className="font-mono font-bold text-slate-900 text-xs">{receiptNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Order Number</p>
              <p className="font-mono font-bold text-slate-900 text-xs">#{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Date & Time</p>
              <p className="font-medium text-slate-800">{collectionDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Payment Mode</p>
              <p className="font-bold text-emerald-700">Cash on Delivery</p>
            </div>
          </div>

          {/* Customer & Courier Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded border border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Received From (Customer)</p>
              <p className="font-bold text-slate-900">{order.customerName}</p>
              <p className="text-slate-600">{order.customerPhone}</p>
              <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">
                {order.shippingAddress.addressLine}, {order.shippingAddress.locality}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
              </p>
            </div>

            <div className="p-2.5 rounded border border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Collected By (Delivery Partner)</p>
              <p className="font-bold text-slate-900">{order.courierName || 'Authorized Courier Partner'}</p>
              <p className="text-slate-600">{order.courierPhone || 'Registered Delivery Agent'}</p>
              <p className="text-emerald-600 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Identity Verified via OTP
              </p>
            </div>
          </div>

          {/* Line Items Summary */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-600 uppercase flex justify-between">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {order.items.map((item) => (
                <div key={item.id} className="p-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900 line-clamp-1">{item.productTitle}</p>
                    <p className="text-[10px] text-slate-500">
                      Qty: {item.quantity} {item.size ? `• Size: ${item.size}` : ''}
                    </p>
                  </div>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    ₹{(item.sellingPrice * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-3 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon Discount</span>
                  <span className="tabular-nums">-₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge</span>
                <span>{order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
                <span className="text-emerald-800">Total Cash Collected</span>
                <span className="text-base text-emerald-700 font-mono font-black tabular-nums">
                  ₹{(order.codDetails?.collectedAmount || order.totalPayable).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Verification Note & Seal */}
          <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-700">Himanshu Kushwaha (H/S)</p>
              <p className="text-[10px]">HS market CLUB Central Marketplace Engine</p>
            </div>
            <div className="text-right">
              <span className="border border-emerald-600 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                VALID CASH RECEIPT
              </span>
            </div>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
