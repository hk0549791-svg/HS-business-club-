/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  calculateCommission,
  calculateOrderFinancials,
  calculateRefundAdjustment,
  isValidOrderStatusTransition,
  verifyDeliveryOtp,
  isAuthorizedAccess,
  calculateCodCommissionEligibility,
  calculateCourierCashInHand,
  calculateCodReconciliationStats,
  generateCashReceiptNumber,
} from './src/utils/marketplaceLogic.js';
import type {
  Product,
  Order,
  UserProfile,
  CommissionRecord,
  LedgerEntry,
  PayoutRequest,
  Review,
  PlatformSettings,
  OrderStatus,
  Category,
  OrderItem,
  CodDeposit,
  CodDetails,
  CodCollectionStatus,
  CodFailureReason,
} from './src/types/marketplace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Data storage path
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

// Initial default categories
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'mobiles',
    name: 'Mobiles & Tablets',
    hindiName: 'मोबाइल और टैबलेट',
    icon: 'Smartphone',
    subcategories: ['Smartphones', 'Tablets', 'Accessories', 'Power Banks'],
  },
  {
    id: 'fashion',
    name: 'Fashion & Wear',
    hindiName: 'फैशन व कपड़े',
    icon: 'Shirt',
    subcategories: ['Men T-Shirts', 'Women Ethnic', 'Footwear', 'Watches'],
  },
  {
    id: 'electronics',
    name: 'Electronics & Gadgets',
    hindiName: 'इलेक्ट्रॉनिक्स',
    icon: 'Laptop',
    subcategories: ['Laptops', 'Audio & Headphones', 'Smart Watches', 'Cameras'],
  },
  {
    id: 'home',
    name: 'Home & Kitchen',
    hindiName: 'घर और रसोई',
    icon: 'Home',
    subcategories: ['Cookware', 'Home Decor', 'Lighting', 'Furniture'],
  },
  {
    id: 'grocery',
    name: 'Grocery & Essentials',
    hindiName: 'किराना और सामान',
    icon: 'ShoppingBasket',
    subcategories: ['Daily Staples', 'Snacks', 'Beverages', 'Personal Care'],
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    hindiName: 'सौंदर्य उत्पाद',
    icon: 'Sparkles',
    subcategories: ['Skincare', 'Fragrances', 'Haircare', 'Grooming'],
  },
];

interface MarketplaceStore {
  users: UserProfile[];
  products: Product[];
  orders: Order[];
  commissions: CommissionRecord[];
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  reviews: Review[];
  categories: Category[];
  settings: PlatformSettings;
  codDeposits: CodDeposit[];
}

// Default clean initial database state (NO demo products, NO fake transactions as requested!)
const DEFAULT_STORE: MarketplaceStore = {
  users: [
    {
      id: 'owner_himanshu',
      role: 'owner',
      name: 'Himanshu Kushwaha (H/S)',
      phone: '9876543210',
      email: 'admin@hsmarketclub.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'active',
      createdAt: new Date().toISOString(),
      username: 'admin',
      password: 'AdminPassword@123',
    },
  ],
  products: [],
  orders: [],
  commissions: [],
  ledger: [],
  payouts: [],
  reviews: [],
  categories: DEFAULT_CATEGORIES,
  codDeposits: [],
  settings: {
    platformCommissionRate: 2.5, // 2.5% default as requested (range 2.0% - 3.0%)
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
    courierFeePerDelivery: 35,
    autoAssignCouriers: true,
    productModerationRequired: false,
    supportPhone: '+91 98765 43210',
    supportEmail: 'support@hsmarketclub.com',
    adminUpiId: 'himanshushivam4037@okhdfcbank',
    adminPayeeName: 'Himanshu Kushwaha (HS market CLUB Owner)',
    adminBankDetails: {
      accountHolder: 'Himanshu Kushwaha',
      accountNumber: '91823746192837',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd, New Delhi Inner Circle',
    },
  },
};

function loadStore(): MarketplaceStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_STORE, ...parsed };
    }
  } catch (err) {
    console.error('Error loading store, falling back to default:', err);
  }
  saveStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

function saveStore(store: MarketplaceStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store:', err);
  }
}

let memoryStore: MarketplaceStore = loadStore();

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', app: 'HS market CLUB', timestamp: new Date().toISOString() });
});

// Platform Settings (Owner control)
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(memoryStore.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  const {
    platformCommissionRate,
    defaultDeliveryFee,
    freeDeliveryThreshold,
    courierFeePerDelivery,
    autoAssignCouriers,
    productModerationRequired,
    adminUpiId,
    adminPayeeName,
    adminBankDetails,
    supportPhone,
    supportEmail,
  } = req.body;

  let newRate = memoryStore.settings.platformCommissionRate;
  if (typeof platformCommissionRate === 'number') {
    // Strictly clamp between 2.0% and 3.0%
    newRate = Math.min(3.0, Math.max(2.0, Math.round(platformCommissionRate * 100) / 100));
  }

  memoryStore.settings = {
    ...memoryStore.settings,
    platformCommissionRate: newRate,
    defaultDeliveryFee: typeof defaultDeliveryFee === 'number' ? defaultDeliveryFee : memoryStore.settings.defaultDeliveryFee,
    freeDeliveryThreshold: typeof freeDeliveryThreshold === 'number' ? freeDeliveryThreshold : memoryStore.settings.freeDeliveryThreshold,
    courierFeePerDelivery: typeof courierFeePerDelivery === 'number' ? courierFeePerDelivery : memoryStore.settings.courierFeePerDelivery,
    autoAssignCouriers: typeof autoAssignCouriers === 'boolean' ? autoAssignCouriers : memoryStore.settings.autoAssignCouriers,
    productModerationRequired: typeof productModerationRequired === 'boolean' ? productModerationRequired : memoryStore.settings.productModerationRequired,
    adminUpiId: typeof adminUpiId === 'string' ? adminUpiId : (memoryStore.settings.adminUpiId || 'himanshushivam4037@okhdfcbank'),
    adminPayeeName: typeof adminPayeeName === 'string' ? adminPayeeName : (memoryStore.settings.adminPayeeName || 'Himanshu Kushwaha (HS market CLUB Owner)'),
    adminBankDetails: adminBankDetails ? { ...(memoryStore.settings.adminBankDetails || {}), ...adminBankDetails } : memoryStore.settings.adminBankDetails,
    supportPhone: typeof supportPhone === 'string' ? supportPhone : memoryStore.settings.supportPhone,
    supportEmail: typeof supportEmail === 'string' ? supportEmail : memoryStore.settings.supportEmail,
  };

  saveStore(memoryStore);
  res.json({ success: true, settings: memoryStore.settings });
});

// Categories
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(memoryStore.categories);
});

