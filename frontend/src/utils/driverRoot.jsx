import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

const DriverRoot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // if logged-in driver -> go to driver dashboard
    if (user?.role === "driver") {
      navigate("/driver-dashboard");
      return;
    }
    // otherwise go to login
    navigate("/login");
  }, [user, navigate]);

  return null;
};

export default DriverRoot;
