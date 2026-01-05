import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });
      
      // Log full response for debugging
      console.log("🔐 Login response:", response);
      console.log("🔐 Response data:", response.data);
      
      // Check if response data exists
      if (!response.data) {
        console.error("❌ No data in response:", response);
        toast.error("Geen data ontvangen van server. Probeer het opnieuw.");
        setLoading(false);
        return;
      }
      
      // Extract user and token from response
      const userData = response.data.user || response.data;
      const accessToken = response.data.access_token || response.data.token;
      
      if (!userData || !accessToken) {
        console.error("❌ Missing user or token in response:", response.data);
        toast.error("Ongeldige response van server. Probeer het opnieuw.");
        setLoading(false);
        return;
      }
      
      // Call onLogin callback
      onLogin(userData, accessToken);
      
      // Show success message
      toast.success("Succesvol ingelogd!");
      
      // Explicitly navigate to home page
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
      
    } catch (error) {
      console.error("❌ Login error:", error);
      console.error("❌ Error response:", error.response);
      toast.error(
        error.response?.data?.detail || "Inloggen mislukt. Controleer je gegevens."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-teal-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <img 
                src="/logo.png" 
                alt="The Global Bedrijfsdiensten" 
                className="h-32 w-auto mx-auto"
              />
            </div>
            <p className="text-teal-600 font-semibold tracking-wide uppercase text-sm">
              Urenregistratie
            </p>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Welkom bij
            </h2>
            <p className="text-gray-600">
              Log in met je werkmail om te starten.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">
                E-mailadres
              </Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                required
                className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Wachtwoord
              </Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? "Inloggen..." : "Inloggen"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Wachtwoord vergeten?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}