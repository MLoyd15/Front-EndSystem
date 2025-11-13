import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserPlus, 
  Users, 
  Eye, 
  EyeOff, 
  Loader, 
  Mail, 
  Phone, 
  User,
  Lock,
  Upload,
  Image,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

const CreateDriver = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [driverFilter, setDriverFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // New states for image upload
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Government ID upload state
  const [govIdFile, setGovIdFile] = useState(null);
  const [govIdPreview, setGovIdPreview] = useState(null);
  const [uploadingGovId, setUploadingGovId] = useState(false);
  const [govUploadStatus, setGovUploadStatus] = useState('');
  
  // State for viewing license image in modal
  const [selectedLicenseImage, setSelectedLicenseImage] = useState(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedGovIdImage, setSelectedGovIdImage] = useState(null);
  const [showGovIdModal, setShowGovIdModal] = useState(false);

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const token = localStorage.getItem('pos-token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API}/admin/drivers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setDrivers(response.data.drivers || []);
      }
    } catch (err) {
      console.error('Fetch drivers error:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Load drivers on component mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Driver name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleLicenseUpload = async (file) => {
    if (!file) return null;
    
    setUploadingLicense(true);
    try {
      const token = localStorage.getItem('pos-token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('license', file);

      const response = await axios.post(
        `${API}/admin/upload-license`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        return response.data.licenseImage.url;
      } else {
        throw new Error(response.data.message || 'License upload failed');
      }
    } catch (err) {
      console.error('License upload error:', err);
      throw err;
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleGovIdUpload = async (file) => {
    if (!file) return null;

    setUploadingGovId(true);
    try {
      const token = localStorage.getItem('pos-token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('governmentId', file);

      const response = await axios.post(
        `${API}/admin/upload-government-id`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        return response.data.governmentIdImage.url;
      } else {
        throw new Error(response.data.message || 'Government ID upload failed');
      }
    } catch (err) {
      console.error('Government ID upload error:', err);
      throw err;
    } finally {
      setUploadingGovId(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setLicenseFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLicensePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleGovIdFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setGovIdFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setGovIdPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const toggleDriverStatus = async (driverId, currentStatus) => {
    try {
      const token = localStorage.getItem('pos-token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.patch(
        `${API}/admin/drivers/${driverId}/status`,
        { active: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update the drivers list
        setDrivers(drivers.map(driver => 
          driver._id === driverId 
            ? { ...driver, active: !currentStatus }
            : driver
        ));
        setSuccess(`Driver ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        throw new Error(response.data.message || 'Failed to update driver status');
      }
    } catch (err) {
      console.error('Toggle driver status error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update driver status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('pos-token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Upload license image if provided
      let licenseImageUrl = null;
      if (licenseFile) {
        licenseImageUrl = await handleLicenseUpload(licenseFile);
      }

      // Upload government ID image if provided
      let governmentIdImageUrl = null;
      if (govIdFile) {
        governmentIdImageUrl = await handleGovIdUpload(govIdFile);
      }

      const response = await axios.post(
        `${API}/admin/create-driver`,
        {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: 'driver',
          licenseImage: licenseImageUrl,
          governmentIdImage: governmentIdImageUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(`Driver account created successfully for ${formData.name}`);
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });
        setLicenseFile(null);
        setLicensePreview(null);
        setGovIdFile(null);
        setGovIdPreview(null);
        // Refresh drivers list
        fetchDrivers();
      } else {
        throw new Error(response.data.message || 'Failed to create driver account');
      }
    } catch (err) {
      console.error('Create driver error:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An error occurred while creating the driver account');
      }
    } finally {
      setLoading(false);
    }
  };

  const openLicenseModal = (licenseUrl) => {
    setSelectedLicenseImage(licenseUrl);
    setShowLicenseModal(true);
  };

  const closeLicenseModal = () => {
    setShowLicenseModal(false);
    setSelectedLicenseImage(null);
  };

  const openGovIdModal = (govIdUrl) => {
    setSelectedGovIdImage(govIdUrl);
    setShowGovIdModal(true);
  };

  const closeGovIdModal = () => {
    setShowGovIdModal(false);
    setSelectedGovIdImage(null);
  };

  // Filter drivers based on active status
  const filteredDrivers = drivers.filter(driver => {
    if (driverFilter === 'active') return driver.active;
    if (driverFilter === 'inactive') return !driver.active;
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-green-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-600 p-4 rounded-full">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Driver Management
          </h1>
          <p className="text-gray-600">
            Create and manage drivers in the GO AGRI TRADING system
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Navigation</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`w-full flex items-center py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'create'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  Create Driver
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`w-full flex items-center py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'list'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-5 h-5 mr-3" />
                  <span className="flex-1 text-left">View Drivers</span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {drivers.length}
                  </span>
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Quick Stats
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">Total Drivers</span>
                    <span className="text-sm font-semibold text-gray-900">{drivers.length}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="text-sm font-semibold text-green-600">
                      {drivers.filter(d => d.active).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm text-gray-600">Inactive</span>
                    <span className="text-sm font-semibold text-red-600">
                      {drivers.filter(d => !d.active).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'create' ? (
              /* Create Driver Form */
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                {/* Success Message */}
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">{success}</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Driver Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter driver's full name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="driver@goagri.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="+63 9XX XXX XXXX"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter secure password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="Confirm password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Driver's License Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver's License Image (Optional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-400 transition-colors duration-200">
                      <div className="space-y-1 text-center">
                        {licensePreview ? (
                          <div className="relative">
                            <img 
                              src={licensePreview} 
                              alt="License preview" 
                              className="mx-auto h-32 w-auto rounded-lg shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setLicenseFile(null);
                                setLicensePreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="license-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                              >
                                <span>Upload license image</span>
                                <input
                                  id="license-upload"
                                  name="license-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                          </>
                        )}
                      </div>
                    </div>
                    {uploadStatus && (
                      <div className={`mt-2 text-sm ${uploadStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {uploadStatus}
                      </div>
                    )}
                  </div>

                  {/* Government ID Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Government ID Image (Optional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-400 transition-colors duration-200">
                      <div className="space-y-1 text-center">
                        {govIdPreview ? (
                          <div className="relative">
                            <img 
                              src={govIdPreview} 
                              alt="Government ID preview" 
                              className="mx-auto h-32 w-auto rounded-lg shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setGovIdFile(null);
                                setGovIdPreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="govid-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                              >
                                <span>Upload government ID image</span>
                                <input
                                  id="govid-upload"
                                  name="govid-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleGovIdFileChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                          </>
                        )}
                      </div>
                    </div>
                    {govUploadStatus && (
                      <div className={`mt-2 text-sm ${govUploadStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {govUploadStatus}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:scale-105'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Creating Driver Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="-ml-1 mr-3 h-5 w-5" />
                        Create Driver Account
                      </>
                    )}
                  </button>
                </form>

                {/* Info Note */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The driver will be able to log in using their email and password. 
                    Make sure to provide them with their login credentials securely.
                  </p>
                </div>
              </div>
            ) : (
              /* Drivers List */
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Driver Accounts</h2>
                      <p className="text-gray-600 mt-1">Manage all driver accounts with driver role</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchDrivers}
                        disabled={loadingDrivers}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                      >
                        {loadingDrivers ? (
                          <Loader className="animate-spin w-4 h-4 mr-2" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  {/* Filter Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
                    <button
                      onClick={() => setDriverFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        driverFilter === 'all'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({drivers.length})
                    </button>
                    <button
                      onClick={() => setDriverFilter('active')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        driverFilter === 'active'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      Active ({drivers.filter(d => d.active).length})
                    </button>
                    <button
                      onClick={() => setDriverFilter('inactive')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        driverFilter === 'inactive'
                          ? 'bg-gray-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Inactive ({drivers.filter(d => !d.active).length})
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loadingDrivers ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="animate-spin w-8 h-8 text-green-600" />
                      <span className="ml-3 text-gray-600">Loading drivers...</span>
                    </div>
                  ) : drivers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers found</h3>
                      <p className="text-gray-600 mb-6">No driver accounts have been created yet.</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create First Driver
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
                      {filteredDrivers.map((driver) => (
                        <div key={driver._id} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-200">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-center flex-1">
                              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-md">
                                <User className="w-6 h-6 text-white" />
                              </div>
                              <div className="ml-4 flex-1">
                                <h3 className="font-bold text-lg text-gray-900">{driver.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 uppercase tracking-wide">
                                    {driver.role}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    driver.active 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {driver.active ? '● Active' : '○ Inactive'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact Information */}
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-sm text-gray-700">
                              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                                <Mail className="w-4 h-4 text-gray-600" />
                              </div>
                              <span className="break-all">{driver.email}</span>
                            </div>
                            {driver.phone && (
                              <div className="flex items-center text-sm text-gray-700">
                                <div className="bg-gray-100 p-2 rounded-lg mr-3">
                                  <Phone className="w-4 h-4 text-gray-600" />
                                </div>
                                <span>{driver.phone}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* License Image Section */}
                          {driver.licenseImage ? (
                            <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="bg-green-100 p-1.5 rounded-lg mr-2">
                                    <Image className="w-4 h-4 text-green-600" />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">
                                    Driver's License
                                  </span>
                                </div>
                                <button
                                  onClick={() => openLicenseModal(driver.licenseImage)}
                                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  View Full
                                </button>
                              </div>
                              <div 
                                className="relative overflow-hidden rounded-lg cursor-pointer group"
                                onClick={() => openLicenseModal(driver.licenseImage)}
                              >
                                <img 
                                  src={driver.licenseImage} 
                                  alt={`${driver.name}'s license`}
                                  className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                                    <Eye className="w-6 h-6 text-green-600" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                              <div className="flex items-center justify-center text-gray-400">
                                <Image className="w-5 h-5 mr-2" />
                                <span className="text-sm">No license image uploaded</span>
                              </div>
                            </div>
                          )}

                          {/* Government ID Image Section */}
                          {driver.governmentIdImage ? (
                            <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="bg-green-100 p-1.5 rounded-lg mr-2">
                                    <Image className="w-4 h-4 text-green-600" />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">
                                    Government ID
                                  </span>
                                </div>
                                <button
                                  onClick={() => openGovIdModal(driver.governmentIdImage)}
                                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  View Full
                                </button>
                              </div>
                              <div 
                                className="relative overflow-hidden rounded-lg cursor-pointer group"
                                onClick={() => openGovIdModal(driver.governmentIdImage)}
                              >
                                <img 
                                  src={driver.governmentIdImage} 
                                  alt={`${driver.name}'s government ID`}
                                  className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                                    <Eye className="w-6 h-6 text-green-600" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                              <div className="flex items-center justify-center text-gray-400">
                                <Image className="w-5 h-5 mr-2" />
                                <span className="text-sm">No government ID image uploaded</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Actions and Metadata */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                              {driver.createdAt && (
                                <div className="flex items-center">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                  Added {new Date(driver.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleDriverStatus(driver._id, driver.active)}
                                className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                                  driver.active 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {driver.active ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4 mr-1.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4 mr-1.5" />
                                    Activate
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* License Image Modal */}
      {showLicenseModal && selectedLicenseImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeLicenseModal}
        >
          <div 
            className="relative bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Driver's License</h3>
              <button
                onClick={closeLicenseModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <img 
                src={selectedLicenseImage} 
                alt="Driver's License"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={closeLicenseModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Government ID Image Modal */}
      {showGovIdModal && selectedGovIdImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeGovIdModal}
        >
          <div 
            className="relative bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Government ID</h3>
              <button
                onClick={closeGovIdModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <img 
                src={selectedGovIdImage} 
                alt="Government ID"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={closeGovIdModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDriver;