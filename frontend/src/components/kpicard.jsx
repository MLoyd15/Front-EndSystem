import React from 'react'

const KpiCard = ({ title, value, icon, color }) => {
  return (
    <div className="flex items-center p-4 rounded-xl shadow-md bg-white border border-gray-100 hover:shadow-lg transition">
      <div className={`text-3xl mr-4 p-3 rounded-lg ${color} text-white`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

export default KpiCard