// User Auth & Profiles
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { role, name, phone, email, businessName, gstin, panNumber, bankDetails, vehicleType, vehicleNumber, drivingLicense, upiId } = req.body;

  if (!role || !name || !phone) {
    return res.status(400).json({ error: 'Missing required fields: role, name, phone' });
  }

  // Check if existing
  const existing = memoryStore.users.find(u => u.phone === phone && u.role === role);
  if (existing) {
    return res.json({ success: true, user: existing, message: 'Existing profile found' });
  }

  // New seller or courier needs owner approval ('pending'), customer is instant 'active'
  const initialStatus = role === 'customer' || role === 'owner' ? 'active' : 'pending';

  const newUser: UserProfile = {
    id: `${role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role,
    name,
    phone,
    email: email || `${phone}@hsmarketclub.in`,
    status: initialStatus,
    createdAt: new Date().toISOString(),
    // Seller details
    businessName: businessName || `${name}'s Store`,
    gstin: gstin || '',
    panNumber: panNumber || '',
    bankDetails: bankDetails || {
      accountNumber: '91823746192837',
      ifscCode: 'HDFC0001234',
      accountHolderName: name,
      bankName: 'HDFC Bank',
    },
    // Courier details
    vehicleType: vehicleType || 'bike',
    vehicleNumber: vehicleNumber || 'DL 01 AB 1234',
    drivingLicense: drivingLicense || 'DL-2022091827',
    upiId: upiId || `${phone}@upi`,
    isAvailable: true,
    totalSales: 0,
    totalDeliveries: 0,
    savedAddresses: role === 'customer' ? [
      {
        id: 'addr_default',
        name,
        phone,
        pincode: '110001',
        locality: 'Connaught Place',
        addressLine: 'Plot 12, Block B, Inner Circle',
        city: 'New Delhi',
        state: 'Delhi',
        isDefault: true,
      }
    ] : [],
    wishlist: [],
  };

  memoryStore.users.push(newUser);
  saveStore(memoryStore);

  res.status(201).json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, email, role, otp } = req.body;

  // Find user by role and either phone or email
  let user = memoryStore.users.find(u => {
    if (role && u.role !== role) return false;
    if (phone && u.phone === phone) return true;
    if (email && u.email === email) return true;
    return false;
  });

  if (!user) {
    // If logging in as owner and credentials match admin
    if (role === 'owner' || email === 'admin@hsmarketclub.com' || phone === '9876543210') {
      user = memoryStore.users.find(u => u.role === 'owner');
    }
  }

  if (!user) {
    return res.status(404).json({ error: 'User account not found. Please register first.' });
  }

  res.json({ success: true, user, message: 'Authentication successful' });
});

// Secure Super Admin Login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const owner = memoryStore.users.find((u) => u.role === 'owner');
  if (!owner) {
    return res.status(404).json({ error: 'Admin account not initialized' });
  }

  const expectedUsername = owner.username || 'admin';
  const expectedPassword = owner.password || 'AdminPassword@123';

  const trimmedInput = String(username).trim();
  const isUsernameMatch =
    trimmedInput.toLowerCase() === expectedUsername.toLowerCase() ||
    trimmedInput.toLowerCase() === (owner.email || '').toLowerCase() ||
    trimmedInput === owner.phone;

  const isPasswordMatch = String(password) === expectedPassword;

  if (!isUsernameMatch || !isPasswordMatch) {
    return res.status(401).json({
      error: 'Invalid username or password. कृपया सही यूजरनेम और पासवर्ड दर्ज करें।',
    });
  }

  res.json({
    success: true,
    message: 'Admin authentication successful',
    user: {
      id: owner.id,
      role: owner.role,
      name: owner.name,
      username: expectedUsername,
      email: owner.email,
    },
  });
});

// Change Admin Username & Password (Saved directly to backend /data/store.json)
app.post('/api/admin/change-credentials', (req: Request, res: Response) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }

  const ownerIndex = memoryStore.users.findIndex((u) => u.role === 'owner');
  if (ownerIndex === -1) {
    return res.status(404).json({ error: 'Admin profile not found' });
  }

  const currentStoredPass = memoryStore.users[ownerIndex].password || 'AdminPassword@123';
  if (currentPassword !== currentStoredPass) {
    return res.status(401).json({ error: 'Current password is incorrect (वर्तमान पासवर्ड गलत है)' });
  }

  let updatedUsername = memoryStore.users[ownerIndex].username || 'admin';
  if (newUsername && String(newUsername).trim().length > 0) {
    updatedUsername = String(newUsername).trim();
    memoryStore.users[ownerIndex].username = updatedUsername;
  }

  let updatedPassword = memoryStore.users[ownerIndex].password || 'AdminPassword@123';
  if (newPassword && String(newPassword).trim().length > 0) {
    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    updatedPassword = String(newPassword).trim();
    memoryStore.users[ownerIndex].password = updatedPassword;
  }

  saveStore(memoryStore);

  res.json({
    success: true,
    message: 'Admin username and password successfully updated and saved in backend database!',
    user: {
      id: memoryStore.users[ownerIndex].id,
      role: memoryStore.users[ownerIndex].role,
      name: memoryStore.users[ownerIndex].name,
      username: updatedUsername,
      email: memoryStore.users[ownerIndex].email,
    },
  });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = memoryStore.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update Customer Addresses / Profile
app.put('/api/users/:id', (req: Request, res: Response) => {
  const index = memoryStore.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  memoryStore.users[index] = { ...memoryStore.users[index], ...req.body };
  saveStore(memoryStore);
  res.json({ success: true, user: memoryStore.users[index] });
});

// ==========================================
// PRODUCTS (SELLER & CUSTOMER)
// ==========================================

app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, sellerId, includeUnapproved } = req.query;

  let list = [...memoryStore.products];

  // For customers, show only approved & active products
  if (includeUnapproved !== 'true') {
    list = list.filter(p => p.isApproved && p.isActive);
  }

  if (category && category !== 'all') {
    list = list.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
  }

  if (sellerId) {
    list = list.filter(p => p.sellerId === sellerId);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = memoryStore.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', (req: Request, res: Response) => {
  const {
    sellerId,
    title,
    description,
    category,
    subcategory,
    mrp,
    sellingPrice,
    stock,
    sku,
    images,
    selectedSizes,
    selectedColors,
  } = req.body;

  if (!sellerId || !title || !mrp || !sellingPrice) {
    return res.status(400).json({ error: 'Missing required product information' });
  }

  const seller = memoryStore.users.find(u => u.id === sellerId && u.role === 'seller');
  const sellerName = seller?.name || 'Verified Seller';
  const sellerBusinessName = seller?.businessName || sellerName;

  // Owner moderation setting
  const isApproved = !memoryStore.settings.productModerationRequired;

  const parsedMrp = Number(mrp);
  const parsedPrice = Number(sellingPrice);
  const discountPercent = parsedMrp > parsedPrice ? Math.round(((parsedMrp - parsedPrice) / parsedMrp) * 100) : 0;

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sellerId,
    sellerName,
    sellerBusinessName,
    title,
    description: description || '',
    category: category || 'electronics',
    subcategory: subcategory || '',
    mrp: parsedMrp,
    sellingPrice: parsedPrice,
    stock: Number(stock) || 10,
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    images: Array.isArray(images) && images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'
    ],
    selectedSizes: selectedSizes || [],
    selectedColors: selectedColors || [],
    isApproved,
    isActive: true,
    ratingsCount: 0,
    averageRating: 0,
    createdAt: new Date().toISOString(),
  };

  memoryStore.products.unshift(newProduct);
  saveStore(memoryStore);

  res.status(201).json({ success: true, product: newProduct });
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const index = memoryStore.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  memoryStore.products[index] = { ...memoryStore.products[index], ...req.body };
  saveStore(memoryStore);
  res.json({ success: true, product: memoryStore.products[index] });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const index = memoryStore.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  memoryStore.products.splice(index, 1);
  saveStore(memoryStore);
  res.json({ success: true });
});

// ==========================================
// ORDERS & COMMISSION ENGINE
// ==========================================

