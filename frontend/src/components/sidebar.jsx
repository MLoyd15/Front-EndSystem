import React, { useEffect, useState } from "react";
import {
  FaHome,
  FaSignOutAlt,
  FaTable,
  FaBox,
  FaTruck,
  FaUsers,
  FaStar,
  FaUser,
  FaTools,
  FaComments,
  FaBars,
  FaTimes,
  FaGift
} from "react-icons/fa";
import { NavLink } from "react-router";
import { MdDiscount, MdHistory} from "react-icons/md";

const Sidebar = () => {
  const menuItems = [
    { name: "Maintenance", path: "/admin-dashboard/maintenance", icon: <FaTools />, isParent: false, superAdminOnly: true },
    { name: "Dashboard", path: "/admin-dashboard", icon: <FaHome />, isParent: true, superAdminOnly: true },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable />, isParent: false },
    { name: "Products", path: "/admin-dashboard/products", icon: <FaBox />, isParent: false },
    { name: "Delivery", path: "/admin-dashboard/delivery", icon: <FaTruck />, isParent: false },
    { name: "Product review", path: "/admin-dashboard/review", icon: <FaStar />, isParent: false },
    { name: "Product Promo", path: "/admin-dashboard/promo", icon: <MdDiscount />, isParent: false, superAdminOnly: true },
    { name: "Activity Log", path: "/admin-dashboard/activity-log", icon: <FaGift />, isParent: false },
    { name: "Sales History", path: "/admin-dashboard/Sales", icon: <MdHistory />, isParent: false, superAdminOnly: true },
    { name: "Support Chat", path: "/admin-dashboard/support-chat", icon: <FaComments />, isParent: false },
    { name: "Create Driver", path: "/admin-dashboard/create-driver", icon: <FaTruck />, isParent: false, superAdminOnly: true },
    { name: "Logout", path: "/admin-dashboard/logout", icon: <FaSignOutAlt />, isParent: false },
  ];

  const driverItems = [
    { name: "Dashboard", path: "/driver-dashboard", icon: <FaHome />, isParent: true },
    { name: "Deliveries", path: "/driver-dashboard/delivery", icon: <FaTruck />, isParent: false },
    { name: "Logout", path: "/driver-dashboard/logout", icon: <FaSignOutAlt />, isParent: false },
  ];

  const [items, setItems] = useState(menuItems);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("pos-user") || "{}");
    if (user?.role === "driver") {
      setItems(driverItems);
    } else {
      let filteredItems = menuItems;
      if (user?.role !== "superadmin") {
        filteredItems = menuItems.filter(item => !item.superAdminOnly);
      }
      setItems(filteredItems);
    }
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-black text-white rounded-xl shadow-lg hover:bg-gray-800 transition-colors duration-200 border border-gray-600"
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {isMobileMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        flex flex-col h-screen bg-black text-white fixed z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-16 lg:w-64 w-72
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          <div className="flex items-center">
            <span className="hidden lg:block text-lg xl:text-xl font-bold text-center">GO AGRI TRADING</span>
            <span className="lg:hidden text-lg font-bold">IMS</span>
          </div>
          {/* Mobile close button in header */}
          <button
            onClick={closeMobileMenu}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close menu"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-1 p-2">
            {items.map((item) => (
              <li key={item.name}>
                <NavLink
                  end={item.isParent}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center p-4 md:p-3 rounded-lg transition-all duration-200 group touch-manipulation ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "bg-transparent text-white hover:bg-gray-800 active:bg-gray-700"
                    }`
                  }
                  to={item.path}
                >
                  <span className="text-xl md:text-lg flex-shrink-0">{item.icon}</span>
                  <span className="ml-4 md:ml-3 hidden lg:block md:hidden text-base md:text-sm font-medium truncate">
                    {item.name}
                  </span>
                  {/* Mobile - always show text */}
                  <span className="ml-4 md:hidden text-base font-medium">
                    {item.name}
                  </span>
                  
                  {/* Tooltip for medium screens */}
                  <div className="absolute left-16 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap hidden md:block lg:hidden">
                    {item.name}
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer - User info or branding */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            <span className="hidden lg:block">© 2024 Go Agri Trading</span>
            <span className="lg:hidden">© 2024</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;