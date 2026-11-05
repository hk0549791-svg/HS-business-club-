/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Order } from '../types/marketplace';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const sellerName = order.items[0]?.sellerBusinessName || order.items[0]?.sellerName || 'HS market CLUB Authorized Merchant';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto no-print">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden my-6 flex flex-col max-h-[94vh] border border-slate-300">
        {/* Modal Toolbar */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between no-print">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Official GST Tax Invoice • HS market CLUB
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#2874f0] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-xs font-sans print:p-0 print:m-0">
          {/* Top Brand & Invoice Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black italic text-2xl text-[#2874f0]">
                  HS <span className="text-amber-500 font-extrabold not-italic">market</span>
                </span>
                <span className="bg-amber-400 text-blue-900 text-[10px] font-black uppercase px-1.5 py-0.5 rounded italic">
                  CLUB
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                India's Multi-Vendor Commerce Platform • www.hsmarketclub.com
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
                TAX INVOICE
              </h2>
              <p className="font-mono font-bold text-xs">Invoice No: {order.invoiceNumber}</p>
              <p className="text-[11px] text-slate-500">
                Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Seller & Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b border-slate-200">
            {/* Sold By */}
            <div className="space-y-1">
              <span className="font-bold uppercase text-[11px] text-slate-500">Sold By (Seller):</span>
              <p className="font-black text-sm text-slate-900">{sellerName}</p>
              <p className="text-slate-600">Fulfillment Hub 104, Okhla Industrial Area Phase-III</p>
              <p className="text-slate-600">New Delhi - 110020, Delhi, India</p>
              <p className="font-mono text-slate-700">GSTIN: 07AABCU9603R1ZM</p>
              <p className="font-mono text-slate-700">PAN: AABCU9603R</p>
            </div>

            {/* Billing / Shipping */}
            <div className="space-y-1 sm:text-right">
              <span className="font-bold uppercase text-[11px] text-slate-500">Billing & Shipping To:</span>
              <p className="font-black text-sm text-slate-900">{order.shippingAddress.name}</p>
              <p className="text-slate-600">{order.shippingAddress.addressLine}, {order.shippingAddress.locality}</p>
              <p className="text-slate-600">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
              <p className="text-slate-600">Mobile: {order.shippingAddress.phone}</p>
              <p className="font-mono text-slate-700">Order ID: #{order.orderNumber}</p>
            </div>
          </div>

          {/* Line items Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">SKU / HSN</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2.5 text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-slate-900">
                      {item.productTitle}
                      {item.size && <span className="text-slate-500 text-[10px]"> (Size: {item.size})</span>}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">{item.sku}</td>
                    <td className="p-2.5 text-center font-bold tabular-nums">{item.quantity}</td>
                    <td className="p-2.5 text-right tabular-nums">₹{item.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-bold tabular-nums">
                      ₹{(item.sellingPrice * item.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Breakdown */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="tabular-nums font-semibold">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount:</span>
                  <span className="tabular-nums">-₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping / Delivery:</span>
                <span className="tabular-nums font-semibold">
                  {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (Integrated / State):</span>
                <span className="tabular-nums font-semibold">Included in Price</span>
              </div>
              <div className="pt-2 border-t-2 border-slate-900 flex justify-between font-black text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-[#2874f0] tabular-nums">
                  ₹{order.totalPayable.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                Payment Mode: <strong className="uppercase">{order.paymentMethod}</strong> ({order.paymentStatus})
              </div>
            </div>
          </div>

          {/* Signatures & Declarations */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
            <div className="space-y-1 max-w-sm">
              <p className="font-semibold text-slate-700">Declaration:</p>
              <p>
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </p>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <div className="font-black text-slate-900 italic text-sm">
                For {sellerName}
              </div>
              <div className="h-8 flex items-center justify-center sm:justify-end">
                <span className="font-mono text-xs text-blue-700 font-bold border-b border-blue-700">
                  Authorized Signatory [DIGITALLY SIGNED]
                </span>
              </div>
              <p className="text-[9px] text-slate-400">Electronic Verification Code Generated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