app.get('/api/orders', (req: Request, res: Response) => {
  const { customerId, sellerId, courierId, role } = req.query;

  let list = [...memoryStore.orders];

  if (role === 'customer' && customerId) {
    list = list.filter(o => o.customerId === customerId);
  } else if (role === 'seller' && sellerId) {
    // Seller only sees orders that contain their products
    list = list.filter(o => o.items.some(item => item.sellerId === sellerId));
  } else if (role === 'courier' && courierId) {
    // Courier sees assigned or completed by them, or available if searching
    list = list.filter(o => o.courierId === courierId || (!o.courierId && o.orderStatus === 'ready_for_pickup'));
  }

  res.json(list);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = memoryStore.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

/**
 * Place a new order
 * Enforces backend commission calculation, stock validation, and ledger updates.
 */
app.post('/api/orders', (req: Request, res: Response) => {
  const { customerId, shippingAddress, items, paymentMethod, couponCode } = req.body;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  let customer = memoryStore.users.find(u => u.id === customerId);
  if (!customer) {
    customer = {
      id: customerId,
      role: 'customer',
      name: shippingAddress?.name || 'Customer Guest',
      phone: shippingAddress?.phone || '9876543210',
      email: `${customerId}@hsmarketclub.in`,
      status: 'active',
      createdAt: new Date().toISOString(),
      savedAddresses: shippingAddress ? [shippingAddress] : [],
      wishlist: [],
    };
    memoryStore.users.push(customer);
  }

  // Current platform commission rate
  const platformRate = memoryStore.settings.platformCommissionRate; // e.g. 2.5%

  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  // Validate stock and compute item commissions
  for (const item of items) {
    const product = memoryStore.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.title}. Available: ${product.stock}` });
    }

    const itemPrice = product.sellingPrice;
    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;

    // Use seller custom override rate if defined, otherwise platform rate
    const seller = memoryStore.users.find(u => u.id === product.sellerId);
    const applicableCommissionRate = seller?.sellerCommissionRate || platformRate;

    // Backend commission calculation:
    // e.g. ₹1000 item @ 2.5% -> ₹25 commission, ₹975 seller settlement
    const commissionCalc = calculateCommission(itemTotal, applicableCommissionRate);

    orderItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productTitle: product.title,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerBusinessName: product.sellerBusinessName,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      image: product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      sku: product.sku,
      commissionRate: commissionCalc.commissionRate,
      platformCommission: commissionCalc.platformCommission,
      sellerGrossSettlement: commissionCalc.sellerGrossSettlement,
    });

    // Deduct stock
    product.stock -= item.quantity;
  }

  // Calculate discounts & fees
  let discount = 0;
  if (couponCode === 'HSCLUB100' && subtotal >= 500) {
    discount = 100;
  } else if (couponCode === 'WELCOME50') {
    discount = 50;
  }

  const deliveryCharge = subtotal >= memoryStore.settings.freeDeliveryThreshold ? 0 : memoryStore.settings.defaultDeliveryFee;
  const tax = 0; // Inclusive in India
  const totalPayable = Math.max(0, subtotal - discount + deliveryCharge + tax);

  // Generate 6-digit delivery OTP for secure customer handoff
  const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const orderId = `ord_${Date.now()}`;
  const orderNumber = `HS-${Math.floor(100000 + Math.random() * 900000)}`;

  const now = new Date().toISOString();

  // Create Order Record
  const newOrder: Order = {
    id: orderId,
    orderNumber,
    customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    shippingAddress: shippingAddress || customer.savedAddresses?.[0] || {
      id: 'default',
      name: customer.name,
      phone: customer.phone,
      pincode: '110001',
      locality: 'Connaught Place',
      addressLine: 'Plot 12, Block B',
      city: 'New Delhi',
      state: 'Delhi',
    },
    items: orderItems,
    subtotal,
    discount,
    couponCode,
    deliveryCharge,
    tax,
    totalPayable,
    paymentMethod: paymentMethod || 'cod',
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    paymentTransactionId: `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderStatus: 'placed',
    timeline: [
      {
        status: 'placed',
        timestamp: now,
        title: 'Order Placed',
        description: paymentMethod === 'cod'
          ? `Cash on Delivery order received for ${orderItems.length} items. Total to collect: ₹${totalPayable}.`
          : `Prepaid order received with ${orderItems.length} items. Total: ₹${totalPayable}.`,
        actorRole: 'customer',
        actorName: customer.name,
      },
    ],
    deliveryOtp,
    deliveryLocation: {
      sellerLocation: { lat: 28.6139, lng: 77.2090, name: 'Seller Fulfillment Hub, Delhi' },
      customerLocation: { lat: 28.6500, lng: 77.2300, name: shippingAddress?.city || 'Customer Delivery Address' },
      courierCurrentLocation: { lat: 28.6139, lng: 77.2090, stepPercent: 0 },
      etaMinutes: 35,
    },
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    codDetails: paymentMethod === 'cod' ? {
      isCod: true,
      amountToCollect: totalPayable,
      collectionStatus: 'pending_collection',
    } : undefined,
    createdAt: now,
    updatedAt: now,
  };

  // For PREPAID orders: realize commission and credit ledger immediately
  // For COD orders: WITHHOLD ledger credits until actual delivery and owner deposit verification!
  if (paymentMethod !== 'cod') {
    for (const item of orderItems) {
      const commissionRecord: CommissionRecord = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        orderItemId: item.id,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellingPrice: item.sellingPrice * item.quantity,
        commissionRate: item.commissionRate,
        platformCommission: item.platformCommission,
        sellerGrossSettlement: item.sellerGrossSettlement,
        status: 'settled',
        createdAt: now,
      };
      memoryStore.commissions.push(commissionRecord);

      // Credit Seller Ledger
      const currentSellerBalance = memoryStore.ledger
        .filter(l => l.entityId === item.sellerId)
        .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

      const ledgerEntry: LedgerEntry = {
        id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        entityType: 'seller',
        entityId: item.sellerId,
        entityName: item.sellerName,
        type: 'credit',
        amount: item.sellerGrossSettlement,
        referenceOrderId: newOrder.orderNumber,
        description: `Settlement for Order #${newOrder.orderNumber} (${item.productTitle}) after ${item.commissionRate}% platform commission`,
        balanceAfter: currentSellerBalance + item.sellerGrossSettlement,
        createdAt: now,
      };
      memoryStore.ledger.push(ledgerEntry);
    }

    // Credit Platform Ledger for prepaid orders
    const totalCommissionThisOrder = orderItems.reduce((sum, i) => sum + i.platformCommission, 0);
    const currentPlatformCommission = memoryStore.ledger
      .filter(l => l.entityType === 'platform')
      .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

    memoryStore.ledger.push({
      id: `led_plat_${Date.now()}`,
      entityType: 'platform',
      entityId: 'platform_main',
      entityName: 'HS market CLUB Platform',
      type: 'credit',
      amount: totalCommissionThisOrder,
      referenceOrderId: newOrder.orderNumber,
      description: `Platform Commission from Order #${newOrder.orderNumber}`,
      balanceAfter: currentPlatformCommission + totalCommissionThisOrder,
      createdAt: now,
    });
  } else {
    // Record pending commission records for COD (unsettled until owner verifies courier cash deposit)
    for (const item of orderItems) {
      const commissionRecord: CommissionRecord = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        orderItemId: item.id,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellingPrice: item.sellingPrice * item.quantity,
        commissionRate: item.commissionRate,
        platformCommission: item.platformCommission,
        sellerGrossSettlement: item.sellerGrossSettlement,
        status: 'adjusted', // Not yet settled
        note: 'Pending COD cash collection and owner verification',
        createdAt: now,
      };
    }
  }

  memoryStore.orders.unshift(newOrder);
  saveStore(memoryStore);

  res.status(201).json({ success: true, order: newOrder });
});

