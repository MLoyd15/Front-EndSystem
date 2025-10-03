import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { FaSignOutAlt, FaExclamationTriangle } from "react-icons/fa";

export default function Logout() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show modal when component mounts
    setShowModal(true);
  }, []);

  const handleConfirmLogout = () => {
    // Clear client-side session
    localStorage.removeItem("pos-user");
    localStorage.removeItem("pos-token");
    sessionStorage.clear();

    // Redirect to login
    navigate("/login", { replace: true });
  };

  const handleCancel = () => {
    setShowModal(false);
    // Navigate back to previous page
    navigate(-1);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <FaExclamationTriangle className="h-6 w-6 text-red-600" />
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirm Logout
          </h3>
          
          {/* Message */}
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to log out? You will be redirected to the login page and will need to sign in again.
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLogout}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center justify-center gap-2"
            >
              <FaSignOutAlt className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
