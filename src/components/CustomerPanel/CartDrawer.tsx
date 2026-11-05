/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { CartItem } from '../../types/marketplace';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Tag,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  couponCode: string;
  onApplyCoupon: (code: string) => void;
  onProceedToCheckout: () => void;
  language: Language;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  couponCode,
  onApplyCoupon,
  onProceedToCheckout,
  language,
}) => {
  const [inputCoupon, setInputCoupon] = useState('');
  const t = translations[language];

  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const mrpTotal = cartItems.reduce(
    (sum, item) => sum + item.product.mrp * item.quantity,
    0
  );
  const savings = mrpTotal > subtotal ? mrpTotal - subtotal : 0;

  let discount = 0;
  if (couponCode === 'HSCLUB100' && subtotal >= 500) {
    discount = 100;
  } else if (couponCode === 'WELCOME50') {
    discount = 50;
  }

  const deliveryCharge = subtotal >= 500 || subtotal === 0 ? 0 : 40;
  const finalPayable = Math.max(0, subtotal - discount + deliveryCharge);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 bg-[#2874f0] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="text-base font-bold">My Shopping Cart ({cartItems.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length > 0 ? (
            <>
              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const discountPct = item.product.mrp > item.product.sellingPrice
                    ? Math.round(((item.product.mrp - item.product.sellingPrice) / item.product.mrp) * 100)
                    : 0;

                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex gap-3 shadow-xs"
                    >
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded p-1 shrink-0 flex items-center justify-center">
                        <img
                          src={item.product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                          alt={item.product.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {item.product.title}
                          </h4>
                          {(item.selectedSize || item.selectedColor) && (
                            <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                              {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                              {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                            </div>
                          )}
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                              ₹{(item.product.sellingPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                            {item.product.mrp > item.product.sellingPrice && (
                              <span className="text-xs text-slate-400 line-through tabular-nums">
                                ₹{(item.product.mrp * item.quantity).toLocaleString('en-IN')}
                              </span>
                            )}
                            {discountPct > 0 && (
                              <span className="text-[10px] font-bold text-[#388e3c]">
                                {discountPct}% off
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Stepper & Remove */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded">
                            <button
                              onClick={() => onUpdateQuantity(item.productId, -1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.productId, 1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.productId)}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Section */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Apply Discount Coupon</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. HSCLUB100)"
                    className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 uppercase font-semibold"
                  />
                  <button
                    onClick={() => {
                      onApplyCoupon(inputCoupon);
                      setInputCoupon('');
                    }}
                    className="px-3 py-1.5 bg-[#2874f0] hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponCode && (
                  <div className="text-[11px] font-bold text-emerald-600 flex items-center justify-between">
                    <span>✓ Coupon '{couponCode}' Applied (-₹{discount})</span>
                    <button onClick={() => onApplyCoupon('')} className="text-rose-500 hover:underline">
                      Remove
                    </button>
                  </div>
                )}
                <div className="text-[10px] text-slate-400">
                  Try coupon <span className="font-mono font-bold text-blue-600">HSCLUB100</span> (₹100 off on ₹500+) or <span className="font-mono font-bold text-blue-600">WELCOME50</span>.
                </div>
              </div>

              {/* Price Details Breakdown */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] border-b pb-1">
                  Price Details
                </h4>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Price ({cartItems.length} items)</span>
                  <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span className="tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Delivery Charges</span>
                  <span className="tabular-nums">
                    {deliveryCharge === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${deliveryCharge}`
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>{t.finalPayable}</span>
                  <span className="text-[#2874f0] tabular-nums">
                    ₹{finalPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                {savings > 0 && (
                  <div className="text-[11px] text-[#388e3c] font-semibold text-center pt-1 bg-emerald-50 dark:bg-emerald-950/40 rounded py-1">
                    You will save ₹{(savings + discount).toLocaleString('en-IN')} on this order!
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#2874f0]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your Cart is Empty
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Explore thousands of genuine products on HS market CLUB and add them to your cart.
              </p>
            </div>
          )}
        </div>

        {/* Footer Checkout Bar */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Total Amount
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                ₹{finalPayable.toLocaleString('en-IN')}
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="flex-1 py-3 px-4 bg-[#fb641b] hover:bg-orange-600 text-white font-black text-sm rounded shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