// Update Order Status (Seller, Courier, or Owner)
app.post('/api/orders/:id/status', (req: Request, res: Response) => {
  const { newStatus, actorRole, actorName, note, courierId } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Validate state transition
  const isValid = isValidOrderStatusTransition(order.orderStatus, newStatus);
  if (!isValid && actorRole !== 'owner') {
    return res.status(400).json({
      error: `Invalid status transition from ${order.orderStatus} to ${newStatus}`,
    });
  }

  const now = new Date().toISOString();
  order.orderStatus = newStatus;
  order.updatedAt = now;

  // Courier Assignment handling
  if (newStatus === 'courier_assigned' && courierId) {
    const courier = memoryStore.users.find(u => u.id === courierId);
    if (courier) {
      order.courierId = courier.id;
      order.courierName = courier.name;
      order.courierPhone = courier.phone;
      order.courierFee = memoryStore.settings.courierFeePerDelivery;
    }
  }

  // Live Location progress simulation
  if (order.deliveryLocation) {
    if (newStatus === 'picked_up') {
      order.deliveryLocation.courierCurrentLocation.stepPercent = 25;
      order.deliveryLocation.etaMinutes = 25;
    } else if (newStatus === 'in_transit') {
      order.deliveryLocation.courierCurrentLocation.stepPercent = 60;
      order.deliveryLocation.etaMinutes = 15;
    } else if (newStatus === 'out_for_delivery') {
      order.deliveryLocation.courierCurrentLocation.stepPercent = 90;
      order.deliveryLocation.etaMinutes = 5;
    } else if (newStatus === 'delivered') {
      order.deliveryLocation.courierCurrentLocation.stepPercent = 100;
      order.deliveryLocation.etaMinutes = 0;
    }
  }

  // Add timeline event
  order.timeline.push({
    status: newStatus,
    timestamp: now,
    title: getStatusTitle(newStatus),
    description: note || `Status updated to ${newStatus} by ${actorName || actorRole}`,
    actorRole: actorRole || 'owner',
    actorName: actorName || 'System',
  });

  saveStore(memoryStore);
  res.json({ success: true, order });
});

// Courier confirms delivery with Customer OTP
app.post('/api/orders/:id/verify-delivery', (req: Request, res: Response) => {
  const { otp, courierId } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!verifyDeliveryOtp(order.deliveryOtp, otp)) {
    return res.status(400).json({ error: 'Incorrect Delivery OTP. Please verify with customer.' });
  }

  const now = new Date().toISOString();
  order.orderStatus = 'delivered';
  order.updatedAt = now;

  // Handle COD cash collection during delivery
  if (order.paymentMethod === 'cod') {
    if (!order.codDetails) {
      order.codDetails = {
        isCod: true,
        amountToCollect: order.totalPayable,
        collectionStatus: 'pending_collection',
      };
    }
    // Mark cash collected by courier and generate official receipt
    order.codDetails.collectedAmount = order.totalPayable;
    order.codDetails.collectedAt = now;
    order.codDetails.courierId = courierId || order.courierId;
    order.codDetails.courierName = order.courierName;
    order.codDetails.collectionStatus = 'collected_by_courier';
    if (!order.codDetails.receiptNumber) {
      order.codDetails.receiptNumber = generateCashReceiptNumber(order.orderNumber);
    }
    // Payment status remains pending owner deposit verification
    order.paymentStatus = 'pending';
  } else {
    order.paymentStatus = 'paid';
  }

  if (order.deliveryLocation) {
    order.deliveryLocation.courierCurrentLocation.stepPercent = 100;
    order.deliveryLocation.etaMinutes = 0;
  }

  order.timeline.push({
    status: 'delivered',
    timestamp: now,
    title: 'Delivered Successfully',
    description: order.paymentMethod === 'cod'
      ? `Verified with Customer OTP. Cash of ₹${order.totalPayable} collected by courier (Receipt #${order.codDetails?.receiptNumber}).`
      : `Verified with Customer OTP. Handed over by delivery partner.`,
    actorRole: 'courier',
    actorName: order.courierName || 'Courier Partner',
  });

  // Credit courier partner delivery compensation fee (₹35)
  const courierFee = order.courierFee || memoryStore.settings.courierFeePerDelivery;
  if (order.courierId) {
    const courierBalance = memoryStore.ledger
      .filter(l => l.entityId === order.courierId)
      .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

    memoryStore.ledger.push({
      id: `led_cour_${Date.now()}`,
      entityType: 'courier',
      entityId: order.courierId,
      entityName: order.courierName || 'Delivery Partner',
      type: 'credit',
      amount: courierFee,
      referenceOrderId: order.orderNumber,
      description: `Delivery fee payout for Order #${order.orderNumber}`,
      balanceAfter: courierBalance + courierFee,
      createdAt: now,
    });
  }

  saveStore(memoryStore);
  res.json({
    success: true,
    order,
    message: order.paymentMethod === 'cod'
      ? 'Cash collected & delivery verified! Cash is currently held in hand awaiting platform deposit.'
      : 'Delivery verified and completed!',
  });
});

/**
 * Courier explicitly marks cash as collected and generates collection receipt
 */
app.post('/api/orders/:id/cod-collect', (req: Request, res: Response) => {
  const { courierId, amount } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.paymentMethod !== 'cod') {
    return res.status(400).json({ error: 'This is not a Cash on Delivery order' });
  }

  const now = new Date().toISOString();
  if (!order.codDetails) {
    order.codDetails = {
      isCod: true,
      amountToCollect: order.totalPayable,
      collectionStatus: 'pending_collection',
    };
  }

  order.codDetails.collectedAmount = Number(amount) || order.totalPayable;
  order.codDetails.collectedAt = now;
  order.codDetails.courierId = courierId || order.courierId;
  order.codDetails.courierName = order.courierName;
  order.codDetails.collectionStatus = 'collected_by_courier';
  if (!order.codDetails.receiptNumber) {
    order.codDetails.receiptNumber = generateCashReceiptNumber(order.orderNumber);
  }
  order.updatedAt = now;

  order.timeline.push({
    status: order.orderStatus,
    timestamp: now,
    title: 'Cash Collected from Customer',
    description: `Courier collected ₹${order.codDetails.collectedAmount} in cash. Receipt #${order.codDetails.receiptNumber} generated.`,
    actorRole: 'courier',
    actorName: order.courierName || 'Courier Partner',
  });

  saveStore(memoryStore);
  res.json({
    success: true,
    order,
    receiptNumber: order.codDetails.receiptNumber,
    message: `Cash of ₹${order.codDetails.collectedAmount} collected. Receipt generated.`,
  });
});

/**
 * Courier reports failed delivery (Customer refused, unavailable, cash not ready, etc.)
 */
app.post('/api/orders/:id/failed-delivery', (req: Request, res: Response) => {
  const { reason, notes, courierId } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  order.orderStatus = 'failed_delivery';
  order.updatedAt = now;

  if (!order.codDetails) {
    order.codDetails = {
      isCod: order.paymentMethod === 'cod',
      amountToCollect: order.totalPayable,
      collectionStatus: 'failed',
    };
  }
  order.codDetails.collectionStatus = 'failed';
  order.codDetails.failureReason = reason || 'customer_refused';
  order.codDetails.failureNotes = notes || '';

  const reasonLabels: Record<string, string> = {
    customer_refused: 'Customer refused delivery',
    customer_unavailable: 'Customer unavailable / address locked',
    incorrect_address: 'Incorrect delivery address or contact unreachable',
    cash_not_ready: 'Customer cash was not ready for COD',
  };

  order.timeline.push({
    status: 'failed_delivery',
    timestamp: now,
    title: 'Delivery Attempt Failed',
    description: `Reason: ${reasonLabels[reason] || reason}. ${notes ? `Notes: ${notes}` : ''}`,
    actorRole: 'courier',
    actorName: order.courierName || 'Courier Partner',
  });

  saveStore(memoryStore);
  res.json({ success: true, order, message: 'Delivery marked as failed. Order queued for RTO (Return to Origin).' });
});

