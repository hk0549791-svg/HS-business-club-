/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type {
  Product,
  Order,
  UserProfile,
  UserRole,
  Category,
  CartItem,
  CommissionRecord,
  LedgerEntry,
  PayoutRequest,
  Review,
  PlatformSettings,
  PaymentMethod,
  Address,
} from './types/marketplace';
import { SplashIntro } from './components/SplashIntro';
import { Navbar } from './components/Navbar';
import { CustomerHome } from './components/CustomerPanel/CustomerHome';
import { ProductDetailModal } from './components/CustomerPanel/ProductDetailModal';
import { CartDrawer } from './components/CustomerPanel/CartDrawer';
import { CheckoutModal } from './components/CustomerPanel/CheckoutModal';
import { CustomerOrdersModal } from './components/CustomerPanel/CustomerOrdersModal';
import { OrderTrackingModal } from './components/CustomerPanel/OrderTrackingModal';
import { SellerDashboard } from './components/SellerPanel/SellerDashboard';
import { CourierDashboard } from './components/CourierPanel/CourierDashboard';
import { OwnerDashboard } from './components/OwnerPanel/OwnerDashboard';
import { InvoiceModal } from './components/InvoiceModal';
import { AuthModal } from './components/AuthModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { translations, Language } from './utils/translations';

