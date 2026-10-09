import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios.js";
import Categories from "./Categories.jsx";

// Decides where the owner lands when the app opens:
//  1. If the user had a saved last role → respect it immediately
//  2. If they are an owner with centres → /dashboard
//  3. If they are a member with memberships → /my
//  4. No centres yet → category picker (create first centre)
export default function Home() {
  const [state, setState] = useState({ loading: true, redirect: null });

  useEffect(() => {
    const lastRole = localStorage.getItem("lastRole");

    Promise.all([
      api.get("/centers").then((r) => r.data.centers?.length ?? 0).catch(() => 0),
      api.get("/my/memberships").then((r) => r.data.memberships?.length ?? 0).catch(() => 0),
    ]).then(([centerCount, membershipCount]) => {
      // Honour last saved role if the data still supports it
      if (lastRole === "member" && membershipCount > 0) {
        setState({ loading: false, redirect: "/my" });
      } else if (lastRole === "owner" && centerCount > 0) {
        setState({ loading: false, redirect: "/dashboard" });
      } else if (centerCount > 0) {
        setState({ loading: false, redirect: "/dashboard" });
      } else if (membershipCount > 0) {
        setState({ loading: false, redirect: "/my" });
      } else {
        // Brand new user — show category picker
        setState({ loading: false, redirect: null });
      }
    });
  }, []);

  if (state.loading) return <div className="loading">Loading…</div>;
  if (state.redirect) return <Navigate to={state.redirect} replace />;
  return <Categories />;
}
