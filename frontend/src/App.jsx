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
import DriverDashboardComponent from './components/dashboardDriver'
import DriverDashboard from './pages/driverDashboard'
import ChatPanel from './components/chat'
import DriverDeliveries from './components/driverDeliveries'
import Promo from './components/promo'
import Logout from "./pages/Logout";
import GoAgriLanding from './components/GoAgriLanding'; // Import the landing page
import Sales from './components/Sales'

function App() {
  return (
   <Router>
    <Routes>
      {/* Landing Page as Home */}
      <Route path="/" element={<GoAgriLanding />}/>

      {/* For admin */}
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
        <Route path="promo" element={<Promo/>}/>
        <Route path="Sales" element={<Sales/>}/>
        <Route path="logout" element={<Logout/>}/>
      </Route>

      {/* For Driver*/}
      <Route
        path="/driver-dashboard"
        element={
          <ProtectedRoutes requireRole={["driver"]}>
            <DriverDashboard />
          </ProtectedRoutes>
        }
      >
        <Route index element={<DriverDashboardComponent />} />
        <Route path="delivery" element={<DriverDeliveries  />} />
        <Route path="profile" element={<ChatPanel/>}/>
        <Route path="logout" element={<Logout/>} />
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