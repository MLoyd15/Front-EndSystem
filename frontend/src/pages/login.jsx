import React, { useState } from "react";
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router";
import axios from "axios";

const Login = () => {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const {login}= useAuth()

    const handleSumbit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        

        try {
           
            const response = await axios.post("http://localhost:5000/api/auth/login", {
                email, 
                password,
            })

            console.log(response.data)
           if (response.data.success) {
                await login(response.data.user, response.data.token)
                if (response.data.user.role === "admin") {
                    navigate("/admin-dashboard")
                } else {
                    navigate("/customer/dashboard")
                }
           } else {
            alert(response.data.error)
           }


        } catch (error) {
           if(error.response) {
            setError(error.response.data.message);
           }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
                <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
                    Login
                </h1>
                {error && (
                    <div className="bg-red-200 text-red-700 p-2 mb-4 rounded">
                        {error}
                    </div>    
                )}
                <form onSubmit={handleSumbit} className="space-y-4">
                    <div className="flex flex-col space-y-1">
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            type="text"
                            id="email"
                            name="email"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                    >
                        {loading ? "Loading...": "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Login