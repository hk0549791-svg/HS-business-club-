/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Product, Review } from '../../types/marketplace';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  Zap,
  Heart,
  Store,
  MapPin,
  CheckCircle,
  MessageSquare,
  Image as ImageIcon,
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  onBuyNow: (product: Product, size?: string, color?: string) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  reviews: Review[];
  onAddReview: (review: { rating: number; title: string; comment: string; imageUrl?: string }) => void;
  language: Language;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  reviews,
  onAddReview,
  language,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product.selectedSizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.selectedColors?.[0] || '');
  const [pincode, setPincode] = useState('110001');
  const [pincodeChecked, setPincodeChecked] = useState(true);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const t = translations[language];

  const discountPercent = product.mrp > product.sellingPrice
    ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
    : 0;

  const images = product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddReview({
      rating: newRating,
      title: newTitle,
      comment: newComment,
      imageUrl: newImageUrl || undefined,
    });
    setNewTitle('');
    setNewComment('');
    setNewImageUrl('');
    setShowReviewForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 my-8 max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-[#2874f0] font-bold uppercase">{product.category}</span>
            <span>/</span>
            <span className="truncate max-w-[200px] sm:max-w-xs">{product.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Gallery Left (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-4 overflow-hidden relative">
                <img
                  src={images[selectedImageIdx] || images[0]}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  onClick={() => onToggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 shadow text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`w-14 h-14 rounded-md border p-1 bg-white dark:bg-slate-800 shrink-0 ${
                        selectedImageIdx === idx ? 'border-[#2874f0] ring-2 ring-blue-400' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <img src={img} alt="thumb" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons (Desktop PDP) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onAddToCart(product, selectedSize, selectedColor)}
                  className="py-3 px-4 rounded-sm bg-[#ff9f00] hover:bg-amber-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t.addToCart}</span>
                </button>

                <button
                  onClick={() => onBuyNow(product, selectedSize, selectedColor)}
                  className="py-3 px-4 rounded-sm bg-[#fb641b] hover:bg-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{t.buyNow}</span>
                </button>
              </div>
            </div>

            {/* Details Right (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {product.title}
                </h1>

                {/* Rating Badge (Authentic Review Count) */}
                <div className="flex items-center gap-2 mt-2">
                  {product.ratingsCount > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1 bg-[#388e3c] text-white text-xs font-bold px-2 py-0.5 rounded">
                        {product.averageRating.toFixed(1)}
                        <Star className="w-3 h-3 fill-white" />
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {product.ratingsCount} Verified {product.ratingsCount === 1 ? 'Rating' : 'Ratings'} & Reviews
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      No customer ratings yet
                    </span>
                  )}
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-bold text-[#2874f0] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                    HS Assured
                  </span>
                </div>
              </div>

              {/* Price Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                    ₹{product.sellingPrice.toLocaleString('en-IN')}
                  </span>
                  {product.mrp > product.sellingPrice && (
                    <span className="text-sm text-slate-400 line-through tabular-nums">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-sm font-bold text-[#388e3c]">
                      {discountPercent}% off
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Inclusive of all taxes • Free Delivery on orders over ₹500
                </div>
              </div>

              {/* Stock status */}
              <div className="text-xs">
                {product.stock > 0 ? (
                  <span className="text-[#388e3c] font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> In Stock ({product.stock} units available)
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">Currently Out of Stock</span>
                )}
              </div>

              {/* Variants: Sizes */}
              {product.selectedSizes && product.selectedSizes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Size:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.selectedSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer ${
                          selectedSize === size
                            ? 'border-[#2874f0] bg-blue-50 dark:bg-blue-950 text-[#2874f0] ring-1 ring-[#2874f0]'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants: Colors */}
              {product.selectedColors && product.selectedColors.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Color:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.selectedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1.5 rounded border text-xs font-semibold transition-all cursor-pointer ${
                          selectedColor === color
                            ? 'border-[#2874f0] bg-blue-50 dark:bg-blue-950 text-[#2874f0] ring-1 ring-[#2874f0]'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Availability Checker */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2874f0]" /> Delivery Options
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-semibold w-32 focus:outline-none focus:ring-1 focus:ring-[#2874f0]"
                  />
                  <button
                    onClick={() => setPincodeChecked(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-[#2874f0] font-bold text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    Check
                  </button>
                </div>
                {pincodeChecked && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    <p className="font-semibold text-emerald-600">✓ Delivery by Tomorrow, 5 PM</p>
                    <p>Standard delivery charge: ₹40 (FREE on this product)</p>
                  </div>
                )}
              </div>

              {/* Seller Information */}
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                    <span>Seller: {product.sellerBusinessName || product.sellerName}</span>
                  </span>
                  <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                    4.8 ★
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  7-Day Return Policy • GST Invoice available with every purchase
                </div>
              </div>

              {/* Product Description */}
              <div className="space-y-1 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Product Details & Description
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {product.description || 'No detailed description provided by the seller.'}
                </p>
                <div className="text-[11px] text-slate-400 pt-1">
                  SKU: <span className="font-mono text-slate-600 dark:text-slate-300">{product.sku}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ratings & Customer Reviews Section */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Customer Ratings & Reviews
                </h3>
                <p className="text-xs text-slate-500">
                  Real feedback from verified buyers across India
                </p>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-3 py-1.5 rounded bg-blue-50 dark:bg-blue-950 text-[#2874f0] font-bold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{showReviewForm ? 'Cancel Review' : 'Rate Product'}</span>
              </button>
            </div>

            {/* Write Review Form */}
            {showReviewForm && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-blue-50/50 dark:bg-slate-800/80 p-4 rounded-lg border border-blue-100 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Review headline (e.g., Fabulous sound quality!)"
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write detailed experience about battery, durability, delivery..."
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Optional review photo URL"
                    className="flex-1 text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#2874f0] text-white font-bold text-xs hover:bg-blue-700 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 bg-[#388e3c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {rev.rating} <Star className="w-2.5 h-2.5 fill-white" />
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {rev.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>

                    {rev.imageUrl && (
                      <div className="w-16 h-16 rounded overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img src={rev.imageUrl} alt="Review attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 font-medium">
                      By {rev.customerName} • <span className="text-emerald-600 font-semibold">✓ Certified Buyer</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                  No customer reviews yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
