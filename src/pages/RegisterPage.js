import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, CheckCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RegisterPage({ onRegister }) {
  const { token } = useParams();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API}/invitations/verify/${token}`);
      setEmail(response.data.email);
      setValidToken(true);
    } catch (error) {
      toast.error("Ongeldige of verlopen uitnodiging");
      setValidToken(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Wachtwoorden komen niet overeen");
      return;
    }

    if (password.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        invitation_token: token,
      });
      toast.success("Account succesvol aangemaakt!");
      onRegister(response.data.user, response.data.access_token);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Registratie mislukt. Probeer opnieuw."
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-teal-600 text-xl">Uitnodiging verifiëren...</div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Ongeldige uitnodiging
          </h2>
          <p className="text-gray-600">
            Deze uitnodiging is niet geldig of al gebruikt.
          </p>
        </div>
      </div>
    );
  }

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

          {/* Welcome */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-4">
              <CheckCircle className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium text-sm">
                Uitnodiging geaccepteerd
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Account aanmaken
            </h2>
            <p className="text-gray-600 text-sm">Vul je gegevens in om door te gaan</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">
                E-mailadres
              </Label>
              <Input
                id="email"
                data-testid="register-email-input"
                type="email"
                value={email}
                disabled
                className="mt-1.5 h-11 bg-gray-50 border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-gray-700 font-medium">
                  Voornaam
                </Label>
                <Input
                  id="firstName"
                  data-testid="register-firstname-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan"
                  required
                  className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-gray-700 font-medium">
                  Achternaam
                </Label>
                <Input
                  id="lastName"
                  data-testid="register-lastname-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Jansen"
                  required
                  className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Wachtwoord
              </Label>
              <Input
                id="password"
                data-testid="register-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 6 tekens"
                required
                className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <div>
              <Label
                htmlFor="confirmPassword"
                className="text-gray-700 font-medium"
              >
                Bevestig wachtwoord
              </Label>
              <Input
                id="confirmPassword"
                data-testid="register-confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Herhaal wachtwoord"
                required
                className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <Button
              type="submit"
              data-testid="register-submit-button"
              disabled={loading}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all mt-6"
            >
              {loading ? "Account aanmaken..." : "Account aanmaken"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}