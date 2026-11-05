/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Order } from '../../types/marketplace';
import { X, Package, ChevronRight, FileText, Clock, CheckCircle, Ban, RotateCcw } from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onOpenInvoice: (order: Order) => void;
  language: Language;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  onSelectOrder,
  onOpenInvoice,
  language,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#2874f0] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="font-extrabold text-base">My Orders History ({orders.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orders.length > 0 ? (
            orders.map((order) => {
              const isDelivered = order.orderStatus === 'delivered';
              const isCancelled = order.orderStatus === 'cancelled';

              return (
                <div
                  key={order.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all bg-white dark:bg-slate-800/60 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white">
                        Order #{order.orderNumber}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>

                      <button
                        onClick={() => onOpenInvoice(order)}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Tax Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items thumbnail list */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded shrink-0">
                        <img src={item.image} alt="" className="w-8 h-8 object-contain rounded bg-white" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                          {item.productTitle}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom bar with total and track action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      Total: ₹{order.totalPayable.toLocaleString('en-IN')}
                    </span>

                    <button
                      onClick={() => onSelectOrder(order)}
                      className="px-3 py-1.5 rounded bg-[#2874f0] text-white font-extrabold text-xs flex items-center gap-1 hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <span>Track Order</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">You have no orders yet.</p>
              <p className="text-xs">Browse products and place your first order!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
