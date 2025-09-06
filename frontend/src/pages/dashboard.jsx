import React from 'react'
import Sidebar from '../components/sidebar'
import { Outlet } from 'react-router'
import AdminKpi from '../components/adminkpi'

const Dashboard = () => {
  return (
    <div>
        <div className='flex ' > 
            <Sidebar />
            <div className='flex-1 ml-16 md:ml-64  bg-grey-300 min-h-screen'>
                <Outlet />
            </div>
        </div>
    </div>
  )
}

export default Dashboard
