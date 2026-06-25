import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { BoardPage } from './pages/BoardPage';
import './index.css';

// Protect routes that require authentication
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}

// Redirect away from login if already authenticated
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (user) return <Navigate to="/dashboard" />;
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          } />
          
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="board/:boardId" element={<BoardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
