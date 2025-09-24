import React from "react";
import Promo from "../components/promo";  // ✅ Capitalized import

const Review = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Optional heading */}
      <h1 className="px-5 pt-7 text-2xl font-bold text-gray-800">
        Product Review & Discounts
      </h1>

      {/* Placeholder for product review */}
      <div className="px-5 mb-8">
        <p className="text-gray-600">
          ⭐ Product review feature will be added here.
        </p>
      </div>

      {/* Full-width Discounts & Promotions */}
      <Promo />
    </div>
  );
};

export default Review;