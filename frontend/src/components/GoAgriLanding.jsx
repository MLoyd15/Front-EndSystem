import React, { useState, useEffect } from 'react';
import { Star, User, Menu, X, Loader, ChevronLeft, ChevronRight, Download, Gift, Copy, Check, Tag, Clock, Percent } from 'lucide-react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;

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

// Safely derive a reviewer display name
const getReviewerName = (rev) => {
  const u = rev.user || rev.userId || rev.reviewer || {};
  if (typeof u === "string") return "Anonymous";
  return u.name || u.fullName || u.username || u.displayName || u.email || "Anonymous";
};

// Helper: first image URL
const firstImage = (p) => {
  const x = p?.images?.[0];
  return typeof x === "string" ? x : x?.url || null;
};

const GoAgriLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Promo states
  const [promos, setPromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  
  // Pagination states
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const productsPerPage = 9;
  const reviewsPerPage = 6;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setPromosLoading(true);
      
      // Fetch products using the same endpoint as ProductsPage
      const productsRes = await fetch(`${API}/products?catalog=true&limit=50`);
      const productsJson = await productsRes.json();
      
      const productsData = productsJson.items || productsJson.products || [];
      
      setProducts(productsData);
      
      // Fetch all products with reviews
      const allProductsRes = await fetch(`${API}/products/flat`);
      const allProductsJson = await allProductsRes.json();
      const allProductsData = Array.isArray(allProductsJson) ? allProductsJson : [];
      
      // Map products with their reviews
      const mappedProducts = allProductsData.map((p) => ({
        ...p,
        images: p.images || [],
        price: p.price ?? 0,
        categoryLabel:
          (typeof p.category === "string" ? p.category : p.category?.categoryName) || "—",
        reviews: Array.isArray(p.reviews) ? p.reviews : [],
      }));
      
      setAllProducts(mappedProducts);
      
      // Extract all reviews from products
      const allReviews = mappedProducts.flatMap((p) => 
        (p.reviews || []).map(review => ({
          ...review,
          productName: p.name
        }))
      );
      
      setReviews(allReviews);
      
      // Fetch active promos
      try {
        const promosRes = await fetch(`${API}/promo/active`);
        const promosJson = await promosRes.json();
        if (promosJson.success) {
          setPromos(promosJson.promos || []);
        }
      } catch (promoErr) {
        console.error('Error fetching promos:', promoErr);
        setPromos([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
      setPromosLoading(false);
    }
  };

  const getProductImage = (product) => {
    return firstImage(product) || 
           'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop';
  };

  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString("en-PH")}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric", 
      month: "short", 
      day: "numeric"
    });
  };

  const handleLogoClick = () => {
    window.location.href = '/Superlogin';
  };

  // Copy promo code functionality
  const copyPromoCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Format promo value for display
  const formatPromoValue = (promo) => {
    if (promo.type === 'Percentage') {
      return `${promo.value}% OFF`;
    } else if (promo.type === 'Fixed Amount') {
      return `₱${promo.value} OFF`;
    } else if (promo.type === 'Free Shipping') {
      return 'FREE SHIPPING';
    }
    return 'DISCOUNT';
  };

  // Format promo description
  const getPromoDescription = (promo) => {
    let desc = `Get ${formatPromoValue(promo)}`;
    if (promo.minSpend > 0) {
      desc += ` on orders over ₱${promo.minSpend}`;
    }
    if (promo.type === 'Percentage' && promo.maxDiscount > 0) {
      desc += ` (max ₱${promo.maxDiscount})`;
    }
    return desc;
  };

  // Format expiry date
  const formatExpiryDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Pagination logic for products
  const indexOfLastProduct = currentProductPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalProductPages = Math.ceil(products.length / productsPerPage);

  // Pagination logic for reviews
  const indexOfLastReview = currentReviewPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalReviewPages = Math.ceil(reviews.length / reviewsPerPage);

  const paginateProducts = (pageNumber) => {
    setCurrentProductPage(pageNumber);
    document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' });
  };

  const paginateReviews = (pageNumber) => {
    setCurrentReviewPage(pageNumber);
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-2 mt-8">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          <ChevronLeft size={20} />
        </button>
        
        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          // Show first page, last page, current page, and pages around current
          if (
            pageNum === 1 ||
            pageNum === totalPages ||
            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
          ) {
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === pageNum
                    ? 'bg-green-600 text-white'
                    : 'border hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
            return <span key={pageNum} className="px-2">...</span>;
          }
          return null;
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
              title="Click to access staff login"
            >
              <img 
                src="https://res.cloudinary.com/dx9cjcodr/image/upload/v1759537836/logoAgriTrading_l1hp4e.png" 
                alt="GO AGRI TRADING"
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GO AGRI TRADING</h1>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#marketplace" className="text-gray-700 hover:text-green-600 font-medium transition">Marketplace</a>
              <a href="#reviews" className="text-gray-700 hover:text-green-600 font-medium transition">Reviews</a>
              
              <a 
                href="#" 
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download App</span>
              </a>
              
              <a 
                href="/login" 
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <User className="w-4 h-4" />
                <span>Staff Login</span>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <a href="#marketplace" className="block text-gray-700 hover:text-green-600 font-medium">Marketplace</a>
              <a href="#reviews" className="block text-gray-700 hover:text-green-600 font-medium">Reviews</a>
              <a href="#" className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium">
                <Download className="w-4 h-4" />
                <span>Download App</span>
              </a>
              <a href="/login" className="block text-blue-600 hover:text-blue-700 font-medium">Staff Login</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-yellow-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              Your Trusted Agricultural Partner
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Quality agricultural products and equipment for every Filipino farmer
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a 
                href="#" 
                className="inline-flex items-center space-x-2 bg-white text-green-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition shadow-lg border-2 border-green-600"
              >
                <Download className="w-5 h-5" />
                <span>Get Mobile App</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Section */}
      <section className="py-16 bg-gradient-to-r from-orange-50 via-red-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4">
              <Gift className="w-4 h-4" />
              <span>SPECIAL OFFERS</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Exclusive Deals & Discounts
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Save more on your agricultural needs with our limited-time promotional offers
            </p>
          </div>

          {promosLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : promos.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active promotions at the moment.</p>
                <p className="text-sm text-gray-500 mt-2">Check back soon for exciting deals!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promos.map((promo, index) => (
                <div 
                  key={promo._id} 
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                    index === 0 ? 'lg:col-span-2 lg:row-span-1' : ''
                  }`}
                >
                  {/* Promo Header */}
                  <div className={`bg-gradient-to-r ${
                    promo.type === 'Percentage' ? 'from-green-500 to-emerald-500' :
                    promo.type === 'Fixed Amount' ? 'from-blue-500 to-indigo-500' :
                    'from-purple-500 to-pink-500'
                  } p-6 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {promo.type === 'Percentage' ? (
                          <Percent className="w-6 h-6" />
                        ) : promo.type === 'Fixed Amount' ? (
                          <Tag className="w-6 h-6" />
                        ) : (
                          <Gift className="w-6 h-6" />
                        )}
                        <span className="text-sm font-medium opacity-90">{promo.type}</span>
                      </div>
                      {promo.endsAt && (
                        <div className="flex items-center space-x-1 text-sm opacity-90">
                          <Clock className="w-4 h-4" />
                          <span>Until {formatExpiryDate(promo.endsAt)}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mt-2">{promo.name}</h3>
                    <div className="text-3xl font-black mt-1">
                      {formatPromoValue(promo)}
                    </div>
                  </div>

                  {/* Promo Body */}
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">
                      {getPromoDescription(promo)}
                    </p>
                    
                    {/* Usage Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                      <span>
                        {promo.limit > 0 ? (
                          `${promo.used}/${promo.limit} used`
                        ) : (
                          'Unlimited uses'
                        )}
                      </span>
                      {promo.limit > 0 && (
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((promo.used / promo.limit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Promo Code */}
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">PROMO CODE</p>
                          <p className="text-lg font-bold text-gray-900 font-mono tracking-wider">
                            {promo.code}
                          </p>
                        </div>
                        <button
                          onClick={() => copyPromoCode(promo.code)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            copiedCode === promo.code
                              ? 'bg-green-500 text-white'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                        >
                          {copiedCode === promo.code ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-white bg-opacity-20 rounded-full"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 bg-white bg-opacity-10 rounded-full"></div>
                </div>
              ))}
            </div>
          )}


        </div>
      </section>

      {/* Marketplace Section */}
      <section id="marketplace" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Marketplace</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-12 h-12 text-green-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={fetchData}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-600">No products available at the moment.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentProducts.map((product) => (
                  <div key={product._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                    <img 
                      src={getProductImage(product)} 
                      alt={product.name}
                      className="w-full h-56 object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop';
                      }}
                    />
                    <div className="p-6">
                      {product.category && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          {typeof product.category === 'string' 
                            ? product.category 
                            : product.category?.categoryName || 'General'}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mt-3 mb-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(product.price)}
                        </span>
                        {product.reviews && product.reviews.length > 0 && (
                          <StarRating 
                            rating={Math.round(
                              product.reviews.reduce((s, r) => s + (r.rating || 0), 0) / product.reviews.length
                            )} 
                            size="sm"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Stock: {product.stock ?? 0} available
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Pagination 
                currentPage={currentProductPage}
                totalPages={totalProductPages}
                onPageChange={paginateProducts}
              />
            </>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Customer Reviews</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-12 h-12 text-green-600 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-600">No reviews yet. Be the first to leave a review!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentReviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        {getReviewerName(review).substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {getReviewerName(review)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {review.createdAt ? formatDate(review.createdAt) : ''}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating || 5} size="sm" />
                    {review.productName && (
                      <p className="text-xs text-green-600 font-medium mt-2">
                        Product: {review.productName}
                      </p>
                    )}
                    <p className="text-gray-700 mt-3">
                      {review.comment || review.reviewText || review.feedback || 'Great product!'}
                    </p>
                  </div>
                ))}
              </div>
              
              <Pagination 
                currentPage={currentReviewPage}
                totalPages={totalReviewPages}
                onPageChange={paginateReviews}
              />
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="https://res.cloudinary.com/dx9cjcodr/image/upload/v1759537836/logoAgriTrading_l1hp4e.png" 
              alt="GO AGRI TRADING"
              className="h-16 w-auto mx-auto mb-4 brightness-0 invert"
            />
            <h3 className="text-2xl font-bold mb-2">GO AGRI TRADING</h3>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Go Agri Trading. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GoAgriLanding;