export default function App() {
  // Splash Screen on initial entry as requested
  const [showSplash, setShowSplash] = useState(true);

  // App Theme & Language
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  // Role & Current User
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'customer_default',
    role: 'customer',
    name: 'Customer Guest',
    phone: '9876543210',
    email: 'customer@hsmarketclub.in',
    status: 'active',
    createdAt: new Date().toISOString(),
    savedAddresses: [
      {
        id: 'addr_default',
        name: 'Himanshu Kushwaha',
        phone: '9876543210',
        pincode: '110001',
        locality: 'Connaught Place',
        addressLine: 'Plot 12, Block B, Inner Circle',
        city: 'New Delhi',
        state: 'Delhi',
        isDefault: true,
      },
    ],
    wishlist: [],
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Marketplace Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [codDeposits, setCodDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    platformCommissionRate: 2.5,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
    courierFeePerDelivery: 35,
    autoAssignCouriers: true,
    productModerationRequired: false,
    supportPhone: '+91 98765 43210',
    supportEmail: 'support@hsmarketclub.com',
  });

  // Customer Shopping State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('hs_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Initialize and load data from backend API
  const refreshAllData = async () => {
    try {
      const [settingsRes, catRes, prodRes, ordersRes, finRes, usersRes, payoutsRes, revRes, codRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/products?includeUnapproved=true').then((r) => r.json()),
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/financials').then((r) => r.json()),
        fetch('/api/sellers').then((r) => r.json()), // also fetch couriers
        fetch('/api/payouts').then((r) => r.json()),
        fetch('/api/reviews').then((r) => r.json()),
        fetch('/api/cod/reconciliation').then((r) => r.json()).catch(() => null),
      ]);

      if (settingsRes) setSettings(settingsRes);
      if (Array.isArray(catRes)) setCategories(catRes);
      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(ordersRes)) setOrders(ordersRes);
      if (finRes) {
        if (Array.isArray(finRes.commissions)) setCommissions(finRes.commissions);
        if (Array.isArray(finRes.ledger)) setLedger(finRes.ledger);
      }
      if (Array.isArray(payoutsRes)) setPayouts(payoutsRes);
      if (Array.isArray(revRes)) setReviews(revRes);
      if (codRes && Array.isArray(codRes.deposits)) setCodDeposits(codRes.deposits);

      // Fetch couriers as well to assemble full user list
      const couriersRes = await fetch('/api/couriers').then((r) => r.json()).catch(() => []);
      const ownerRes = await fetch('/api/users/owner_himanshu').then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const ownerUser: UserProfile = ownerRes || {
        id: 'owner_himanshu',
        role: 'owner',
        name: 'Himanshu Kushwaha (Owner)',
        phone: '9876543210',
        email: 'admin@hsmarketclub.com',
        username: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const combinedUsers: UserProfile[] = [
        ownerUser,
        currentUser,
        ...(Array.isArray(usersRes) ? usersRes : []),
        ...(Array.isArray(couriersRes) ? couriersRes : []),
      ];

      // Deduplicate by ID
      const uniqueUsers = Array.from(new Map(combinedUsers.map((u) => [u.id, u])).values());
      setAllUsers(uniqueUsers);
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Role Switch (Password Protected for Admin / Owner)
  const handleRoleChange = (role: UserRole) => {
    if (role === 'owner' && !isAdminAuthenticated) {
      setIsAdminLoginOpen(true);
      return;
    }

    setCurrentRole(role);

    // Switch active user to an existing profile for that role, or keep current if matched
    if (currentUser.role !== role) {
      const match = allUsers.find((u) => u.role === role);
      if (match) {
        setCurrentUser(match);
      } else {
        // Create an active profile for that role if none found
        const fallbackUser: UserProfile = {
          id: `${role}_temp_${Date.now()}`,
          role,
          name: role === 'owner' ? 'Himanshu Kushwaha (Owner)' : role === 'seller' ? 'Kushwaha Electronics' : role === 'courier' ? 'Shivam Express' : 'Customer Guest',
          phone: '9876543210',
          email: `${role}@hsmarketclub.in`,
          username: role === 'owner' ? 'admin' : undefined,
          status: 'active',
          businessName: role === 'seller' ? 'Kushwaha Electronics & Retail' : undefined,
          vehicleType: role === 'courier' ? 'bike' : undefined,
          vehicleNumber: role === 'courier' ? 'DL 01 AB 1234' : undefined,
          upiId: '9876543210@upi',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(fallbackUser);
        setAllUsers((prev) => [...prev, fallbackUser]);
      }
    }
  };

  const handleAdminLoginSuccess = (user: any) => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('hs_admin_auth', 'true');
    } catch {}

    const ownerProfile = user || allUsers.find((u) => u.role === 'owner') || {
      id: 'owner_himanshu',
      role: 'owner',
      name: 'Himanshu Kushwaha (Owner)',
      username: 'admin',
    };

    setAllUsers((prev) => {
      const exists = prev.find((u) => u.role === 'owner');
      if (exists) {
        return prev.map((u) => (u.role === 'owner' ? { ...u, ...ownerProfile } : u));
      }
      return [ownerProfile, ...prev];
    });

    setCurrentUser(ownerProfile);
    setCurrentRole('owner');
    setIsAdminLoginOpen(false);
  };

  const handleLogoutAdmin = () => {
    try {
      sessionStorage.removeItem('hs_admin_auth');
    } catch {}
    setIsAdminAuthenticated(false);
    handleRoleChange('customer');
  };

  const handleUpdateAdminCredentials = async (
    currentPassword: string,
    newUsername?: string,
    newPassword?: string
  ) => {
    try {
      const res = await fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newUsername, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: '',
          error: data.error || 'Failed to update admin credentials',
        };
      }
      if (data.user) {
        setAllUsers((prev) =>
          prev.map((u) => (u.role === 'owner' ? { ...u, ...data.user } : u))
        );
        if (currentUser.role === 'owner') {
          setCurrentUser((prev) => ({ ...prev, ...data.user }));
        }
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Network error' };
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, size?: string, color?: string) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(product.stock, i.quantity + 1) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          selectedSize: size || product.selectedSizes?.[0],
          selectedColor: color || product.selectedColors?.[0],
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: Product, size?: string, color?: string) => {
    handleAddToCart(product, size, color);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: Math.min(item.product.stock, newQty) } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleToggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Place Order (Backend Commission is strictly calculated at server)
  const handlePlaceOrder = async (payload: { shippingAddress: Address; paymentMethod: PaymentMethod }) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: currentUser.id,
        shippingAddress: payload.shippingAddress,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          size: i.selectedSize,
          color: i.selectedColor,
        })),
        paymentMethod: payload.paymentMethod,
        couponCode,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order');

    setCartItems([]);
    setCouponCode('');
    await refreshAllData();

    // Open live tracking for newly placed order
    if (data.order) {
      setTrackingOrder(data.order);
    }
  };

  // Order Lifecycle Updates
  const handleUpdateOrderStatus = async (orderId: string, newStatus: any, note?: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStatus,
        actorRole: currentRole,
        actorName: currentUser.name,
        note,
        courierId: currentRole === 'courier' ? currentUser.id : undefined,
      }),
    });
    await refreshAllData();
  };

  // Courier OTP Verification
  const handleVerifyDeliveryOtp = async (orderId: string, otp: string): Promise<boolean> => {
    const res = await fetch(`/api/orders/${orderId}/verify-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, courierId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid OTP');
    }
    await refreshAllData();
    return true;
  };

  // Cancel order (reverses commission on backend)
  const handleCancelOrder = async (orderId: string, reason: string) => {
    await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        actorRole: currentRole,
        actorName: currentUser.name,
      }),
    });
    await refreshAllData();
    if (trackingOrder && trackingOrder.id === orderId) {
      const updated = orders.find((o) => o.id === orderId);
      if (updated) setTrackingOrder({ ...updated, orderStatus: 'cancelled' });
    }
  };

  // Return request
  const handleRequestReturn = async (orderId: string, reason: string) => {
    await fetch(`/api/orders/${orderId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    await refreshAllData();
  };

  // Seller Product Operations
  const handleCreateProduct = async (productData: any) => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    await refreshAllData();
  };

  const handleUpdateProduct = async (productId: string, data: any) => {
    await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await refreshAllData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    await refreshAllData();
  };

  // Payout requests
  const handleRequestPayout = async (amount: number, details: string) => {
    await fetch('/api/payouts/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: currentUser.id,
        entityType: currentRole === 'seller' ? 'seller' : 'courier',
        amount,
        bankOrUpiDetails: details,
      }),
    });
    await refreshAllData();
  };

  // Courier Accept
  const handleAcceptDelivery = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStatus: 'courier_assigned',
        actorRole: 'courier',
        actorName: currentUser.name,
        courierId: currentUser.id,
        note: `Accepted by courier partner ${currentUser.name}`,
      }),
    });
    await refreshAllData();
  };

  // Owner Management Actions
  const handleUpdateSettings = async (newSettings: Partial<PlatformSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (data.settings) setSettings(data.settings);
    await refreshAllData();
  };

  const handleUpdateSellerStatus = async (sellerId: string, status: string, commissionRate?: number) => {
    await fetch(`/api/sellers/${sellerId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, sellerCommissionRate: commissionRate }),
    });
    await refreshAllData();
  };

  const handleUpdateCourierStatus = async (courierId: string, status: string) => {
    await fetch(`/api/couriers/${courierId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await refreshAllData();
  };

  const handleUpdateProductModeration = async (productId: string, isApproved: boolean) => {
    await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved }),
    });
    await refreshAllData();
  };

  const handleAssignCourierManually = async (orderId: string, courierId: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStatus: 'courier_assigned',
        actorRole: 'owner',
        actorName: 'Admin',
        courierId,
        note: 'Courier assigned manually by administrator',
      }),
    });
    await refreshAllData();
  };

  const handleProcessPayout = async (payoutId: string, action: 'approve' | 'reject') => {
    await fetch(`/api/payouts/${payoutId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await refreshAllData();
  };

  const handleSeedStarterCatalog = async () => {
    await fetch('/api/admin/seed-starter', { method: 'POST' });
    await refreshAllData();
  };

  const handleResetMarketplace = async () => {
    await fetch('/api/admin/reset-marketplace', { method: 'POST' });
    await refreshAllData();
  };

  // COD Specific Handlers
  const handleVerifyCodDeposit = async (depositId: string, action: 'verify' | 'reject', notes?: string) => {
    await fetch(`/api/cod/deposits/${depositId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes, verifiedBy: currentUser.name }),
    });
    await refreshAllData();
  };

  const handleCollectCash = async (orderId: string, amount: number) => {
    await fetch(`/api/orders/${orderId}/cod-collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, courierId: currentUser.id }),
    });
    await refreshAllData();
  };

  const handleReportFailedDelivery = async (orderId: string, reason: string, notes?: string) => {
    await fetch(`/api/orders/${orderId}/failed-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        notes,
        actorRole: currentRole,
        actorName: currentUser.name,
      }),
    });
    await refreshAllData();
  };

  const handleCourierDeposit = async (depositData: any) => {
    await fetch('/api/cod/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...depositData,
        courierId: currentUser.id,
        courierName: currentUser.name,
      }),
    });
    await refreshAllData();
  };

  const handleRtoAccept = async (orderId: string, notes?: string) => {
    await fetch(`/api/orders/${orderId}/rto-accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    await refreshAllData();
  };

  const handleAddReview = async (review: { rating: number; title: string; comment: string; imageUrl?: string }) => {
    if (!selectedProduct) return;
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: selectedProduct.id,
        customerId: currentUser.id,
        ...review,
      }),
    });
    await refreshAllData();
  };

  const handleUserRegister = async (data: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    await refreshAllData();
    return result.user;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Animated Entry Splash Screen (Developer: Himanshu Kushwaha H/S & App Name) */}
      {showSplash && <SplashIntro onComplete={() => setShowSplash(false)} />}

      {/* 2. Flipkart Iconic Header Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        currentUser={currentUser}
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenLogin={() => setIsAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        language={language}
        onLanguageChange={setLanguage}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onReplayIntro={() => setShowSplash(true)}
      />

      {/* 3. Panel Body (Role-Specific) */}
      <main className="flex-1">
        {/* PANEL 1: CUSTOMER ONLINE SHOPPING */}
        {currentRole === 'customer' && (
          <CustomerHome
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p, e) => {
              if (e) e.stopPropagation();
              handleAddToCart(p);
            }}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            language={language}
            onSwitchToSeller={() => handleRoleChange('seller')}
            onSwitchToOwner={() => handleRoleChange('owner')}
          />
        )}

        {/* PANEL 2: SELLER BUSINESS DASHBOARD */}
        {currentRole === 'seller' && (
          <SellerDashboard
            currentSeller={currentUser}
            products={products}
            orders={orders}
            commissions={commissions}
            ledger={ledger}
            payouts={payouts}
            categories={categories}
            platformCommissionRate={settings.platformCommissionRate}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onRequestPayout={handleRequestPayout}
            onOpenInvoice={(order) => setInvoiceOrder(order)}
            onAcceptRto={handleRtoAccept}
          />
        )}

        {/* PANEL 3: COURIER / DELIVERY PARTNER DASHBOARD */}
        {currentRole === 'courier' && (
          <CourierDashboard
            currentCourier={currentUser}
            orders={orders}
            ledger={ledger}
            codDeposits={codDeposits}
            courierFeePerDelivery={settings.courierFeePerDelivery}
            onAcceptDelivery={handleAcceptDelivery}
            onUpdateDeliveryStatus={handleUpdateOrderStatus}
            onVerifyDeliveryOtp={handleVerifyDeliveryOtp}
            onCollectCash={handleCollectCash}
            onReportFailedDelivery={handleReportFailedDelivery}
            onSubmitDeposit={handleCourierDeposit}
            onRequestPayout={handleRequestPayout}
          />
        )}

        {/* PANEL 4: OWNER / SUPER ADMIN CONTROL CENTER */}
        {currentRole === 'owner' && (
          <OwnerDashboard
            settings={settings}
            users={allUsers}
            products={products}
            orders={orders}
            commissions={commissions}
            ledger={ledger}
            payouts={payouts}
            categories={categories}
            codDeposits={codDeposits}
            currentAdminUser={allUsers.find((u) => u.role === 'owner') || currentUser}
            onLogoutAdmin={handleLogoutAdmin}
            onUpdateAdminCredentials={handleUpdateAdminCredentials}
            onUpdateSettings={handleUpdateSettings}
            onUpdateSellerStatus={handleUpdateSellerStatus}
            onUpdateCourierStatus={handleUpdateCourierStatus}
            onUpdateProductStatus={handleUpdateProductModeration}
            onAssignCourierManually={handleAssignCourierManually}
            onProcessPayout={handleProcessPayout}
            onVerifyCodDeposit={handleVerifyCodDeposit}
            onSeedStarterCatalog={handleSeedStarterCatalog}
            onResetMarketplace={handleResetMarketplace}
            onOpenInvoice={(order) => setInvoiceOrder(order)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(p, s, c) => handleAddToCart(p, s, c)}
          onBuyNow={(p, s, c) => handleBuyNow(p, s, c)}
          isWishlisted={wishlist.includes(selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          reviews={reviews.filter((r) => r.productId === selectedProduct.id)}
          onAddReview={handleAddReview}
          language={language}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        couponCode={couponCode}
        onApplyCoupon={setCouponCode}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        language={language}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        currentUser={currentUser}
        cartItems={cartItems}
        couponCode={couponCode}
        settings={settings}
        onPlaceOrder={handlePlaceOrder}
        language={language}
      />

      {/* Customer Orders History Modal */}
      <CustomerOrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        orders={orders.filter((o) => o.customerId === currentUser.id)}
        onSelectOrder={(o) => {
          setIsOrdersOpen(false);
          setTrackingOrder(o);
        }}
        onOpenInvoice={(order) => setInvoiceOrder(order)}
        language={language}
      />

      {/* Order Tracking Modal (10-Stage Visual Timeline & Customer OTP) */}
      {trackingOrder && (
        <OrderTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          onCancelOrder={handleCancelOrder}
          onRequestReturn={handleRequestReturn}
          onOpenInvoice={(order) => setInvoiceOrder(order)}
          language={language}
        />
      )}

      {/* GST Tax Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}

      {/* User Profiles & Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={(u) => {
          setCurrentUser(u);
          setCurrentRole(u.role);
        }}
        onRegister={handleUserRegister}
        language={language}
      />

      {/* Super Admin Protected Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-black italic text-lg text-white">
                HS <span className="text-amber-400 not-italic">market</span> CLUB
              </span>
              <span className="text-[11px] text-slate-500">
                • India’s Multi-Vendor Commerce Network
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <button onClick={() => handleRoleChange('customer')} className="hover:text-white">Customer</button>
              <button onClick={() => handleRoleChange('seller')} className="hover:text-white">Seller</button>
              <button onClick={() => handleRoleChange('courier')} className="hover:text-white">Courier</button>
              <button onClick={() => handleRoleChange('owner')} className="hover:text-white">Admin</button>
              <button onClick={() => setShowSplash(true)} className="text-amber-400 hover:text-amber-300">
                Replay App Intro
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              Designed & Developed by <strong className="text-slate-200">Himanshu Kushwaha (H/S)</strong>
            </div>
            <div>
              Automated 2.5% Platform Commission Engine • Customer OTP Delivery Verification
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
