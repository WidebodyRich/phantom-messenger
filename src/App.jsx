import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '16px',
            background: '#1A1A2E',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            padding: '12px 20px',
          },
          success: { iconTheme: { primary: '#00C853', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/chat/*"
            element={
              <ProtectedRoute>
                <ChatProvider>
                  <Chat />
                </ChatProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}
