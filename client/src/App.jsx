import { Link } from 'react-router-dom';
import { loginDestination } from '@/lib/navigation';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { Loader2 } from 'lucide-react';

import Navbar from '@/components/Navbar';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import CreateInterview from '@/components/CreateInterview';
import InterviewScreen from '@/components/InterviewScreen';
import Feedback from '@/components/Feedback';
import SignIn from '@/components/SignIn';
import SignUpPage from '@/components/SignUp';

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`} state={{ from: location }} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to={loginDestination(location)} replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <LandingPage />
            </>
          }
        />

        {/* Login */}
        <Route
          path="/login/*"
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          }
        />

        {/* Sign Up */}
        <Route
          path="/sign-up/*"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Dashboard />
              </>
            </ProtectedRoute>
          }
        />

        {/* Create Interview */}
        <Route
          path="/create-interview"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <CreateInterview />
              </>
            </ProtectedRoute>
          }
        />

        {/* Interview */}
        <Route
          path="/interview/:id"
          element={
            <ProtectedRoute>
              <>
                <InterviewScreen key={location.pathname} />
              </>
            </ProtectedRoute>
          }
        />

        {/* Feedback */}
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Feedback />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:id"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Feedback />
              </>
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<main className="container py-24 text-center"><h1 className="text-5xl">Page not found</h1><p className="my-6 text-muted-foreground">This address does not match a page in MockAI.</p><Link className="inline-block rounded-full bg-primary px-6 py-3 text-white" to="/">Return home</Link></main>} />
      </Routes>
    </div>
  );
}