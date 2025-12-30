import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Wachtwoorden komen niet overeen");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/reset-password`, {
        token,
        new_password: newPassword,
      });
      
      setSuccess(true);
      toast.success("Wachtwoord succesvol gewijzigd!");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Kon wachtwoord niet resetten. Link mogelijk verlopen."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gelukt!</h2>
          <p className="text-gray-600">
            Je wachtwoord is succesvol gewijzigd. Je wordt doorgestuurd naar login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nieuw wachtwoord instellen
          </h1>
          <p className="text-gray-600">Voer je nieuwe wachtwoord in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="newPassword" className="text-gray-700 font-medium">
              Nieuw wachtwoord
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimaal 6 tekens"
              required
              className="mt-1.5 h-12"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
              Bevestig wachtwoord
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal wachtwoord"
              required
              className="mt-1.5 h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold"
          >
            {loading ? "Bezig..." : "Wachtwoord wijzigen"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Terug naar login
          </button>
        </div>
      </div>
    </div>
  );
}
