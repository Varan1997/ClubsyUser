import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios.js";
import Categories from "./Categories.jsx";

// Decides where the owner lands after login:
//  - no centres yet  -> category picker (create first centre)
//  - has centre(s)   -> their dashboard
export default function Home() {
  const [state, setState] = useState({ loading: true, hasCenters: false });

  useEffect(() => {
    api
      .get("/centers")
      .then((res) => setState({ loading: false, hasCenters: res.data.centers.length > 0 }))
      .catch(() => setState({ loading: false, hasCenters: false }));
  }, []);

  if (state.loading) return <div className="loading">Loading…</div>;
  if (state.hasCenters) return <Navigate to="/dashboard" replace />;
  return <Categories />;
}
