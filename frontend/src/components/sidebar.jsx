import React from 'react'
import { FaHome, FaSignOutAlt, FaTable, FaBox, FaTruck, FaShoppingCart, FaUsers, FaCog, FaStar  } from "react-icons/fa"
import { NavLink } from 'react-router'

const Sidebar = () => {
    const menuItems = [
        
        { name:"Dashboard", path: "/admin-dashboard", icon:<FaHome />, isParent: true },
        { name:"Categories", path: "/admin-dashboard/categories", icon:<FaTable />, isParent: false },
        { name:"Products", path: "/admin-dashboard/products", icon:<FaBox />, isParent: false },
        { name:"Suppliers", path: "/admin-dashboard/suppliers", icon:<FaTruck />, isParent: false },
        { name:"Orders", path: "/admin-dashboard/orders", icon:<FaShoppingCart />, isParent: false },  
        { name:"review", path: "/admin-dashboard/review", icon:<FaStar />, isParent: false },  
        { name:"Users", path: "/admin-dashboard/users", icon:<FaUsers />, isParent: false },  
        { name:"Profile", path: "/admin-dashboard/profile", icon:<FaCog />, isParent: false },  
        { name:"Logout", path: "/admin-dashboard/logout", icon:<FaSignOutAlt />, isParent: false },
                 
        
    ]
  return (
    <div className='flex flex-col h-screen bg-green-500 text-white w-16 md:w-64 fixed'>
        <div className='h-16 flex flex-items justify-center'>
            <span className='hidden md:block text-xl font-bold'>Inventory MS</span>
            <span className='md:hidden text-xl font-bold'>IMS</span>
        </div>
        <div>
            <ul className='space-y-2 p-2'>
                {menuItems.map((item) => (
                    <li key={item.name}>
                        <div className='p-2'>
                            <NavLink
                            end={item.isParent} 
                        className={({ isActive }) => (isActive ? "bg-gray-700" : " ") + "flex items-center p-2 rounded-md hover:bg-gray-700 transition duration-200" }
                        to={item.path}>
                            <span className='text-xl'>{item.icon}</span>
                            <span className='ml-4 hidden md:block' >{item.name}</span>
                       </NavLink>
                        </div>
                       
                    </li>
                ))}
            </ul>
        </div>
    </div>
  )
}

export default Sidebar