/**
 * Dispatch Return to Origin (RTO) back to seller
 */
app.post('/api/orders/:id/rto-dispatch', (req: Request, res: Response) => {
  const order = memoryStore.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  order.orderStatus = 'rto_in_transit';
  order.updatedAt = now;

  order.timeline.push({
    status: 'rto_in_transit',
    timestamp: now,
    title: 'Return to Origin (RTO) in Transit',
    description: 'Undelivered package is in transit back to the seller fulfillment center.',
    actorRole: 'courier',
  });

  saveStore(memoryStore);
  res.json({ success: true, order });
});

/**
 * Seller inspects and accepts RTO return, restoring product inventory
 */
app.post('/api/orders/:id/rto-accept', (req: Request, res: Response) => {
  const { notes, sellerId } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  order.orderStatus = 'returned';
  order.updatedAt = now;

  // Restore inventory stock based on actual seller return inspection
  for (const item of order.items) {
    const prod = memoryStore.products.find(p => p.id === item.productId);
    if (prod) {
      prod.stock += item.quantity;
    }
  }

  order.timeline.push({
    status: 'returned',
    timestamp: now,
    title: 'RTO Package Inspected & Restocked',
    description: `Seller verified returned item condition. Stock restored to inventory. ${notes ? `Notes: ${notes}` : ''}`,
    actorRole: 'seller',
  });

  saveStore(memoryStore);
  res.json({ success: true, order, message: 'RTO package accepted. Product stock restored.' });
});

/**
 * Courier submits Cash Deposit to Platform / Owner
 */
app.post('/api/cod/deposits', (req: Request, res: Response) => {
  const { courierId, orderIds, amount, paymentMode, transactionReference, depositReceiptUrl, notes } = req.body;
  const courier = memoryStore.users.find(u => u.id === courierId && u.role === 'courier');

  if (!courier) return res.status(400).json({ error: 'Courier not found' });
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid deposit amount required' });
  }
  if (!transactionReference) {
    return res.status(400).json({ error: 'Bank UTR / UPI reference / deposit receipt number is required' });
  }

  const now = new Date().toISOString();
  const coveredOrders = memoryStore.orders.filter(o => orderIds && orderIds.includes(o.id));
  const orderNumbers = coveredOrders.map(o => o.orderNumber);

  const depositId = `dep_${Date.now()}`;
  const depositNumber = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

  const newDeposit: CodDeposit = {
    id: depositId,
    depositNumber,
    courierId,
    courierName: courier.name,
    courierPhone: courier.phone,
    orderIds: orderIds || [],
    orderNumbers,
    amount: Number(amount),
    paymentMode: paymentMode || 'bank_transfer',
    transactionReference,
    depositReceiptUrl,
    notes,
    status: 'pending_verification',
    depositedAt: now,
  };

  // Mark all covered orders as deposited (pending owner verification)
  for (const ord of coveredOrders) {
    if (ord.codDetails) {
      ord.codDetails.collectionStatus = 'deposited';
      ord.codDetails.depositId = depositId;
      ord.codDetails.depositReference = transactionReference;
      ord.codDetails.depositMode = paymentMode;
      ord.codDetails.depositedAt = now;
    }
  }

  memoryStore.codDeposits.unshift(newDeposit);
  saveStore(memoryStore);

  res.status(201).json({
    success: true,
    deposit: newDeposit,
    message: 'Deposit submitted successfully! Awaiting owner verification.',
  });
});

/**
 * Owner verifies or rejects courier cash deposit
 * CRITICAL FINANCIAL SAFETY RULE:
 * Platform commission and seller settlements are ONLY realized and credited when owner verifies deposit!
 */
app.post('/api/cod/deposits/:id/action', (req: Request, res: Response) => {
  const { action, notes } = req.body; // 'verify' | 'reject'
  const deposit = memoryStore.codDeposits.find(d => d.id === req.params.id);

  if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });

  const now = new Date().toISOString();

  if (action === 'verify') {
    deposit.status = 'verified';
    deposit.verifiedAt = now;
    deposit.verifiedBy = 'owner_himanshu';

    // Settle each covered order: credit seller ledger and credit platform commission
    const coveredOrders = memoryStore.orders.filter(o => deposit.orderIds.includes(o.id));

    for (const order of coveredOrders) {
      if (order.codDetails) {
        order.codDetails.collectionStatus = 'verified_by_owner';
        order.codDetails.verifiedAt = now;
        order.codDetails.verifiedBy = 'owner_himanshu';
      }
      order.paymentStatus = 'paid';

      // Realize commission for each line item and credit seller ledger
      for (const item of order.items) {
        const commRec = memoryStore.commissions.find(c => c.orderId === order.id && c.orderItemId === item.id);
        if (commRec) {
          commRec.status = 'settled';
          commRec.note = `Realized upon Owner verification of Courier Deposit #${deposit.depositNumber}`;
        }

        // Credit Seller Ledger
        const currentSellerBalance = memoryStore.ledger
          .filter(l => l.entityId === item.sellerId)
          .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

        memoryStore.ledger.push({
          id: `led_cod_set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          entityType: 'seller',
          entityId: item.sellerId,
          entityName: item.sellerName,
          type: 'credit',
          amount: item.sellerGrossSettlement,
          referenceOrderId: order.orderNumber,
          description: `COD Settlement for Order #${order.orderNumber} (${item.productTitle}) verified from Deposit #${deposit.depositNumber} (UTR: ${deposit.transactionReference})`,
          balanceAfter: currentSellerBalance + item.sellerGrossSettlement,
          createdAt: now,
        });

        // Credit Platform Ledger
        const currentPlatformCommission = memoryStore.ledger
          .filter(l => l.entityType === 'platform')
          .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

        memoryStore.ledger.push({
          id: `led_plat_cod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          entityType: 'platform',
          entityId: 'platform_main',
          entityName: 'HS market CLUB Platform',
          type: 'credit',
          amount: item.platformCommission,
          referenceOrderId: order.orderNumber,
          description: `Platform 2.5% Commission from COD Order #${order.orderNumber} (Deposit #${deposit.depositNumber})`,
          balanceAfter: currentPlatformCommission + item.platformCommission,
          createdAt: now,
        });
      }

      order.timeline.push({
        status: 'delivered',
        timestamp: now,
        title: 'COD Cash Deposit Verified & Settled',
        description: `Owner verified cash receipt (Deposit #${deposit.depositNumber}, Ref: ${deposit.transactionReference}). Seller settlement & platform commission released.`,
        actorRole: 'owner',
        actorName: 'Super Admin',
      });
    }

    saveStore(memoryStore);
    res.json({
      success: true,
      deposit,
      message: `Deposit #${deposit.depositNumber} verified! Seller payouts and platform commission released to ledger.`,
    });
  } else {
    // Rejected / Discrepancy
    deposit.status = 'rejected';
    deposit.rejectionReason = notes || 'Discrepancy in bank UTR / deposit amount. Verification rejected.';

    // Covered orders revert to 'collected_by_courier' so courier still holds outstanding liability!
    const coveredOrders = memoryStore.orders.filter(o => deposit.orderIds.includes(o.id));
    for (const order of coveredOrders) {
      if (order.codDetails) {
        order.codDetails.collectionStatus = 'collected_by_courier';
        order.codDetails.depositReference = undefined;
      }
    }

    saveStore(memoryStore);
    res.json({
      success: true,
      deposit,
      message: `Deposit #${deposit.depositNumber} marked as discrepancy/rejected. Outstanding liability remains against courier.`,
    });
  }
});

