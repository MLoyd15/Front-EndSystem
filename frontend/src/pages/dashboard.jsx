import React from 'react'
import Sidebar from '../components/sidebar'
import { Outlet } from 'react-router'
import AdminKpi from '../components/adminkpi'

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
        <div className='flex' > 
            <Sidebar />
            <div className='flex-1 md:ml-16 lg:ml-64 min-h-screen'>
                {/* Mobile content padding to avoid overlap with menu button */}
                <div className="md:hidden h-16"></div>
                <Outlet />
            </div>
        </div>
    </div>
  )
}

export default Dashboard
