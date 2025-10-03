import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, User, Menu, X, Phone, Mail, MapPin, Loader } from 'lucide-react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;

// Helper function for star rating
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
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch products using the same endpoint as ProductsPage
      const productsRes = await axios.get(`${API}/products`, {
        params: {
          catalog: 'true', // Only get catalog products for landing page
          limit: 50 // Get more products for display
        }
      });
      
      const productsData = productsRes.data.items || productsRes.data.products || [];
      
      setProducts(productsData);
      
      // Fetch all products with reviews (using flat endpoint like Review component)
      const allProductsRes = await axios.get(`${API}/products/flat`);
      const allProductsData = Array.isArray(allProductsRes.data) ? allProductsRes.data : [];
      
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
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
    alert(`${product.name} added to cart!`);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">GO</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GO AGRI TRADING</h1>
                <p className="text-xs text-green-600 font-medium">Jesus Saves - John 3:16</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#marketplace" className="text-gray-700 hover:text-green-600 font-medium transition">Marketplace</a>
              <a href="#reviews" className="text-gray-700 hover:text-green-600 font-medium transition">Reviews</a>
              
              <a 
                href="/login" 
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <User className="w-4 h-4" />
                <span>Admin Login</span>
              </a>
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
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
              <a href="#contact" className="block text-gray-700 hover:text-green-600 font-medium">Contact</a>
              <a href="/login" className="block text-blue-600 hover:text-blue-700 font-medium">Admin Login</a>
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
            <a 
              href="#marketplace" 
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition shadow-lg"
            >
              Shop Now
            </a>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.slice(0, 6).map((review) => (
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
          )}
        </div>
      </section>

     
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">GO AGRI TRADING</h3>
            <p className="text-gray-400 mb-4">Jesus Saves - John 3:16</p>
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