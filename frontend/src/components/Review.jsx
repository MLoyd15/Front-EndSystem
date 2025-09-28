import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Search, Eye, Trash2, Package, MessageSquare,
  ArrowLeft, Filter, Calendar, User
} from "lucide-react";

/* ----------------------------- API ----------------------------- */
const API = "http://localhost:5000/api";
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
          className={`${sizeClasses[size]} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
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

  // Filter products by name/category and by rounded avg rating
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.categoryLabel?.toLowerCase().includes(searchQuery.toLowerCase());

      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
          : 0;

      const matchesRating =
        !filterRating || Math.round(avgRating) === parseInt(filterRating, 10);

      return matchesSearch && matchesRating;
    });
  }, [products, searchQuery, filterRating]);

  // Page stats
  const stats = useMemo(() => {
    const all = products.flatMap((p) => p.reviews || []);
    const total = all.length;
    const avgRating = total > 0 ? all.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
    return { totalProducts: products.length, total, avgRating };
  }, [products]);

  // Delete a review (API)
const deleteReview = async (reviewId, productId) => {
  if (!window.confirm("Are you sure you want to delete this review?")) return;

  // 🔹 Optimistic UI: update immediately
  setProducts(prev =>
    prev.map(p =>
      p._id === productId
        ? { ...p, reviews: p.reviews.filter(r => r._id !== reviewId) }
        : p
    )
  );
  setSelectedProduct(prev =>
    prev?._id === productId
      ? { ...prev, reviews: prev.reviews.filter(r => r._id !== reviewId) }
      : prev
  );
  if (selectedReview?._id === reviewId) setSelectedReview(null);

  try {
    await axios.delete(`${API}/products/${productId}/reviews/${reviewId}`, { headers: auth() });
    window.alert("Review deleted successfully.");
  } catch (e) {
    // 🔙 Rollback if API fails (optional)
    console.error("Failed to delete review:", e);
    window.alert("Failed to delete review. Please try again.");
    // You can reload data here if you want a full rollback:
    // loadData();
  }
};
  // If a product is selected, render the per-product review view
  if (selectedProduct) {
    return (
      <ProductReviewsView
        product={selectedProduct}
        onBack={() => {
          setSelectedProduct(null);
          setSelectedReview(null);
        }}
        onDeleteReview={deleteReview}
        onViewReview={setSelectedReview}
        selectedReview={selectedReview}
        onCloseReview={() => setSelectedReview(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent mb-3">
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
            color="from-blue-500 to-blue-600"
            icon={<Package className="w-6 h-6" />}
          />
          <StatCard
            label="Total Reviews"
            value={stats.total}
            color="from-purple-500 to-purple-600"
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            color="from-amber-500 to-amber-600"
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm min-w-40"
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
        </motion.div>

        {/* Products grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 text-lg">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                  delay={index * 0.1}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Cards & Views --------------------------- */

const StatCard = ({ label, value, color, icon }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg ring-1 ring-slate-200/50 hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`w-14 h-14 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const ProductCard = ({ product, onClick, delay = 0 }) => {
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
      : 0;

  const reviewCount = product.reviews.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }} whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-slate-200/50 overflow-hidden cursor-pointer hover:shadow-2xl hover:ring-blue-200 transition-all duration-300 group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-400" />
          </div>
        )}

        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-sm font-medium">
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </div>
      </div>

      {/* Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-slate-500 mb-2">{product.categoryLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900">{peso(product.price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm font-medium text-slate-600">
              {avgRating > 0 ? avgRating.toFixed(1) : "No ratings"}
            </span>
          </div>
          <p className="text-xs text-slate-500">Click to view reviews</p>
        </div>
      </div>
    </motion.div>
  );
};

function ProductReviewsView({
  product, onBack, onDeleteReview, onViewReview, selectedReview, onCloseReview,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("");

  const filteredReviews = useMemo(() => {
    return (product.reviews || []).filter((review) => {
      const matchesSearch =
        !searchQuery ||
        (review.comment || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        getReviewerName(review).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating = !filterRating || review.rating === parseInt(filterRating, 10);

      return matchesSearch && matchesRating;
    });
  }, [product.reviews, searchQuery, filterRating]);

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Products
          </button>

          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-slate-200 overflow-hidden flex-shrink-0">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              <p className="text-slate-600 mb-3">
                {product.categoryLabel} • {peso(product.price)}
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
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
                />
              </div>
            </div>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm min-w-40"
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
                    onDelete={onDeleteReview}
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
              onDelete={(reviewId) => {
                onDeleteReview(reviewId, product._id);
                onCloseReview();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ReviewCard = ({ review, productId, onDelete, onViewDetails, delay = 0 }) => {
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
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
            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(review._id, productId)}
            className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            title="Delete Review"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-slate-700 leading-relaxed">
        {review.comment || "No comment provided"}
      </p>
    </motion.div>
  );
};

const ReviewDetailsModal = ({ review, productName, productImage, onClose, onDelete }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Review Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">✕</button>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
          <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden">
            {productImage ? (
              <img src={productImage} alt={productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{productName}</h3>
            <StarRating rating={review.rating} size="md" showNumber />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <User className="w-4 h-4" /> Reviewer
              </label>
              <p className="text-slate-900 font-medium">{getReviewerName(review)}</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <Calendar className="w-4 h-4" /> Date
              </label>
              <p className="text-slate-900">{formatDate(review.createdAt)}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">Comment</label>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-slate-900 leading-relaxed">{review.comment || "No comment provided"}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => onDelete(review._id)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
            >
              <Trash2 className="w-4 h-4" />
              Delete Review
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

