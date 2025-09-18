import { useEffect } from "react";
import { useNavigate } from "react-router";

const Root = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
};

export default Root;