/**
 * Get Platform COD Reconciliation Statistics & Outstanding Liabilities
 */
app.get('/api/cod/reconciliation', (_req: Request, res: Response) => {
  const stats = calculateCodReconciliationStats(memoryStore.orders, memoryStore.codDeposits);

  // Calculate courier liability breakdown
  const couriers = memoryStore.users.filter(u => u.role === 'courier');
  const liabilities = couriers.map(courier => {
    const courierData = calculateCourierCashInHand(courier.id, memoryStore.orders, memoryStore.codDeposits);
    const unverifiedDeposits = memoryStore.codDeposits.filter(d => d.courierId === courier.id && d.status === 'pending_verification');
    const rejectedDeposits = memoryStore.codDeposits.filter(d => d.courierId === courier.id && d.status === 'rejected');

    return {
      courierId: courier.id,
      courierName: courier.name,
      courierPhone: courier.phone,
      vehicleNumber: courier.vehicleNumber,
      totalCollected: courierData.totalCollected,
      cashInHandLiability: courierData.cashInHand,
      pendingVerificationAmount: courierData.pendingVerification,
      verifiedDepositedAmount: courierData.verifiedDeposited,
      unverifiedDepositsCount: unverifiedDeposits.length,
      discrepancyCount: rejectedDeposits.length,
      hasDiscrepancy: rejectedDeposits.length > 0 || courierData.cashInHand > 5000, // alert if holding > ₹5,000
    };
  });

  const codOrders = memoryStore.orders.filter(o => o.paymentMethod === 'cod');

  res.json({
    stats,
    deposits: memoryStore.codDeposits,
    liabilities,
    codOrders,
  });
});

/**
 * Cash Collection Receipt endpoint
 */
app.get('/api/cod/receipt/:orderId', (req: Request, res: Response) => {
  const order = memoryStore.orders.find(o => o.id === req.params.orderId || o.orderNumber === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.paymentMethod !== 'cod') return res.status(400).json({ error: 'Not a COD order' });

  const receipt = {
    receiptNumber: order.codDetails?.receiptNumber || `RCP-COD-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    collectionDate: order.codDetails?.collectedAt || order.updatedAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: `${order.shippingAddress.addressLine}, ${order.shippingAddress.locality}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}`,
    courierName: order.courierName || 'Authorized Delivery Partner',
    courierPhone: order.courierPhone,
    amountCollected: order.codDetails?.collectedAmount || order.totalPayable,
    collectionStatus: order.codDetails?.collectionStatus || 'pending_collection',
    depositReference: order.codDetails?.depositReference,
    items: order.items.map(i => ({ title: i.productTitle, quantity: i.quantity, price: i.sellingPrice })),
    terms: 'This is a computer generated Cash Collection Receipt issued under HS market CLUB Marketplace Guidelines.',
  };

  res.json(receipt);
});

// Cancel Order (Customer, Seller, or Owner) -> Reverses commission & restores stock
app.post('/api/orders/:id/cancel', (req: Request, res: Response) => {
  const { reason, actorRole, actorName } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') {
    return res.status(400).json({ error: `Cannot cancel order in ${order.orderStatus} state` });
  }

  const now = new Date().toISOString();
  order.orderStatus = 'cancelled';
  order.cancellationReason = reason || 'Customer requested cancellation';
  order.updatedAt = now;

  order.timeline.push({
    status: 'cancelled',
    timestamp: now,
    title: 'Order Cancelled',
    description: `Reason: ${order.cancellationReason}`,
    actorRole: actorRole || 'customer',
    actorName: actorName || 'Customer',
  });

  // Restore product stock
  for (const item of order.items) {
    const prod = memoryStore.products.find(p => p.id === item.productId);
    if (prod) prod.stock += item.quantity;

    // Reverse Commission & Debit Seller Ledger
    const commRec = memoryStore.commissions.find(c => c.orderId === order.id && c.orderItemId === item.id);
    if (commRec && commRec.status === 'settled') {
      commRec.status = 'reversed';
      commRec.note = `Reversed due to cancellation: ${order.cancellationReason}`;

      // Debit seller ledger
      const currentSellerBalance = memoryStore.ledger
        .filter(l => l.entityId === item.sellerId)
        .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

      memoryStore.ledger.push({
        id: `led_rev_${Date.now()}`,
        entityType: 'seller',
        entityId: item.sellerId,
        entityName: item.sellerName,
        type: 'debit',
        amount: item.sellerGrossSettlement,
        referenceOrderId: order.orderNumber,
        description: `Reversal for cancelled Order #${order.orderNumber}`,
        balanceAfter: currentSellerBalance - item.sellerGrossSettlement,
        createdAt: now,
      });

      // Debit platform commission ledger
      const currentPlatformCommission = memoryStore.ledger
        .filter(l => l.entityType === 'platform')
        .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

      memoryStore.ledger.push({
        id: `led_plat_rev_${Date.now()}`,
        entityType: 'platform',
        entityId: 'platform_main',
        entityName: 'HS market CLUB Platform',
        type: 'debit',
        amount: item.platformCommission,
        referenceOrderId: order.orderNumber,
        description: `Commission reversal for cancelled Order #${order.orderNumber}`,
        balanceAfter: currentPlatformCommission - item.platformCommission,
        createdAt: now,
      });
    }
  }

  saveStore(memoryStore);
  res.json({ success: true, order });
});

// Return & Refund Request
app.post('/api/orders/:id/return', (req: Request, res: Response) => {
  const { reason } = req.body;
  const order = memoryStore.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.orderStatus !== 'delivered') {
    return res.status(400).json({ error: 'Only delivered orders can be returned' });
  }

  const now = new Date().toISOString();
  order.orderStatus = 'return_requested';
  order.returnReason = reason || 'Customer requested return';
  order.updatedAt = now;

  order.timeline.push({
    status: 'return_requested',
    timestamp: now,
    title: 'Return Requested',
    description: `Return reason: ${order.returnReason}`,
    actorRole: 'customer',
  });

  saveStore(memoryStore);
  res.json({ success: true, order });
});

// Process Refund (Owner or Seller approves return)
app.post('/api/orders/:id/refund', (req: Request, res: Response) => {
  const order = memoryStore.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  order.orderStatus = 'refunded';
  order.paymentStatus = 'refunded';
  order.updatedAt = now;

  order.timeline.push({
    status: 'refunded',
    timestamp: now,
    title: 'Refund Processed',
    description: `Refund of ₹${order.totalPayable} credited back. Commission adjusted.`,
    actorRole: 'owner',
  });

  // Reversal for each item
  for (const item of order.items) {
    const commRec = memoryStore.commissions.find(c => c.orderId === order.id && c.orderItemId === item.id);
    if (commRec && commRec.status === 'settled') {
      commRec.status = 'reversed';
      commRec.note = 'Reversed on completed return refund';

      // Debit seller ledger
      const sellerBalance = memoryStore.ledger
        .filter(l => l.entityId === item.sellerId)
        .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

      memoryStore.ledger.push({
        id: `led_ref_${Date.now()}`,
        entityType: 'seller',
        entityId: item.sellerId,
        entityName: item.sellerName,
        type: 'debit',
        amount: item.sellerGrossSettlement,
        referenceOrderId: order.orderNumber,
        description: `Refund debit for returned Order #${order.orderNumber}`,
        balanceAfter: sellerBalance - item.sellerGrossSettlement,
        createdAt: now,
      });

      // Debit platform ledger
      const platBalance = memoryStore.ledger
        .filter(l => l.entityType === 'platform')
        .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

      memoryStore.ledger.push({
        id: `led_plat_ref_${Date.now()}`,
        entityType: 'platform',
        entityId: 'platform_main',
        entityName: 'HS market CLUB Platform',
        type: 'debit',
        amount: item.platformCommission,
        referenceOrderId: order.orderNumber,
        description: `Platform commission adjustment for returned Order #${order.orderNumber}`,
        balanceAfter: platBalance - item.platformCommission,
        createdAt: now,
      });
    }
  }

  saveStore(memoryStore);
  res.json({ success: true, order });
});

