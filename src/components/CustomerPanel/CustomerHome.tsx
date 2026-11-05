/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Product, Category, UserProfile } from '../../types/marketplace';
import {
  Smartphone,
  Shirt,
  Laptop,
  Home,
  ShoppingBasket,
  Sparkles,
  Star,
  Heart,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  Filter,
  SlidersHorizontal,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface CustomerHomeProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  wishlist: string[];
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  language: Language;
  onSwitchToSeller: () => void;
  onSwitchToOwner: () => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  language,
  onSwitchToSeller,
  onSwitchToOwner,
}) => {
  const [pincode, setPincode] = useState('110001');
  const [isPincodeChecked, setIsPincodeChecked] = useState(true);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [minRating, setMinRating] = useState<number>(0);

  const t = translations[language];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smartphone':
        return <Smartphone className="w-6 h-6 text-blue-600" />;
      case 'Shirt':
        return <Shirt className="w-6 h-6 text-pink-600" />;
      case 'Laptop':
        return <Laptop className="w-6 h-6 text-indigo-600" />;
      case 'Home':
        return <Home className="w-6 h-6 text-amber-600" />;
      case 'ShoppingBasket':
        return <ShoppingBasket className="w-6 h-6 text-emerald-600" />;
      default:
        return <Sparkles className="w-6 h-6 text-purple-600" />;
    }
  };

  // Filter & Sort
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (minRating > 0 && p.averageRating < minRating) {
      return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
    if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
    if (sortBy === 'rating') return b.averageRating - a.averageRating;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  return (
    <div className="pb-16">
      {/* Category Navigation Bar (Flipkart Style Top Icons) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs mb-4">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => onSelectCategory('all')}
              className={`flex flex-col items-center gap-1 min-w-[72px] p-1.5 rounded-lg transition-transform hover:scale-105 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'text-[#2874f0] font-bold'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-center whitespace-nowrap">{t.allCategories}</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 min-w-[72px] p-1.5 rounded-lg transition-transform hover:scale-105 cursor-pointer ${
                    isSelected ? 'text-[#2874f0] font-bold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xs ${
                    isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {getCategoryIcon(cat.icon)}
                  </div>
                  <span className="text-xs text-center whitespace-nowrap">
                    {language === 'hi' && cat.hindiName ? cat.hindiName : cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Flipkart Style Grand Promotional Hero Banner */}
        <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 text-white border border-blue-500/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <div className="p-6 sm:p-8 lg:col-span-7 space-y-3 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-blue-950 font-black text-xs uppercase tracking-wider shadow">
                <Zap className="w-3.5 h-3.5" />
                <span>HS market CLUB Festival Bonanza</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Biggest Deals & Lowest Prices across India
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl">
                Enjoy 100% genuine products directly from certified Indian sellers. Low 2.5% platform commission guarantees best customer prices.
              </p>

              {/* Delivery Pincode Checker */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-white/10 backdrop-blur-md rounded-md p-1 border border-white/20">
                  <MapPin className="w-4 h-4 text-amber-300 ml-2" />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    placeholder="Enter Pincode"
                    className="w-28 bg-transparent text-white placeholder-blue-200 text-xs px-2 py-1 focus:outline-none font-semibold"
                  />
                  <button
                    onClick={() => setIsPincodeChecked(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs px-2.5 py-1 rounded transition-colors"
                  >
                    {t.checkPincode}
                  </button>
                </div>
                {isPincodeChecked && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                    <CheckCircle className="w-3.5 h-3.5" /> Fast Delivery to {pincode} (Free over ₹500)
                  </span>
                )}
              </div>
            </div>

            {/* Right Media Banner */}
            <div className="lg:col-span-5 h-48 sm:h-64 lg:h-72 overflow-hidden relative">
              <img
                src="/src/assets/images/hs_market_hero_banner_1793815324046.jpg"
                alt="HS market CLUB Mega Sale Banner"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-blue-700/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Flipkart Trust Guarantees Strip */}
          <div className="bg-blue-950/80 backdrop-blur-md border-t border-blue-500/20 px-6 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-blue-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>100% Genuine Products</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Fast Verified Couriers</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Easy 7-Day Returns</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Secure UPI & COD</span>
            </div>
          </div>
        </div>

        {/* Filter & Sorting Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2874f0]" /> Sort By:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'featured', label: 'Featured' },
                { id: 'price-asc', label: 'Price: Low to High' },
                { id: 'price-desc', label: 'Price: High to Low' },
                { id: 'rating', label: 'Customer Rating' },
              ].map((sortOption) => (
                <button
                  key={sortOption.id}
                  onClick={() => setSortBy(sortOption.id as any)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    sortBy === sortOption.id
                      ? 'bg-[#2874f0] text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sortOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{sortedProducts.length}</span> products
          </div>
        </div>

        {/* Products Grid or Blank Marketplace State */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {sortedProducts.map((product) => {
              const isWishlisted = wishlist.includes(product.id);
              const discountPct = product.mrp > product.sellingPrice
                ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col cursor-pointer relative"
                >
                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => onToggleWishlist(product.id, e)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow text-slate-400 hover:text-rose-500 transition-colors"
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart
                      className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                  </button>

                  {/* Product Image */}
                  <div className="aspect-square bg-slate-50 dark:bg-slate-800 overflow-hidden p-3 flex items-center justify-center relative">
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute bottom-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        Only {product.stock} left!
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {/* Seller store link & category */}
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {product.sellerBusinessName || product.category}
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5 group-hover:text-[#2874f0] transition-colors">
                        {product.title}
                      </h3>

                      {/* Ratings Badge (Only show real ratings when reviews exist) */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {product.ratingsCount > 0 ? (
                          <>
                            <span className="inline-flex items-center gap-0.5 bg-[#388e3c] text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                              {product.averageRating.toFixed(1)}
                              <Star className="w-2.5 h-2.5 fill-white" />
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({product.ratingsCount})
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                            New Listing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and Discount */}
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                          ₹{product.sellingPrice.toLocaleString('en-IN')}
                        </span>
                        {product.mrp > product.sellingPrice && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            ₹{product.mrp.toLocaleString('en-IN')}
                          </span>
                        )}
                        {discountPct > 0 && (
                          <span className="text-xs font-bold text-[#388e3c]">
                            {discountPct}% off
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-[#388e3c] font-semibold mt-0.5">
                        Free delivery
                      </div>

                      {/* Add to Cart quick button */}
                      <button
                        onClick={(e) => onAddToCart(product, e)}
                        className="mt-2 w-full py-1.5 px-2 bg-amber-400 hover:bg-amber-300 text-blue-950 rounded text-xs font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{t.addToCart}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean Initial Empty Marketplace State (as explicitly instructed!) */
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2874f0] flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBasket className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t.noProductsFound}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {t.noProductsSub}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onSwitchToSeller}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#2874f0] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shirt className="w-4 h-4" />
                <span>{t.becomeSeller}</span>
              </button>

              <button
                onClick={onSwitchToOwner}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Owner Portal (Test Catalog / Approve)</span>
              </button>
            </div>

            <div className="pt-4 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
              💡 Platform is fully live! Sellers can list real items with sizes, colors, and stock. Owner earns 2.5% automatic commission.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
