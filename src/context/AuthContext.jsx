import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setOwner(res.data.owner))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // Request an OTP for a phone number. Returns { isNewOwner, devOtp }.
  async function sendOtp(phone) {
    const res = await api.post("/auth/send-otp", { phone });
    return res.data;
  }

  // Verify the OTP (and name for new owners). Stores token + owner on success.
  async function verifyOtp(phone, otp, name) {
    const res = await api.post("/auth/verify-otp", { phone, otp, name });
    localStorage.setItem("token", res.data.token);
    setOwner(res.data.owner);
    return res.data.owner;
  }

  function logout() {
    localStorage.removeItem("token");
    setOwner(null);
  }

  return (
    <AuthContext.Provider value={{ owner, loading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