// ==========================================
// SELLER & COURIER MANAGEMENT (OWNER)
// ==========================================

app.get('/api/sellers', (_req: Request, res: Response) => {
  const sellers = memoryStore.users.filter(u => u.role === 'seller');
  res.json(sellers);
});

app.post('/api/sellers/:id/status', (req: Request, res: Response) => {
  const { status, sellerCommissionRate } = req.body;
  const seller = memoryStore.users.find(u => u.id === req.params.id && u.role === 'seller');

  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  if (status) seller.status = status;
  if (typeof sellerCommissionRate === 'number') {
    seller.sellerCommissionRate = Math.min(3.0, Math.max(2.0, sellerCommissionRate));
  }

  saveStore(memoryStore);
  res.json({ success: true, seller });
});

app.get('/api/couriers', (_req: Request, res: Response) => {
  const couriers = memoryStore.users.filter(u => u.role === 'courier');
  res.json(couriers);
});

app.post('/api/couriers/:id/status', (req: Request, res: Response) => {
  const { status, isAvailable } = req.body;
  const courier = memoryStore.users.find(u => u.id === req.params.id && u.role === 'courier');

  if (!courier) return res.status(404).json({ error: 'Courier not found' });

  if (status) courier.status = status;
  if (typeof isAvailable === 'boolean') courier.isAvailable = isAvailable;

  saveStore(memoryStore);
  res.json({ success: true, courier });
});

// ==========================================
// FINANCIALS, LEDGER & PAYOUTS
// ==========================================

app.get('/api/financials', (req: Request, res: Response) => {
  const { entityId, entityType } = req.query;

  let ledger = [...memoryStore.ledger];
  if (entityId) {
    ledger = ledger.filter(l => l.entityId === entityId);
  } else if (entityType) {
    ledger = ledger.filter(l => l.entityType === entityType);
  }

  // Calculate gross marketplace KPIs
  const completedOrders = memoryStore.orders.filter(o => o.orderStatus === 'delivered');
  const grossMerchandiseValue = memoryStore.orders
    .filter(o => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalPayable, 0);

  const totalPlatformCommission = memoryStore.commissions
    .filter(c => c.status === 'settled')
    .reduce((sum, c) => sum + c.platformCommission, 0);

  // Balances
  const sellerLedgerCredits = memoryStore.ledger.filter(l => l.entityType === 'seller' && l.type === 'credit').reduce((s, l) => s + l.amount, 0);
  const sellerLedgerDebits = memoryStore.ledger.filter(l => l.entityType === 'seller' && l.type === 'debit').reduce((s, l) => s + l.amount, 0);
  const sellerPayableBalance = Math.max(0, sellerLedgerCredits - sellerLedgerDebits);

  const courierCredits = memoryStore.ledger.filter(l => l.entityType === 'courier' && l.type === 'credit').reduce((s, l) => s + l.amount, 0);
  const courierDebits = memoryStore.ledger.filter(l => l.entityType === 'courier' && l.type === 'debit').reduce((s, l) => s + l.amount, 0);
  const courierPayableBalance = Math.max(0, courierCredits - courierDebits);

  res.json({
    grossMerchandiseValue,
    totalPlatformCommission,
    sellerPayableBalance,
    courierPayableBalance,
    totalOrders: memoryStore.orders.length,
    completedOrdersCount: completedOrders.length,
    ledger: ledger.slice(-100).reverse(), // latest 100 entries
    commissions: memoryStore.commissions.slice(-100).reverse(),
  });
});

app.get('/api/payouts', (req: Request, res: Response) => {
  const { entityId } = req.query;
  let list = [...memoryStore.payouts];
  if (entityId) {
    list = list.filter(p => p.entityId === entityId);
  }
  res.json(list);
});

