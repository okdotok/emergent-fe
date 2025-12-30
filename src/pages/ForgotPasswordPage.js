import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success("Als het email adres bestaat, is er een reset link verstuurd");
    } catch (error) {
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
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

          {!submitted ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Wachtwoord vergeten?
                </h2>
                <p className="text-gray-600 text-sm">
                  Voer je email adres in en we sturen je een reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    E-mailadres
                  </Label>
                  <Input
                    id="email"
                    data-testid="forgot-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="naam@bedrijf.nl"
                    required
                    className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="forgot-submit-button"
                  disabled={loading}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? "Versturen..." : "Reset link versturen"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Check je email
              </h3>
              <p className="text-gray-600 mb-6">
                Als het email adres bij ons bekend is, hebben we een reset link verstuurd naar <strong>{email}</strong>
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}