import React from "react";
import Sidebar from "../components/sidebar"; // same Sidebar, it auto-switches to driver items
import { Outlet } from "react-router";

const DriverDashboard = () => {
  return (
    <div>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-16 md:ml-64 bg-grey-300 min-h-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
