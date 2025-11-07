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
import { MdDiscount, MdHistory, MdPendingActions} from "react-icons/md";
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config";
import io from "socket.io-client";

const API = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;

const Sidebar = () => {
  const [items, setItems] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  const menuItems = [
    { name: "Maintenance", path: "/admin-dashboard/maintenance", icon: <FaTools />, isParent: false, superAdminOnly: true },
    { name: "Dashboard", path: "/admin-dashboard", icon: <FaHome />, isParent: true, superAdminOnly: true },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable />, isParent: false },
    { name: "Products", path: "/admin-dashboard/products", icon: <FaBox />, isParent: false, hasStockBadge: true },
    { name: "Delivery", path: "/admin-dashboard/delivery", icon: <FaTruck />, isParent: false },
    { name: "Product review", path: "/admin-dashboard/review", icon: <FaStar />, isParent: false },
    { name: "Product Promo", path: "/admin-dashboard/promo", icon: <MdDiscount />, isParent: false, superAdminOnly: true },
    { name: "Activity Log", path: "/admin-dashboard/activity-log", icon: <FaGift />, isParent: false },
    { name: "Pending Approvals", path: "/admin-dashboard/pending-approvals", icon: <MdPendingActions />, isParent: false, superAdminOnly: true, hasBadge: true },
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

  // ✅ Fetch pending approvals count
  const fetchPendingCount = async () => {
    if (userRole !== 'superadmin') return;

    try {
      const response = await fetch(`${API}/activity-logs/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setPendingCount(result.data?.length || 0); // Using data.length for count
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  // ✅ Fetch stock counts (low stock and out of stock)
  const fetchStockCounts = async () => {
    try {
      const response = await fetch(`${API}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data) {
        const low = Number(data.lowStock ?? 0) || 0;
        const out = Number(data.outOfStock ?? 0) || 0;
        setLowStockCount(low);
        setOutOfStockCount(out);
      }
    } catch (err) {
      console.error('Error fetching stock counts:', err);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("pos-user") || "{}");
    const role = user?.role;
    setUserRole(role);

    if (role === "driver") {
      setItems(driverItems);
    } else {
      let filteredItems = menuItems;
      if (role !== "superadmin") {
        filteredItems = menuItems.filter(item => !item.superAdminOnly);
      }
      setItems(filteredItems);

      // ✅ Fetch pending count if superadmin
      if (role === "superadmin") {
        fetchPendingCount();
        
        // ✅ Poll for updates every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        
        // ✅ Subscribe to activity log socket events for real-time updates
        const socket = io(SOCKET_URL, {
          auth: { token: localStorage.getItem("pos-token") },
        });

        socket.on("connect", () => {
          fetchPendingCount();
        });
        
        socket.on("activityLog:created", fetchPendingCount);
        socket.on("activityLog:approved", fetchPendingCount);
        socket.on("activityLog:rejected", fetchPendingCount);

        // Note: keep cleanup in combined return below
        var pendingInterval = interval;
        var activitySocket = socket;
      }

      // ✅ Fetch stock counts for admin/superadmin
      fetchStockCounts();

      // ✅ Subscribe to inventory socket events to refresh counts
      const inventorySocket = io(SOCKET_URL, {
        auth: { token: localStorage.getItem("pos-token") },
      });

      const refresh = () => fetchStockCounts();
      inventorySocket.on("connect", refresh);
      inventorySocket.on("inventory:update", refresh);
      inventorySocket.on("inventory:bulk", refresh);
      inventorySocket.on("inventory:created", refresh);
      inventorySocket.on("inventory:deleted", refresh);

      return () => {
        // Cleanup intervals and sockets
        try { inventorySocket.disconnect(); } catch (_) {}
        if (typeof pendingInterval !== 'undefined') {
          clearInterval(pendingInterval);
        }
        if (typeof activitySocket !== 'undefined') {
          try { activitySocket.disconnect(); } catch (_) {}
        }
      };
    }
  }, [userRole]); // Add userRole as dependency

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
            <span className="lg:hidden text-lg font-bold">GAT</span>
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
                    `flex items-center p-4 md:p-3 rounded-lg transition-all duration-200 group touch-manipulation relative ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "bg-transparent text-white hover:bg-gray-800 active:bg-gray-700"
                    }`
                  }
                  to={item.path}
                >
                  {/* ✅ Icon with badge */}
                  <div className="relative flex-shrink-0">
                    <span className="text-xl md:text-lg">{item.icon}</span>
                    
                    {/* ✅ Badge for pending approvals - Shows red circle with count */}
                    {item.hasBadge && userRole === 'superadmin' && pendingCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse border border-white">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}

                    {/* ✅ Stock badges on Products (icon overlay) */}
                    {item.hasStockBadge && (lowStockCount > 0 || outOfStockCount > 0) && (
                      <div className="absolute -top-2 -right-2 flex gap-0.5">
                        {outOfStockCount > 0 && (
                          <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-600 rounded-full">
                            {outOfStockCount > 9 ? '9+' : outOfStockCount}
                          </span>
                        )}
                        {lowStockCount > 0 && (
                          <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-yellow-500 rounded-full">
                            {lowStockCount > 9 ? '9+' : lowStockCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop large screen - show text */}
                  <span className="ml-4 md:ml-3 hidden lg:block md:hidden text-base md:text-sm font-medium truncate">
                    {item.name}
                  </span>
                  
                  {/* Mobile - always show text */}
                  <span className="ml-4 md:hidden text-base font-medium">
                    {item.name}
                  </span>
                  
                  {/* ✅ Badge for desktop collapsed view (md screens) */}
                  {item.hasBadge && userRole === 'superadmin' && pendingCount > 0 && (
                    <span className="hidden md:flex lg:hidden ml-auto items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}

                  {/* ✅ Badge for desktop expanded view (lg screens) */}
                  {item.hasBadge && userRole === 'superadmin' && pendingCount > 0 && (
                    <span className="hidden lg:flex ml-auto items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}

                  {/* ✅ Stock badges for desktop views */}
                  {item.hasStockBadge && (lowStockCount > 0 || outOfStockCount > 0) && (
                    <span className="hidden md:flex ml-auto gap-2">
                      {outOfStockCount > 0 && (
                        <span className="items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full hidden lg:inline-flex">
                          Out: {outOfStockCount}
                        </span>
                      )}
                      {lowStockCount > 0 && (
                        <span className="items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-yellow-500 rounded-full hidden lg:inline-flex">
                          Low: {lowStockCount}
                        </span>
                      )}
                      {/* Collapsed md view shows compact counts */}
                      <span className="md:inline-flex lg:hidden items-center justify-center w-auto px-2 py-0.5 text-xs font-bold text-white bg-gray-700 rounded-full">
                        {outOfStockCount > 0 ? `O:${outOfStockCount}` : ''}{(outOfStockCount > 0 && lowStockCount > 0) ? ' | ' : ''}{lowStockCount > 0 ? `L:${lowStockCount}` : ''}
                      </span>
                    </span>
                  )}
                  
                  {/* Tooltip for medium screens */}
                  <div className="absolute left-16 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap hidden md:block lg:hidden">
                    {item.name}
                    {item.hasBadge && userRole === 'superadmin' && pendingCount > 0 && (
                      <span className="ml-2 text-red-400">({pendingCount})</span>
                    )}
                    {item.hasStockBadge && (lowStockCount > 0 || outOfStockCount > 0) && (
                      <span className="ml-2 text-yellow-400">{outOfStockCount > 0 ? `Out:${outOfStockCount}` : ''}{(outOfStockCount > 0 && lowStockCount > 0) ? ' | ' : ''}{lowStockCount > 0 ? `Low:${lowStockCount}` : ''}</span>
                    )}
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