app.post('/api/payouts/request', (req: Request, res: Response) => {
  const { entityId, entityType, amount, bankOrUpiDetails } = req.body;
  const user = memoryStore.users.find(u => u.id === entityId);

  if (!user || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid payout request details' });
  }

  const newPayout: PayoutRequest = {
    id: `pay_${Date.now()}`,
    entityType: entityType || 'seller',
    entityId,
    entityName: user.businessName || user.name,
    amount: Number(amount),
    bankOrUpiDetails: bankOrUpiDetails || user.upiId || 'Direct Bank NEFT',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  memoryStore.payouts.unshift(newPayout);
  saveStore(memoryStore);
  res.status(201).json({ success: true, payout: newPayout });
});

app.post('/api/payouts/:id/action', (req: Request, res: Response) => {
  const { action, notes } = req.body; // 'approve' | 'reject'
  const payout = memoryStore.payouts.find(p => p.id === req.params.id);

  if (!payout) return res.status(404).json({ error: 'Payout not found' });

  payout.status = action === 'approve' ? 'approved' : 'rejected';
  payout.processedAt = new Date().toISOString();
  payout.notes = notes || '';

  if (action === 'approve') {
    // Debit entity ledger
    const currentBalance = memoryStore.ledger
      .filter(l => l.entityId === payout.entityId)
      .reduce((sum, l) => l.type === 'credit' ? sum + l.amount : sum - l.amount, 0);

    memoryStore.ledger.push({
      id: `led_po_${Date.now()}`,
      entityType: payout.entityType,
      entityId: payout.entityId,
      entityName: payout.entityName,
      type: 'debit',
      amount: payout.amount,
      description: `Payout withdrawal transferred via ${payout.bankOrUpiDetails}`,
      balanceAfter: currentBalance - payout.amount,
      createdAt: new Date().toISOString(),
    });
  }

  saveStore(memoryStore);
  res.json({ success: true, payout });
});

// Reviews
app.get('/api/reviews', (req: Request, res: Response) => {
  const { productId } = req.query;
  let list = [...memoryStore.reviews];
  if (productId) {
    list = list.filter(r => r.productId === productId);
  }
  res.json(list);
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { productId, customerId, rating, title, comment, imageUrl } = req.body;
  const customer = memoryStore.users.find(u => u.id === customerId);

  const newReview: Review = {
    id: `rev_${Date.now()}`,
    productId,
    customerId,
    customerName: customer?.name || 'Verified Buyer',
    rating: Number(rating) || 5,
    title: title || 'Great product',
    comment: comment || '',
    imageUrl,
    verifiedPurchase: true,
    createdAt: new Date().toISOString(),
  };

  memoryStore.reviews.unshift(newReview);

  // Update product average rating
  const product = memoryStore.products.find(p => p.id === productId);
  if (product) {
    const prodReviews = memoryStore.reviews.filter(r => r.productId === productId);
    const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
    product.averageRating = Math.round(avg * 10) / 10;
    product.ratingsCount = prodReviews.length;
  }

  saveStore(memoryStore);
  res.status(201).json({ success: true, review: newReview });
});

// Optional: Owner Starter Catalog Seeder (for 1-click test flow if owner requests it)
app.post('/api/admin/seed-starter', (_req: Request, res: Response) => {
  // Create an approved verified Seller
  const testSeller: UserProfile = {
    id: 'seller_himanshu_tech',
    role: 'seller',
    name: 'Kushwaha Electronics & Lifestyle',
    phone: '9811223344',
    email: 'kushwaha.tech@hsmarketclub.in',
    status: 'active',
    createdAt: new Date().toISOString(),
    businessName: 'Kushwaha Retailers Pvt Ltd',
    gstin: '07AABCU9603R1ZM',
    panNumber: 'AABCU9603R',
    bankDetails: {
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0000001',
      accountHolderName: 'Kushwaha Retailers Pvt Ltd',
      bankName: 'HDFC Bank',
    },
    totalSales: 125000,
    rating: 4.8,
  };

  // Create an approved active Courier
  const testCourier: UserProfile = {
    id: 'courier_shivam_express',
    role: 'courier',
    name: 'Shivam Express Delivery',
    phone: '9877889900',
    email: 'shivam.express@hsmarketclub.in',
    status: 'active',
    createdAt: new Date().toISOString(),
    vehicleType: 'bike',
    vehicleNumber: 'DL 04 CD 9988',
    drivingLicense: 'DL-0420190012345',
    upiId: 'shivam.express@paytm',
    isAvailable: true,
    totalDeliveries: 42,
    courierRating: 4.9,
  };

  // Add them if missing
  if (!memoryStore.users.some(u => u.id === testSeller.id)) {
    memoryStore.users.push(testSeller);
  }
  if (!memoryStore.users.some(u => u.id === testCourier.id)) {
    memoryStore.users.push(testCourier);
  }

  // 4 authentic realistic Indian products
  const starterProducts: Product[] = [
    {
      id: 'prod_smartphone_5g',
      sellerId: testSeller.id,
      sellerName: testSeller.name,
      sellerBusinessName: testSeller.businessName!,
      title: 'Realme Narzo 70 Pro 5G (Glass Green, 128 GB)',
      description: 'Dimensity 7050 5G Processor, Sony IMX890 OIS Camera, Horizon Glass Design, 67W SUPERVOOC Fast Charge with 5000 mAh Battery.',
      category: 'mobiles',
      subcategory: 'Smartphones',
      mrp: 19999,
      sellingPrice: 15999,
      stock: 25,
      sku: 'SKU-RLM-70PRO',
      images: [
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
      ],
      selectedSizes: ['128GB', '256GB'],
      selectedColors: ['Glass Green', 'Glass Gold'],
      isApproved: true,
      isActive: true,
      featured: true,
      ratingsCount: 48,
      averageRating: 4.6,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod_wireless_anc_earbuds',
      sellerId: testSeller.id,
      sellerName: testSeller.name,
      sellerBusinessName: testSeller.businessName!,
      title: 'boAt Nirvana Ion ANC True Wireless Earbuds',
      description: '32 dB Active Noise Cancellation, 120 Hours Total Playback, Dual EQ Modes (Crystal Bionic Sound), Beast Mode 60ms Low Latency.',
      category: 'electronics',
      subcategory: 'Audio & Headphones',
      mrp: 4990,
      sellingPrice: 1999,
      stock: 50,
      sku: 'SKU-BOAT-ION-ANC',
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      ],
      selectedColors: ['Charcoal Black', 'Ivory White'],
      isApproved: true,
      isActive: true,
      featured: true,
      ratingsCount: 112,
      averageRating: 4.5,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod_cotton_kurta_set',
      sellerId: testSeller.id,
      sellerName: testSeller.name,
      sellerBusinessName: testSeller.businessName!,
      title: 'Men Embroidered Pure Cotton Straight Kurta with Pajama',
      description: 'Premium soft cotton weave with intricate mandarin collar embroidery. Breathable, tailored festive silhouette, machine washable.',
      category: 'fashion',
      subcategory: 'Men T-Shirts',
      mrp: 2499,
      sellingPrice: 1000, // Exact ₹1,000 product for TEST CASE 3 verification!
      stock: 35,
      sku: 'SKU-KURTA-COTTON-1000',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
      ],
      selectedSizes: ['M', 'L', 'XL', 'XXL'],
      selectedColors: ['Royal Navy', 'Ivory Cream', 'Wine Red'],
      isApproved: true,
      isActive: true,
      featured: true,
      ratingsCount: 29,
      averageRating: 4.7,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod_smart_kitchen_blender',
      sellerId: testSeller.id,
      sellerName: testSeller.name,
      sellerBusinessName: testSeller.businessName!,
      title: 'Prestige Iris Plus 750 Watt Mixer Grinder with 4 Jars',
      description: 'Heavy duty 750W motor with overload protection, 3 stainless steel jars + transparent juicer jar with flow breaker design.',
      category: 'home',
      subcategory: 'Cookware',
      mrp: 4295,
      sellingPrice: 2899,
      stock: 20,
      sku: 'SKU-PRES-IRIS-750',
      images: [
        'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600',
      ],
      selectedColors: ['Black & Silver'],
      isApproved: true,
      isActive: true,
      featured: false,
      ratingsCount: 84,
      averageRating: 4.4,
      createdAt: new Date().toISOString(),
    },
  ];

  memoryStore.products = starterProducts;
  saveStore(memoryStore);

  res.json({
    success: true,
    message: 'Starter test catalog loaded successfully with 4 verified products, 1 seller, and 1 courier.',
    productsCount: starterProducts.length,
  });
});

// Reset Marketplace (back to clean state)
app.post('/api/admin/reset-marketplace', (_req: Request, res: Response) => {
  const existingOwner = memoryStore.users.find((u) => u.role === 'owner');
  const preservedUsername = existingOwner?.username || 'admin';
  const preservedPassword = existingOwner?.password || 'AdminPassword@123';
  const preservedSettings = memoryStore.settings || DEFAULT_STORE.settings;

  memoryStore = {
    ...DEFAULT_STORE,
    settings: preservedSettings,
    users: [
      {
        id: 'owner_himanshu',
        role: 'owner',
        name: 'Himanshu Kushwaha (H/S)',
        phone: '9876543210',
        email: 'admin@hsmarketclub.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'active',
        username: preservedUsername,
        password: preservedPassword,
        createdAt: new Date().toISOString(),
      },
    ],
    products: [],
    orders: [],
    commissions: [],
    ledger: [],
    payouts: [],
    reviews: [],
    codDeposits: [],
  };
  saveStore(memoryStore);
  res.json({ success: true, message: 'Marketplace reset to completely clean initial state.' });
});

function getStatusTitle(status: OrderStatus): string {
  const titles: Record<OrderStatus, string> = {
    placed: 'Order Placed',
    payment_confirmed: 'Payment Confirmed',
    seller_accepted: 'Seller Accepted Order',
    packing: 'Item Packed & Ready',
    ready_for_pickup: 'Ready for Courier Pickup',
    courier_assigned: 'Delivery Partner Assigned',
    picked_up: 'Picked Up by Courier',
    in_transit: 'Package In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered to Customer',
    failed_delivery: 'Delivery Attempt Failed',
    rto_in_transit: 'Return to Origin (RTO) In Transit',
    rto_delivered: 'RTO Arrived at Hub',
    cancellation_requested: 'Cancellation Requested',
    cancelled: 'Order Cancelled',
    return_requested: 'Return Requested',
    returned: 'Returned & Restocked',
    refunded: 'Refund Processed',
  };
  return titles[status] || status;
}

// ==========================================
// VITE MIDDLEWARE / STATIC ASSETS
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HS market CLUB Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
