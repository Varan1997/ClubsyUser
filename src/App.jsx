import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import InstallBanner from "./components/InstallBanner.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AddCenter from "./pages/AddCenter.jsx";
import NewCenter from "./pages/NewCenter.jsx";
import CenterDetail from "./pages/CenterDetail.jsx";
import Plans from "./pages/Plans.jsx";
import ChooseRole from "./pages/ChooseRole.jsx";
import MyMemberships from "./pages/MyMemberships.jsx";
import Attend from "./pages/Attend.jsx";
import VenueAttendance from "./pages/VenueAttendance.jsx";
import MarkAttendance from "./pages/MarkAttendance.jsx";

function Shell({ children }) {
  return (
    <div className="shell">
      <Navbar />
      <div className="container">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <InstallBanner />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/attend/:venueId" element={<Attend />} />
      <Route
        path="/choose"
        element={
          <ProtectedRoute>
            <ChooseRole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my"
        element={
          <ProtectedRoute>
            <Shell>
              <MyMemberships />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Home />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/add"
        element={
          <ProtectedRoute>
            <Shell>
              <AddCenter />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/new"
        element={
          <ProtectedRoute>
            <Shell>
              <NewCenter />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/:id/plans"
        element={
          <ProtectedRoute>
            <Shell>
              <Plans />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/:id/attendance"
        element={
          <ProtectedRoute>
            <Shell>
              <VenueAttendance />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/mark"
        element={
          <ProtectedRoute>
            <Shell>
              <MarkAttendance />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/:id"
        element={
          <ProtectedRoute>
            <Shell>
              <CenterDetail />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
