/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Logo } from './Logo';
import {
  Search,
  ShoppingCart,
  User,
  Package,
  Layers,
  Store,
  Truck,
  ShieldAlert,
  Globe,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  X,
  Menu,
} from 'lucide-react';
import type { UserRole, UserProfile } from '../types/marketplace';
import { translations, Language } from '../utils/translations';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUser: UserProfile;
  cartCount: number;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenLogin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onReplayIntro: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  currentUser,
  cartCount,
  onOpenCart,
  onOpenOrders,
  onOpenLogin,
  searchQuery,
  onSearchChange,
  language,
  onLanguageChange,
  darkMode,
  onToggleDarkMode,
  onReplayIntro,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const t = translations[language];

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    customer: { label: t.customer, icon: <User className="w-4 h-4" />, color: 'bg-emerald-600' },
    seller: { label: t.seller, icon: <Store className="w-4 h-4" />, color: 'bg-indigo-600' },
    courier: { label: t.courier, icon: <Truck className="w-4 h-4" />, color: 'bg-amber-600' },
    owner: { label: t.owner, icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-rose-600' },
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#2874f0] text-white shadow-md border-b border-blue-600 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 md:gap-6">
            {/* Left: Brand Logo & Intro Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onRoleChange('customer')}
                className="cursor-pointer focus:outline-none"
                title="HS market CLUB Home"
              >
                <Logo size="md" variant="brand" showTagline={true} />
              </button>

              <button
                onClick={onReplayIntro}
                className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-blue-800/60 hover:bg-blue-800 px-2 py-1 rounded transition-colors"
                title="Watch App Open Animation by Himanshu Kushwaha (H/S)"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Intro</span>
              </button>
            </div>

            {/* Center: Search Bar (Flipkart Style) */}
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-white text-slate-800 placeholder-slate-400 text-sm pl-4 pr-10 py-2.5 rounded-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
                {searchQuery ? (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-9 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  className="absolute right-2 text-[#2874f0] hover:text-blue-800 p-1 font-bold"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right: Actions & Role Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Language Switcher */}
              <button
                onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded hover:bg-blue-700/80 transition-colors"
                title="Change Language"
              >
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={onToggleDarkMode}
                className="p-1.5 rounded hover:bg-blue-700/80 transition-colors text-blue-100"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Portal / Dashboard Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-blue-950 rounded-sm font-extrabold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {roleLabels[currentRole].icon}
                  <span className="hidden sm:inline">{roleLabels[currentRole].label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-950" />
                </button>

                {showRoleMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-md shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-slate-800 dark:text-slate-100"
                    onClick={() => setShowRoleMenu(false)}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      {t.switchPortal}
                    </div>

                    {(['customer', 'seller', 'courier', 'owner'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => onRoleChange(role)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-800 text-left transition-colors ${
                          currentRole === role ? 'bg-blue-50/80 text-blue-700 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded text-white ${roleLabels[role].color}`}>
                            {roleLabels[role].icon}
                          </span>
                          <span>{roleLabels[role].label}</span>
                        </div>
                        {currentRole === role && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Orders shortcut (if in customer mode) */}
              {currentRole === 'customer' && (
                <button
                  onClick={onOpenOrders}
                  className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded hover:bg-blue-700/80 transition-colors"
                  title="Track & Manage Orders"
                >
                  <Package className="w-4 h-4 text-amber-300" />
                  <span className="hidden md:inline">{t.orders}</span>
                </button>
              )}

              {/* Shopping Cart (Customer Mode) */}
              {currentRole === 'customer' && (
                <button
                  onClick={onOpenCart}
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 bg-white text-[#2874f0] hover:bg-blue-50 rounded-sm shadow-sm transition-colors cursor-pointer"
                  title="View Shopping Cart"
                >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-1 ring-white">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline">{t.cart}</span>
                </button>
              )}

              {/* User Profile / Login */}
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded hover:bg-blue-700/80 transition-colors"
                title="Account Settings & Registration"
              >
                <User className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.name}</span>
              </button>
            </div>
          </div>

          {/* Mobile search bar */}
          <div className="pb-3 md:hidden">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs pl-3.5 pr-8 py-2 rounded-sm shadow-sm focus:outline-none"
              />
              <Search className="absolute right-2.5 w-4 h-4 text-[#2874f0]" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation (Flipkart Style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 shadow-lg">
        <button
          onClick={() => onRoleChange('customer')}
          className={`flex flex-col items-center gap-0.5 text-[10px] ${
            currentRole === 'customer' ? 'text-[#2874f0] font-bold' : 'text-slate-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Shop</span>
        </button>

        <button
          onClick={onOpenOrders}
          className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 hover:text-blue-600"
        >
          <Package className="w-4 h-4" />
          <span>Orders</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 hover:text-blue-600 relative"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-2 bg-amber-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </button>

        <button
          onClick={() => setShowRoleMenu(true)}
          className={`flex flex-col items-center gap-0.5 text-[10px] ${
            currentRole !== 'customer' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Portals</span>
        </button>

        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 hover:text-blue-600"
        >
          <User className="w-4 h-4" />
          <span>Account</span>
        </button>
      </nav>
    </>
  );
};
