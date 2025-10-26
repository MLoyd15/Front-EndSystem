import React from "react";
import Sidebar from "../components/sidebar"; // same Sidebar, it auto-switches to driver items
import { Outlet } from "react-router";

const DriverDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 md:ml-16 lg:ml-64 min-h-screen">
          {/* Mobile content padding to avoid overlap with menu button */}
          <div className="md:hidden h-16"></div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
