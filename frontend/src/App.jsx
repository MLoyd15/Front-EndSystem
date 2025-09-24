import './App.css'
import {BrowserRouter as Router, Routes, Route} from 'react-router'
import Root from './utils/Root'
import Login from './pages/login'
import ProtectedRoutes from './utils/ProtectedRoutes'
import Dashboard from './pages/dashboard'
import Categories from './components/categories'
import AdminKpi from './components/adminkpi'
import ProductsPage from './components/ProductsPage'
import Deliveries from './components/Deliveries';
import Review from './components/Review';

// ⬇️ add this wrapper page (similar to your admin Dashboard)
// create pages/driverDashboard.jsx that renders DriverSidebar + <Outlet />
import DriverDashboard from './pages/driverDashboard'

function App() {
  return (
   <Router>
    <Routes>
      <Route path="/" element={<Root />}/>

      {/* ---------------- ADMIN ---------------- */}
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoutes requireRole={["admin"]}>
            <Dashboard />
          </ProtectedRoutes>
        }
      >
        <Route index element={<AdminKpi />} />
        <Route path="categories" element={<Categories />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="delivery" element={<Deliveries />} />
        <Route path="inventory" element={<h1>inventory</h1>} />
        <Route path="review" element={<Review/>} />
        <Route path="users" element={<h1>users</h1>} />
        <Route path="profile" element={<h1>profile</h1>} />
      </Route>

      {/* ---------------- DRIVER ---------------- */}
      <Route
        path="/driver-dashboard"
        element={
          <ProtectedRoutes requireRole={["driver"]}>
            <DriverDashboard />
          </ProtectedRoutes>
        }
      >
        <Route index element={<h1>Driver Home</h1>} />
        <Route path="delivery" element={<Deliveries />} />
        <Route path="profile" element={<h1>Driver Profile</h1>} />
        <Route path="logout" element={<h1>Driver Logout</h1>} />
      </Route>

      {/* ---------------- OTHER ---------------- */}
      <Route path="/customer/dashboard" element={<h1>admin Dashboard</h1>}/>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<p className="font-bold text-3xl mt-20 ml-20"> Unauthorized user</p>} />
    </Routes>
   </Router>
  )
}

export default App
