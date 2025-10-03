import React, { useEffect, useState } from "react";
import {
  FaHome,
  FaSignOutAlt,
  FaTable,
  FaBox,
  FaTruck,
  FaUsers,
  FaStar,
  FaUser
} from "react-icons/fa";
import { NavLink } from "react-router";
import { MdDiscount } from "react-icons/md";

const Sidebar = () => {
  const menuItems = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <FaHome />, isParent: true },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable />, isParent: false },
    { name: "Products", path: "/admin-dashboard/products", icon: <FaBox />, isParent: false },
    { name: "Delivery", path: "/admin-dashboard/delivery", icon: <FaTruck />, isParent: false },
    { name: "Product review ", path: "/admin-dashboard/review", icon: <FaStar />, isParent: false },
    { name: "Product Promo", path: "/admin-dashboard/promo", icon: <MdDiscount />, isParent: false },
    { name: "Sales History", path: "/admin-dashboard/Sales", icon: <FaSignOutAlt />, isParent: false },
    { name: "Logout", path: "/admin-dashboard/logout", icon: <FaSignOutAlt />, isParent: false },
  ];

  const driverItems = [
    { name: "Dashboard", path: "/driver-dashboard", icon: <FaHome />, isParent: true },
    { name: "Deliveries", path: "/driver-dashboard/delivery", icon: <FaTruck />, isParent: false },
    
    { name: "Logout", path: "/driver-dashboard/logout", icon: <FaSignOutAlt />, isParent: false },
  ];

  const [items, setItems] = useState(menuItems);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("pos-user") || "{}");
    if (user?.role === "driver") {
      setItems(driverItems);
    } else {
      setItems(menuItems);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-black text-white w-16 md:w-64 fixed">
      <div className="h-16 flex flex-items justify-center">
        <span className="hidden md:block text-xl font-bold">Inventory MS</span>
        <span className="md:hidden text-xl font-bold">IMS</span>
      </div>
      <div>
        <ul className="space-y-2 p-2">
          {items.map((item) => (
            <li key={item.name}>
              <div className="p-2">
                <NavLink
                  end={item.isParent}
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-white text-black"
                      : "bg-transparent text-white") +
                    " flex items-center p-2 rounded-md"
                  }
                  to={item.path}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="ml-4 hidden md:block">{item.name}</span>
                </NavLink>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
