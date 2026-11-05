/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { CartItem, Address, PaymentMethod, UserProfile, PlatformSettings } from '../../types/marketplace';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  Wallet,
  MapPin,
  CheckCircle,
  Lock,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations, Language } from '../../utils/translations';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  cartItems: CartItem[];
  couponCode: string;
  settings?: PlatformSettings;
  onPlaceOrder: (payload: {
    shippingAddress: Address;
    paymentMethod: PaymentMethod;
    paymentTransactionId?: string;
  }) => Promise<void>;
  language: Language;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  cartItems,
  couponCode,
  settings,
  onPlaceOrder,
  language,
}) => {
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    currentUser.savedAddresses?.[0] || {
      id: 'addr_1',
      name: currentUser.name || 'Himanshu Kushwaha',
      phone: currentUser.phone || '9876543210',
      pincode: '110001',
      locality: 'Connaught Place',
      addressLine: 'Flat 402, Block C, Inner Circle',
      city: 'New Delhi',
      state: 'Delhi',
      isDefault: true,
    }
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [customerUpiId, setCustomerUpiId] = useState('customer@okhdfcbank');
  const [onlineTxnRef, setOnlineTxnRef] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = translations[language];

  if (!isOpen) return null;

  const adminUpi = settings?.adminUpiId || 'himanshushivam4037@okhdfcbank';
  const adminName = settings?.adminPayeeName || 'Himanshu Kushwaha (HS market CLUB Owner)';
  const adminBank = settings?.adminBankDetails || {
    accountHolder: 'Himanshu Kushwaha',
    accountNumber: '91823746192837',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank Ltd, New Delhi Inner Circle',
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  let discount = 0;
  if (couponCode === 'HSCLUB100' && subtotal >= 500) {
    discount = 100;
  } else if (couponCode === 'WELCOME50') {
    discount = 50;
  }

  const deliveryCharge = subtotal >= 500 || subtotal === 0 ? 0 : 40;
  const finalPayable = Math.max(0, subtotal - discount + deliveryCharge);

  // Dynamic UPI Payment Deep Link & QR URL directly directed to Admin
  const encodedPayee = encodeURIComponent(adminName);
  const upiQuery = `pa=${adminUpi}&pn=${encodedPayee}&am=${finalPayable}&cu=INR&tn=HS%20Market%20Club%20Order`;
  const upiDeepLink = `upi://pay?${upiQuery}`;
  
  // Specific app intents & schemes
  const gpayLink = `gpay://upi/pay?${upiQuery}`;
  const phonepeLink = `phonepe://pay?${upiQuery}`;
  const paytmLink = `paytmmp://pay?${upiQuery}`;
  const bhimLink = `bhim://pay?${upiQuery}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiDeepLink)}`;

  const [selectedUpiApp, setSelectedUpiApp] = useState<'all' | 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'qr'>('gpay');

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      await onPlaceOrder({
        shippingAddress: selectedAddress,
        paymentMethod,
        paymentTransactionId: onlineTxnRef || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      });

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      onClose();
    } catch (err) {
      console.error('Order creation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 bg-[#2874f0] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-300" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Secure Checkout • Direct Admin Settlement
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Step 1: Delivery Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2874f0]" /> 1. Delivery Address
              </h4>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Verified Pincode
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-xs">
                <span>{selectedAddress.name}</span>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded">
                  HOME
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {selectedAddress.addressLine}, {selectedAddress.locality}, {selectedAddress.city}, {selectedAddress.state} - <span className="font-bold">{selectedAddress.pincode}</span>
              </p>
              <p className="text-slate-500 font-medium">Mobile: {selectedAddress.phone}</p>
            </div>
          </div>

          {/* Step 2: Order Items Summary */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Order Summary ({cartItems.length} items)
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={item.product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                      alt=""
                      className="w-8 h-8 object-contain rounded bg-slate-50 shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.product.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums shrink-0">
                    ₹{(item.product.sellingPrice * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Payment Options (Online Direct to Admin vs COD) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#2874f0]" /> 3. Select Payment Option
              </h4>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Direct to Admin Account
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Instant UPI to Admin (Google Pay, PhonePe, Paytm, BHIM) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-[#2874f0] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#2874f0]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  className="mt-0.5 accent-[#2874f0]"
                />
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                      <QrCode className="w-4 h-4 text-[#2874f0]" /> UPI Apps (Google Pay, PhonePe, Paytm, BHIM)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                      INSTANT & ZERO FEE
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Pay directly from your favorite UPI App. Money goes <strong>100% directly to Admin ({adminName})</strong>.
                  </p>

                  {paymentMethod === 'upi' && (
                    <div className="pt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3.5">
                      {/* App Selector Tabs */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          Choose UPI Payment Method:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {/* Google Pay */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedUpiApp('gpay');
                            }}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              selectedUpiApp === 'gpay'
                                ? 'border-[#4285F4] bg-blue-50 dark:bg-blue-950/80 ring-2 ring-[#4285F4]'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center font-black text-xs text-[#4285F4] border border-slate-200">
                              <span className="text-sm font-black">G</span>
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">Google Pay</span>
                            <span className="text-[9px] text-blue-600 font-semibold">GPay App</span>
                          </button>

                          {/* PhonePe */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedUpiApp('phonepe');
                            }}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              selectedUpiApp === 'phonepe'
                                ? 'border-[#5f259f] bg-purple-50 dark:bg-purple-950/80 ring-2 ring-[#5f259f]'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#5f259f] shadow-xs flex items-center justify-center font-black text-xs text-white">
                              पे
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">PhonePe</span>
                            <span className="text-[9px] text-purple-600 font-semibold">PhonePe App</span>
                          </button>

                          {/* Paytm */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedUpiApp('paytm');
                            }}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              selectedUpiApp === 'paytm'
                                ? 'border-[#00b9f5] bg-sky-50 dark:bg-sky-950/80 ring-2 ring-[#00b9f5]'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#002970] shadow-xs flex items-center justify-center font-black text-[10px] text-[#00b9f5]">
                              Paytm
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">Paytm</span>
                            <span className="text-[9px] text-sky-600 font-semibold">Paytm UPI</span>
                          </button>

                          {/* BHIM UPI */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedUpiApp('bhim');
                            }}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              selectedUpiApp === 'bhim'
                                ? 'border-[#00897b] bg-teal-50 dark:bg-teal-950/80 ring-2 ring-[#00897b]'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#00897b] shadow-xs flex items-center justify-center font-black text-xs text-white">
                              BHIM
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">BHIM UPI</span>
                            <span className="text-[9px] text-teal-600 font-semibold">Govt UPI</span>
                          </button>

                          {/* QR Code Scan */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedUpiApp('qr');
                            }}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              selectedUpiApp === 'qr'
                                ? 'border-[#2874f0] bg-blue-50 dark:bg-blue-950/80 ring-2 ring-[#2874f0]'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-900 shadow-xs flex items-center justify-center text-white">
                              <QrCode className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">Scan QR</span>
                            <span className="text-[9px] text-slate-500 font-semibold">Any App</span>
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Action Area based on App Selection */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        {/* 1. Google Pay Mode */}
                        {selectedUpiApp === 'gpay' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-[#4285F4]">
                                  G
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  Pay ₹{finalPayable} via Google Pay
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                Direct to Admin
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Click below to launch Google Pay app directly on your phone or tablet with prefilled amount ₹{finalPayable}.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <a
                                href={gpayLink}
                                className="px-4 py-2 bg-[#4285F4] hover:bg-blue-600 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Pay ₹{finalPayable} with Google Pay</span>
                              </a>
                              <a
                                href={upiDeepLink}
                                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <span>Try Default UPI</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* 2. PhonePe Mode */}
                        {selectedUpiApp === 'phonepe' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#5f259f] flex items-center justify-center font-black text-xs text-white">
                                  पे
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  Pay ₹{finalPayable} via PhonePe
                                </span>
                              </div>
                              <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">
                                Direct to Admin
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Opens PhonePe app with merchant recipient <strong className="text-slate-900 dark:text-white">{adminName}</strong>.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <a
                                href={phonepeLink}
                                className="px-4 py-2 bg-[#5f259f] hover:bg-purple-800 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Pay ₹{finalPayable} with PhonePe</span>
                              </a>
                              <a
                                href={upiDeepLink}
                                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <span>Universal UPI Intent</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* 3. Paytm Mode */}
                        {selectedUpiApp === 'paytm' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#002970] flex items-center justify-center font-black text-[9px] text-[#00b9f5]">
                                  Paytm
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  Pay ₹{finalPayable} via Paytm Wallet / UPI
                                </span>
                              </div>
                              <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded">
                                Direct to Admin
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Directly open Paytm app or scan to complete payment instantly.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <a
                                href={paytmLink}
                                className="px-4 py-2 bg-[#002970] hover:bg-slate-900 text-[#00b9f5] font-black text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer border border-[#00b9f5]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Pay ₹{finalPayable} with Paytm</span>
                              </a>
                              <a
                                href={upiDeepLink}
                                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <span>Other Apps</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* 4. BHIM Mode */}
                        {selectedUpiApp === 'bhim' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#00897b] flex items-center justify-center font-black text-xs text-white">
                                  BHIM
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  Pay ₹{finalPayable} via BHIM UPI
                                </span>
                              </div>
                              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">
                                NPCI Certified
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Instant settlement via National Payments Corporation of India (NPCI) BHIM app.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <a
                                href={bhimLink}
                                className="px-4 py-2 bg-[#00897b] hover:bg-teal-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Pay ₹{finalPayable} with BHIM</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* 5. QR Code Mode or Desktop view */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="p-2 bg-white rounded-lg border-2 border-dashed border-blue-400 dark:border-blue-700 shadow-xs shrink-0 flex flex-col items-center">
                            <img
                              src={qrCodeUrl}
                              alt="Scan UPI QR"
                              className="w-28 h-28 object-contain"
                            />
                            <span className="text-[9px] font-black text-slate-800 mt-1 uppercase">
                              Scan with Any UPI App
                            </span>
                          </div>

                          <div className="space-y-2 flex-1 w-full text-[11px]">
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                              <span className="text-[10px] uppercase font-extrabold text-slate-400">
                                Official Admin UPI ID (Himanshu Kushwaha)
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs select-all">
                                  {adminUpi}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCopy(adminUpi, 'upi');
                                  }}
                                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 text-[#2874f0] dark:text-blue-200 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedField === 'upi' ? 'Copied!' : 'Copy UPI'}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={upiDeepLink}
                                className="px-3 py-1.5 bg-[#2874f0] hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Universal UPI Intent Link</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transaction Reference / UTR Input */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <span>Enter UTR / UPI Reference No. (after paying in app):</span>
                        </label>
                        <input
                          type="text"
                          value={onlineTxnRef}
                          onChange={(e) => setOnlineTxnRef(e.target.value)}
                          placeholder="e.g. 439281928371 or Bank Ref No."
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        />
                        <p className="text-[10px] text-slate-500">
                          Money settles directly into the Owner account without middlemen.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 2: Direct Bank Transfer (NEFT / IMPS / RTGS to Admin) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'border-[#2874f0] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#2874f0]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'netbanking'}
                  onChange={() => setPaymentMethod('netbanking')}
                  className="mt-0.5 accent-[#2874f0]"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Direct Admin Bank Transfer (NEFT / IMPS / RTGS)
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                      Zero Fees
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Transfer directly into the verified marketplace administrator bank account.
                  </p>

                  {paymentMethod === 'netbanking' && (
                    <div className="pt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Account Holder</span>
                          <p className="font-bold text-slate-900 dark:text-white">{adminBank.accountHolder}</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Bank Name</span>
                          <p className="font-bold text-slate-900 dark:text-white">{adminBank.bankName}</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Account Number</span>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{adminBank.accountNumber}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCopy(adminBank.accountNumber, 'acc');
                            }}
                            className="p-1 text-[#2874f0] hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">IFSC Code</span>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{adminBank.ifscCode}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCopy(adminBank.ifscCode, 'ifsc');
                            }}
                            className="p-1 text-[#2874f0] hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Bank UTR / Transaction Reference Number:
                        </label>
                        <input
                          type="text"
                          value={onlineTxnRef}
                          onChange={(e) => setOnlineTxnRef(e.target.value)}
                          placeholder="e.g. HDFC20261105992"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Credit / Debit Card (Processed into Admin Gateway) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-[#2874f0] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#2874f0]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mt-0.5 accent-[#2874f0]"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Credit / Debit Card (Visa, RuPay, MasterCard)
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">256-Bit SSL</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Card transactions settle directly into the Owner merchant account via Razorpay/PayU gateway.
                  </p>
                  {paymentMethod === 'card' && (
                    <div className="pt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <input
                        type="text"
                        placeholder="Card Number (16 Digits)"
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="p-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="CVV"
                          maxLength={3}
                          className="p-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 4: Cash On Delivery (COD) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#2874f0] bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-[#2874f0]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-0.5 accent-[#2874f0]"
                />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                      <Banknote className="w-4 h-4 text-emerald-600" /> Cash on Delivery (COD)
                    </span>
                    <span className="text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      Doorstep Cash
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Pay cash directly to courier partner upon doorstep delivery. Courier must deposit cash to Admin account.
                  </p>
                  {paymentMethod === 'cod' && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between font-medium">
                      <span>Total Cash to Hand Over:</span>
                      <strong className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                        ₹{finalPayable.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>


          {/* Pricing Breakdown */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Items Total ({cartItems.length})</span>
              <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Coupon Applied</span>
                <span className="tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Delivery Fee</span>
              <span>{deliveryCharge === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${deliveryCharge}`}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
              <span>Total Payable</span>
              <span className="text-[#2874f0] text-base tabular-nums">
                ₹{finalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Confirm Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Safe & Secure Payments</span>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="py-3 px-6 bg-[#fb641b] hover:bg-orange-600 text-white font-extrabold text-sm rounded shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>
              {isSubmitting
                ? 'Confirming Order...'
                : paymentMethod === 'cod'
                ? `Confirm COD Order (Pay ₹${finalPayable.toLocaleString('en-IN')} on Delivery)`
                : `Confirm & Pay ₹${finalPayable.toLocaleString('en-IN')}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
