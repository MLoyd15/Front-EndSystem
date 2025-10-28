import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Search, Eye, Package, MessageSquare,
  ArrowLeft, Filter, Calendar, User, X
} from "lucide-react";
import { VITE_API_BASE } from "../config"


/* ----------------------------- API ----------------------------- */
const API = VITE_API_BASE;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token")}` });

/* ---------------------------- HELPERS -------------------------- */
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

const StarRating = ({ rating = 0, size = "sm", showNumber = false }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${star <= rating ? "fill-[#E2AD3A] text-[#E2AD3A]" : "text-gray-300"}`}
        />
      ))}
      {showNumber && <span className="ml-1 text-sm font-medium text-slate-600">({rating})</span>}
    </div>
  );
};

// Safely derive a reviewer display name (works with populated user or raw id)
const getReviewerName = (rev) => {
  const u = rev.user || rev.userId || rev.reviewer || {};
  if (typeof u === "string") return "Anonymous";
  return u.name || u.fullName || u.username || u.displayName || u.email || "Anonymous";
};

/* ===================================================================== */

export default function ProductReviewManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        // Expect backend to populate: .populate("reviews.userId", "name email")
        const { data } = await axios.get(`${API}/products/flat`, { headers: auth() });
        if (!live) return;

        // Normalize a few fields for the UI
        const mapped = (Array.isArray(data) ? data : []).map((p) => ({
          ...p,
          images: p.images || [],
          price: p.price ?? 0,
          categoryLabel:
            (typeof p.category === "string" ? p.category : p.category?.categoryName) || "—",
          reviews: Array.isArray(p.reviews) ? p.reviews : [],
        }));
        setProducts(mapped);
      } catch (e) {
        console.error("Failed to load products:", e);
        setProducts([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.categoryLabel))].filter(Boolean);
    return cats.sort();
  }, [products]);

  // Filter products by name/category and by rounded avg rating
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.categoryLabel?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProduct = !filterProduct || product._id === filterProduct;
      const matchesCategory = !filterCategory || product.categoryLabel === filterCategory;

      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
          : 0;

      const matchesRating =
        !filterRating || Math.round(avgRating) === parseInt(filterRating, 10);

      // Date filter
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const hasReviewsInRange = product.reviews.some((review) => {
          const reviewDate = new Date(review.createdAt);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && reviewDate < fromDate) return false;
          if (toDate && reviewDate > toDate) return false;
          return true;
        });
        matchesDate = hasReviewsInRange;
      }

      return matchesSearch && matchesRating && matchesProduct && matchesCategory && matchesDate;
    });
  }, [products, searchQuery, filterRating, filterProduct, filterCategory, dateFrom, dateTo]);

  // Page stats
  const stats = useMemo(() => {
    const all = filteredProducts.flatMap((p) => p.reviews || []);
    const total = all.length;
    const avgRating = total > 0 ? all.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
    return { totalProducts: filteredProducts.length, total, avgRating };
  }, [filteredProducts]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRating("");
    setFilterProduct("");
    setFilterCategory("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || filterRating || filterProduct || filterCategory || dateFrom || dateTo;

  // If a product is selected, render the per-product review view
  if (selectedProduct) {
    return (
      <ProductReviewsView
        product={selectedProduct}
        onBack={() => {
          setSelectedProduct(null);
          setSelectedReview(null);
        }}
        onViewReview={setSelectedReview}
        selectedReview={selectedReview}
        onCloseReview={() => setSelectedReview(null)}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #ecfccb, #fef3c7)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-3" style={{
            background: 'linear-gradient(to right, #52943A, #7B6045)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Product Reviews Management
          </h1>
          <p className="text-slate-600 text-lg">Manage customer reviews across all your products</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <StatCard
            label="Total Products"
            value={stats.totalProducts}
            gradient="linear-gradient(to right, #52943A, #7B6045)"
            icon={<Package className="w-6 h-6" />}
          />
          <StatCard
            label="Total Reviews"
            value={stats.total}
            gradient="linear-gradient(to right, #7B6045, #52943A)"
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            gradient="linear-gradient(to right, #E2AD3A, #d97706)"
            icon={<Star className="w-6 h-6" />}
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-6 mb-8"
        >
          <div className="space-y-4">
            {/* Search and Rating */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-80">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
                    style={{ focusRing: '#52943A' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" style={{ color: '#52943A' }} />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 bg-white/80 backdrop-blur-sm min-w-40"
                  style={{ focusRing: '#52943A' }}
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              {/* Product Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#52943A' }}>
                  <Package className="w-4 h-4 inline mr-1" />
                  Filter by Product
                </label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 bg-white/80"
                  style={{ focusRing: '#52943A' }}
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7B6045' }}>
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 bg-white/80"
                  style={{ focusRing: '#7B6045' }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#E2AD3A' }}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 bg-white/80"
                  style={{ focusRing: '#E2AD3A' }}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#E2AD3A' }}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 bg-white/80"
                  style={{ focusRing: '#E2AD3A' }}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, #7B6045, #52943A)' }}
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: '#52943A' }}></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-12 text-center"
          >
            <Package className="w-20 h-20 mx-auto mb-4 text-slate-300" />
            <p className="text-xl text-slate-600">No products found matching your filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2 text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(to right, #52943A, #7B6045)' }}
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                onClick={() => setSelectedProduct(product)}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ label, value, gradient, icon }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-6 hover:shadow-xl transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="p-4 rounded-xl text-white" style={{ background: gradient }}>
        {icon}
      </div>
    </div>
  </div>
);

const ProductCard = ({ product, onClick, delay }) => {
  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="aspect-video overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #ecfccb)' }}>
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-300" />
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#52943A] transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-slate-600">{product.categoryLabel}</p>
          </div>
          <p className="text-lg font-bold" style={{ color: '#E2AD3A' }}>{peso(product.price)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm font-medium text-slate-700">{avgRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">{product.reviews.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ===================================================================== */
/*                    PRODUCT REVIEWS VIEW                                */
/* ===================================================================== */

function ProductReviewsView({ product, onBack, onViewReview, selectedReview, onCloseReview }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("");

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
    : 0;

  const filteredReviews = useMemo(() => {
    return product.reviews.filter((review) => {
      const matchesSearch =
        !searchQuery ||
        review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getReviewerName(review).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating = !filterRating || review.rating === parseInt(filterRating, 10);

      return matchesSearch && matchesRating;
    });
  }, [product.reviews, searchQuery, filterRating]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #ecfccb, #fef3c7)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-xl mb-6 transition-all shadow-md hover:shadow-lg"
          style={{ background: 'linear-gradient(to right, #52943A, #7B6045)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Products
        </motion.button>

        {/* Product Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-6 mb-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #ecfccb)' }}>
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-300" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              <p className="text-slate-600 mb-3">
                {product.categoryLabel} • <span style={{ color: '#E2AD3A' }}>{peso(product.price)}</span>
              </p>
              <div className="flex items-center gap-4">
                <StarRating rating={Math.round(avgRating)} size="md" />
                <span className="text-lg font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
                <span className="text-slate-500">({product.reviews.length} reviews)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-6 mb-8"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
                />
              </div>
            </div>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 bg-white/80 backdrop-blur-sm min-w-40"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </motion.div>

        {/* Reviews List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 overflow-hidden"
        >
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg">No reviews found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50">
              <AnimatePresence>
                {filteredReviews.map((review, index) => (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    productId={product._id}
                    onViewDetails={() => onViewReview(review)}
                    delay={index * 0.05}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Review Details Modal */}
        <AnimatePresence>
          {selectedReview && (
            <ReviewDetailsModal
              review={selectedReview}
              productName={product.name}
              productImage={product.images?.[0]}
              onClose={onCloseReview}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ReviewCard = ({ review, productId, onViewDetails, delay = 0 }) => {
  const reviewerName = getReviewerName(review);

  return (
   <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, margin: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 hover:bg-slate-50/50 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
            background: 'linear-gradient(to bottom right, #52943A, #7B6045)'
          }}>
            {reviewerName.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{reviewerName}</p>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-slate-500">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onViewDetails(review)}
            className="p-2 rounded-lg transition-colors text-white"
            style={{ background: 'linear-gradient(to right, #52943A, #7B6045)' }}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-slate-700 leading-relaxed">
        {review.comment || "No comment provided"}
      </p>
    </motion.div>
  );
};

const ReviewDetailsModal = ({ review, productName, productImage, onClose }) => {
  const reviewerName = getReviewerName(review);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Review Details</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{
                background: 'linear-gradient(to bottom right, #52943A, #7B6045)'
              }}>
                {reviewerName.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-slate-900">{reviewerName}</h4>
                <div className="flex items-center gap-3 mt-2">
                  <StarRating rating={review.rating} size="lg" />
                  <span className="text-slate-600">{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #ecfccb)' }}>
              <p className="text-slate-700 leading-relaxed text-lg">
                {review.comment || "No comment provided"}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="flex-1 text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(to right, #52943A, #7B6045)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};