import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Search, Eye, Package, MessageSquare,
  ArrowLeft, Filter, Calendar, User, X, DollarSign
} from "lucide-react";
import { VITE_API_BASE } from "../config"


/* ----------------------------- API ----------------------------- */
const API = VITE_API_BASE;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token")}` });

/* ---------------------------- COLORS -------------------------- */
const COLORS = {
  green: '#22c55e', // Green-500
  greenDark: '#16a34a', // Green-600
  greenLight: '#dcfce7', // Green-100
  brown: '#92400e', // Brown-800
  brownMid: '#a16207', // Amber-700
  brownLight: '#d97706', // Amber-600
  white: '#ffffff',
  gray: '#64748b',
  grayLight: '#f1f5f9',
};

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
          className={`${sizeClasses[size]} ${star <= rating ? "fill-amber-600 text-amber-600" : "text-gray-300"}`}
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
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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

  // Get price range for suggestions
  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map(p => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
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

      // Price range filter
      const matchesPrice = 
        (!priceMin || product.price >= Number(priceMin)) &&
        (!priceMax || product.price <= Number(priceMax));

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

      return matchesSearch && matchesRating && matchesProduct && matchesCategory && matchesPrice && matchesDate;
    });
  }, [products, searchQuery, filterRating, filterProduct, filterCategory, priceMin, priceMax, dateFrom, dateTo]);

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
    setPriceMin("");
    setPriceMax("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || filterRating || filterProduct || filterCategory || priceMin || priceMax || dateFrom || dateTo;

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-green-600 mb-3">
            Product Reviews Management
          </h1>
          <p className="text-gray-600 text-lg">Manage customer reviews across all your products</p>
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
            bgColor="bg-green-500"
            icon={<Package className="w-6 h-6" />}
          />
          <StatCard
            label="Total Reviews"
            value={stats.total}
            bgColor="bg-green-600"
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            bgColor="bg-amber-700"
            icon={<Star className="w-6 h-6" />}
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <div className="space-y-4">
            {/* Search and Rating */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-80">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-green-600" />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-40"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              {/* Product Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <Package className="w-4 h-4 inline mr-1" />
                  Filter by Product
                </label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Price Min */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Min Price
                </label>
                <input
                  type="number"
                  placeholder={`₱${priceRange.min}`}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Price Max */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-green-600">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Max Price
                </label>
                <input
                  type="number"
                  placeholder={`₱${priceRange.max}`}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Filter Info & Clear Button */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-gray-600">
                {priceRange.min > 0 && (
                  <span className="text-green-600 font-medium">
                    Price Range: {peso(priceRange.min)} - {peso(priceRange.max)}
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center"
          >
            <Package className="w-20 h-20 mx-auto mb-4 text-gray-300" />
            <p className="text-xl text-gray-600">No products found matching your filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
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

const StatCard = ({ label, value, bgColor, icon }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-4 rounded-xl text-white ${bgColor}`}>
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
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:border-green-300 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="aspect-video overflow-hidden bg-gray-50">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-gray-600">{product.categoryLabel}</p>
          </div>
          <p className="text-lg font-bold text-amber-700">{peso(product.price)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm font-medium text-gray-700">{avgRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg mb-6 transition-all shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Products
        </motion.button>

        {/* Product Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-200">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600 mb-3">
                {product.categoryLabel} • <span className="text-amber-700 font-bold">{peso(product.price)}</span>
              </p>
              <div className="flex items-center gap-4">
                <StarRating rating={Math.round(avgRating)} size="md" />
                <span className="text-lg font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500">({product.reviews.length} reviews)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-40"
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
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No reviews found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
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
      className="p-6 hover:bg-gray-50 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
            {reviewerName.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{reviewerName}</p>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onViewDetails(review)}
            className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-700 leading-relaxed">
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
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Review Details</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                {reviewerName.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-gray-900">{reviewerName}</h4>
                <div className="flex items-center gap-3 mt-2">
                  <StarRating rating={review.rating} size="lg" />
                  <span className="text-gray-600">{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
              <p className="text-gray-700 leading-relaxed text-lg">
                {review.comment || "No comment provided"}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
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