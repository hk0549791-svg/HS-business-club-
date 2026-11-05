/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { UserProfile, UserRole } from '../types/marketplace';
import { X, User, Store, Truck, ShieldAlert, CheckCircle, ArrowRight, KeyRound } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onRegister: (data: any) => Promise<UserProfile>;
  language: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSelectUser,
  onRegister,
  language,
}) => {
  const [mode, setMode] = useState<'switch' | 'register'>('switch');
  const [regRole, setRegRole] = useState<UserRole>('customer');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'van'>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [upiId, setUpiId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = translations[language];

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    try {
      const newUser = await onRegister({
        role: regRole,
        name,
        phone,
        email,
        businessName,
        gstin,
        vehicleType,
        vehicleNumber,
        upiId,
      });
      onSelectUser(newUser);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto text-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 bg-[#2874f0] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-300" />
            <h3 className="font-extrabold text-sm sm:text-base">
              User Accounts & Multi-Role Access
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch / register */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={() => setMode('switch')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              mode === 'switch' ? 'bg-white dark:bg-slate-900 border-b-2 border-[#2874f0] text-[#2874f0]' : 'text-slate-500'
            }`}
          >
            Active Profiles ({allUsers.length})
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white dark:bg-slate-900 border-b-2 border-[#2874f0] text-[#2874f0]' : 'text-slate-500'
            }`}
          >
            + Register New Account
          </button>
        </div>

        {/* Mode: Switch Profile */}
        {mode === 'switch' && (
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <p className="text-slate-500 text-[11px]">
              Switch instantly to test different dashboard roles in real time:
            </p>

            <div className="space-y-2">
              {allUsers.map((u) => {
                const isSelected = u.id === currentUser.id;

                const roleBadge = {
                  customer: 'bg-emerald-100 text-emerald-800',
                  seller: 'bg-indigo-100 text-indigo-800',
                  courier: 'bg-amber-100 text-amber-800',
                  owner: 'bg-rose-100 text-rose-800',
                }[u.role];

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${roleBadge}`}>
                          {u.role}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {u.phone} • {u.businessName || u.email}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode: Register New Account */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-5 space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Select Account Role:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'customer', label: 'Customer', icon: <User className="w-3.5 h-3.5" /> },
                  { role: 'seller', label: 'Seller', icon: <Store className="w-3.5 h-3.5" /> },
                  { role: 'courier', label: 'Courier', icon: <Truck className="w-3.5 h-3.5" /> },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setRegRole(item.role as UserRole)}
                    className={`p-2 rounded border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      regRole === item.role
                        ? 'border-[#2874f0] bg-blue-50 dark:bg-blue-950 text-[#2874f0] ring-1 ring-[#2874f0]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Number</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full mt-1 p-2 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Seller specific fields */}
            {regRole === 'seller' && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-blue-600 text-[11px] uppercase tracking-wider">
                  Merchant Business & Tax Details
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Business / Store Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Traders New Delhi"
                    className="w-full mt-1 p-1.5 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">GSTIN / PAN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="07AABCU9603R1ZM"
                    className="w-full mt-1 p-1.5 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                  />
                </div>
              </div>
            )}

            {/* Courier specific fields */}
            {regRole === 'courier' && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-amber-600 text-[11px] uppercase tracking-wider">
                  Delivery Fleet & Vehicle Details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                      className="w-full mt-1 p-1.5 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="bike">Motorcycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="van">Delivery Van</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="DL 01 AB 1234"
                      className="w-full mt-1 p-1.5 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Payout UPI ID</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="mobile@paytm"
                    className="w-full mt-1 p-1.5 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode('switch')}
                className="px-3 py-1.5 border rounded text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold rounded"
              >
                {isSubmitting ? 'Registering...' : `Complete ${regRole.toUpperCase()} Registration`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
