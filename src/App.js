import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MandagenstPage from "./pages/MandagenstPage";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth token and request logging
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request
    const timestamp = new Date().toISOString();
    console.log(`📤 [${timestamp}] API REQUEST:`, {
      method: config.method.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL || ''}${config.url}`,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? 'Bearer ***' : undefined
      },
      data: config.data ? (typeof config.data === 'string' ? config.data.substring(0, 200) : config.data) : undefined
    });
    
    // Add request timestamp for response time calculation
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    console.error('❌ [REQUEST ERROR]:', {
      message: error.message,
      config: error.config ? {
        method: error.config.method,
        url: error.config.url,
        baseURL: error.config.baseURL
      } : undefined
    });
    return Promise.reject(error);
  }
);

// Axios interceptor for response logging
axios.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    const requestTime = response.config.metadata?.startTime 
      ? `${((Date.now() - response.config.metadata.startTime) / 1000).toFixed(3)}s`
      : 'unknown';
    
    // Log full response data for debugging (especially for auth endpoints)
    const isAuthEndpoint = response.config.url?.includes('/auth/');
    
    // CRITICAL: Log the entire response object structure for debugging
    console.log(`🔍 [${timestamp}] RAW RESPONSE OBJECT:`, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      dataType: typeof response.data,
      dataIsNull: response.data === null,
      dataIsUndefined: response.data === undefined,
      fullResponse: response
    });
    
    const dataToLog = isAuthEndpoint 
      ? response.data  // Log full data for auth endpoints
      : (response.data ? (typeof response.data === 'string' 
          ? response.data.substring(0, 200) 
          : typeof response.data === 'object' 
            ? JSON.stringify(response.data).substring(0, 200)
            : response.data) : undefined);
    
    console.log(`✅ [${timestamp}] API RESPONSE SUCCESS:`, {
      method: response.config.method.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      responseTime: requestTime,
      data: dataToLog
    });
    
    // Additional detailed logging for auth endpoints
    if (isAuthEndpoint) {
      console.log(`🔐 [AUTH] Response data check:`, {
        hasData: !!response.data,
        dataType: typeof response.data,
        dataValue: response.data,
        responseText: response.request?.responseText,
        responseType: response.config?.responseType
      });
      
      if (response.data) {
        console.log(`🔐 [AUTH] Full response data:`, JSON.stringify(response.data, null, 2));
      } else {
        console.error(`❌ [AUTH] NO DATA IN RESPONSE!`, {
          status: response.status,
          headers: response.headers,
          request: response.request
        });
      }
    }
    
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    const requestTime = error.config?.metadata?.startTime 
      ? `${((Date.now() - error.config.metadata.startTime) / 1000).toFixed(3)}s`
      : 'unknown';
    
    console.error(`❌ [${timestamp}] API RESPONSE ERROR:`, {
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      url: error.config?.url || 'UNKNOWN',
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL || ''}${error.config.url}` : 'UNKNOWN',
      status: error.response?.status || 'NO_RESPONSE',
      statusText: error.response?.statusText || 'NO_RESPONSE',
      responseTime: requestTime,
      errorMessage: error.message,
      errorDetails: error.response?.data || error.message,
      requestData: error.config?.data ? (typeof error.config.data === 'string' 
        ? error.config.data.substring(0, 200) 
        : error.config.data) : undefined
    });
    
    // Log network errors separately
    if (!error.response) {
      console.error('🌐 NETWORK ERROR - No response from server:', {
        message: error.message,
        code: error.code,
        url: error.config?.url
      });
    }
    
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-teal-600 text-xl">Laden...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/register/:token"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <RegisterPage onRegister={handleLogin} />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              user ? <Navigate to="/" replace /> : <ForgotPasswordPage />
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              user ? <Navigate to="/" replace /> : <ResetPasswordPage />
            }
          />
          <Route
            path="/mandagenstaat"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === "admin" ? (
                <MandagenstPage user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === "admin" ? (
                <AdminDashboard user={user} onLogout={handleLogout} />
              ) : (
                <EmployeeDashboard user={user} onLogout={handleLogout} />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;