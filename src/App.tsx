import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { Nest } from './pages/Nest';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { ItemDetails } from './pages/ItemDetails';
import { AdminSignup } from './pages/AdminSignup';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute } from './components/auth/AdminRoute';
import { CartProvider } from './contexts/CartContext';
import { AlertProvider } from './contexts/AlertContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, dbUser, loading, dbLoading } = useAuth();
  const location = useLocation();
  
  // Wait for initial auth AND dbUser fetch to complete
  if (loading || dbLoading || dbUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block access if email is not verified
  if (!user.emailVerified) {
    return <Navigate to="/auth" replace />;
  }
  
  // If user is onboarded but trying to access /onboarding, send to home
  if (dbUser?.university && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  // If user is NOT onboarded and NOT on /onboarding, send to onboarding
  // SKIP onboarding for admins
  const isStudent = dbUser?.role === 'student';
  const hasNoUniversity = !dbUser?.university;
  if (isStudent && hasNoUniversity && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading, dbUser } = useAuth();

  // Global loading state to prevent UI flickers during auth check
  if (loading || dbUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      <Navbar />
      <main className="w-full">
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={(user && user.emailVerified) ? <Navigate to="/" replace /> : <Auth />} />
          
          {/* Protected routes */}
          <Route path="/" element={user ? <ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><Home /></div></ProtectedRoute> : <Landing />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><Market /></div></ProtectedRoute>} />
          <Route path="/market/:id" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><ItemDetails type="market" /></div></ProtectedRoute>} />
          <Route path="/nest" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><Nest /></div></ProtectedRoute>} />
          <Route path="/nest/:id" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><ItemDetails type="nest" /></div></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><Profile /></div></ProtectedRoute>} />
          <Route path="/profile/:uid" element={<ProtectedRoute><div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24 pt-24"><Profile /></div></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AlertProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AlertProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
