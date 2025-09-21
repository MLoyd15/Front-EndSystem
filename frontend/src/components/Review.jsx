import React from "react";
import Promo from "../components/promo";  // ✅ Capitalized import

const Review = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Product Review & Discounts
      </h1>

      {/* You can later add product reviews here */}
      <div className="mb-10">
        <p className="text-gray-600">
          ⭐ Product review feature will be added here.
        </p>
      </div>

      {/* Discounts & Promotions UI */}
      <Promo />   {/* ✅ Capitalized usage */}
    </div>
  );
};

export default Review;