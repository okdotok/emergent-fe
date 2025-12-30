import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Clock,
  LogOut,
  LogIn,
  MapPin,
  ListChecks,
  Settings,
  Timer,
  Download,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EmployeeDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("clock");
  const [projects, setProjects] = useState([]);
  const [clockEntries, setClockEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clockStatus, setClockStatus] = useState({ clocked_in: false, entry: null });
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Clock in form
  const [selectedCompany, setSelectedCompany] = useState("");
  const [clockInData, setClockInData] = useState({
    project_id: "",
    note: "",
  });

  // Password change
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Confirmation step for clock in
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  
  // Confirmation step for clock out
  const [clockOutConfirmDialog, setClockOutConfirmDialog] = useState(false);
  const [clockOutConfirmData, setClockOutConfirmData] = useState(null);

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchProjects();
    fetchClockStatus();
    fetchClockEntries();
  }, []);

  // GPS tracking every 10 minutes while clocked in
  useEffect(() => {
    let gpsInterval;
    if (clockStatus.clocked_in && clockStatus.entry) {
      const logGPS = async () => {
        try {
          const loc = await getLocation();
          await axios.post(`${API}/clock/gps-log/${clockStatus.entry.id}`, loc);
        } catch (error) {
          console.error("GPS log failed:", error);
        }
      };
      
      // Log immediately
      logGPS();
      
      // Then every 10 minutes (600000 ms)
      gpsInterval = setInterval(logGPS, 600000);
    }
    
    return () => {
      if (gpsInterval) clearInterval(gpsInterval);
    };
  }, [clockStatus.clocked_in, clockStatus.entry]);

  useEffect(() => {
    let interval;
    if (clockStatus.clocked_in && clockStatus.entry) {
      interval = setInterval(() => {
        const clockInTime = new Date(clockStatus.entry.clock_in_time);
        const now = new Date();
        const diff = Math.floor((now - clockInTime) / 1000);
        setElapsedTime(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockStatus]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      toast.error("Kon projecten niet laden");
    }
  };

  const fetchClockStatus = async () => {
    try {
      const response = await axios.get(`${API}/clock/status`);
      setClockStatus(response.data);
    } catch (error) {
      console.error("Kon klok status niet laden", error);
    }
  };

  const fetchClockEntries = async () => {
    try {
      const response = await axios.get(`${API}/clock/entries`);
      setClockEntries(response.data);
    } catch (error) {
      toast.error("Kon uren niet laden");
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation wordt niet ondersteund door je browser"));
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          resolve(loc);
        },
        (error) => {
          setGettingLocation(false);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!clockInData.project_id) {
      toast.error("Selecteer eerst een project");
      return;
    }

    // Show confirmation dialog with project info
    const selectedProject = projects.find(p => p.id === clockInData.project_id);
    setConfirmData({
      project: selectedProject,
      dateTime: new Date().toLocaleString('nl-NL'),
      note: clockInData.note
    });
    setConfirmDialog(true);
  };

  const confirmClockIn = async () => {
    setLoading(true);
    setConfirmDialog(false);
    try {
      const loc = await getLocation();
      if (!loc) {
        toast.error("GPS locatie kon niet worden verkregen. Geef toestemming voor locatietoegang.");
        return;
      }
      
      await axios.post(`${API}/clock/in`, {
        ...clockInData,
        location: loc,
      });
      toast.success("Ingeklokt!");
      setClockInData({ project_id: "", note: "" });
      setConfirmData(null);
      fetchClockStatus();
      fetchClockEntries();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Kon niet inklokken";
      
      // Check if it's a location distance error
      if (errorMsg.includes("Te ver van project locatie") || errorMsg.includes("50m")) {
        // Show detailed error dialog
        alert(`❌ INKLOKKEN NIET MOGELIJK\n\n${errorMsg}\n\nJe moet binnen 50 meter van de projectlocatie zijn om in te kunnen klokken.\n\nControleer:\n• Ben je op de juiste locatie?\n• Staat je GPS aan?\n• Heeft de app locatie toestemming?`);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockStatus.entry) return;

    setGettingLocation(true);
    try {
      const loc = await getLocation();
      
      // Get project info for distance check
      const project = projects.find(p => p.id === clockStatus.entry.project_id);
      let distance = null;
      let withinRadius = null;
      
      if (project && project.location_lat && project.location_lon) {
        distance = calculateDistance(
          loc.lat, loc.lon,
          project.location_lat, project.location_lon
        );
        const radius = project.location_radius || 50;
        withinRadius = distance <= radius;
      }
      
      // Show confirmation dialog
      setClockOutConfirmData({
        location: loc,
        project,
        distance,
        withinRadius
      });
      setClockOutConfirmDialog(true);
    } catch (error) {
      toast.error("Kon GPS locatie niet ophalen. Controleer toestemming.");
    } finally {
      setGettingLocation(false);
    }
  };
  
  const confirmClockOut = async () => {
    if (!clockOutConfirmData) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/clock/out/${clockStatus.entry.id}`, {
        location: clockOutConfirmData.location,
      });
      toast.success("Uitgeklokt!");
      setClockOutConfirmDialog(false);
      setClockOutConfirmData(null);
      fetchClockStatus();
      fetchClockEntries();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Kon niet uitklokken."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Nieuwe wachtwoorden komen niet overeen");
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      toast.success("Wachtwoord succesvol gewijzigd!");
      setPasswordDialog(false);
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Kon wachtwoord niet wijzigen"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalHours = () => {
    return clockEntries
      .filter((e) => e.status === "clocked_out")
      .reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/clock/entries/export/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `mijn_uren_${user.first_name}_${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF bestand gedownload!");
    } catch (error) {
      toast.error("Kon PDF niet genereren");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-teal-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="The Global" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Urenregistratie</h1>
                <p className="text-sm text-gray-600">Welkom, {user.name}</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              data-testid="logout-button"
              variant="outline"
              className="flex items-center gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <LogOut className="w-4 h-4" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("clock")}
            data-testid="tab-clock"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "clock"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <Timer className="w-4 h-4" />
            Klokken
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            data-testid="tab-overview"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Mijn overzicht
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            data-testid="tab-settings"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <Settings className="w-4 h-4" />
            Instellingen
          </button>
        </div>

        {/* Clock Tab */}
        {activeTab === "clock" && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Card */}
            {clockStatus.clocked_in ? (
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-full">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Momenteel ingeklokt</h3>
                      <p className="text-teal-100">{clockStatus.entry?.project_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold font-mono">{formatTime(elapsedTime)}</div>
                    <p className="text-teal-100 text-sm">Gewerkte tijd</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-teal-100 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{clockStatus.entry?.company} - {clockStatus.entry?.project_location}</span>
                </div>
                <Button
                  onClick={handleClockOut}
                  data-testid="clock-out-button"
                  disabled={loading || gettingLocation}
                  className="w-full h-14 bg-white text-teal-600 hover:bg-gray-100 font-semibold text-lg rounded-xl shadow-lg"
                >
                  {gettingLocation ? (
                    "Locatie ophalen..."
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-2" />
                      Uitklokken
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-teal-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <LogIn className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Inklokken</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="company" className="text-gray-700 font-medium">
                      Bedrijf
                    </Label>
                    <Select
                      value={selectedCompany}
                      onValueChange={(value) => {
                        setSelectedCompany(value);
                        setClockInData({ ...clockInData, project_id: "" });
                      }}
                    >
                      <SelectTrigger
                        className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                      >
                        <SelectValue placeholder="Selecteer eerst een bedrijf" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set(projects.map(p => p.company))].map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="project" className="text-gray-700 font-medium">
                      Project
                    </Label>
                    <Select
                      value={clockInData.project_id}
                      onValueChange={(value) =>
                        setClockInData({ ...clockInData, project_id: value })
                      }
                      disabled={!selectedCompany}
                    >
                      <SelectTrigger
                        data-testid="project-select"
                        className="mt-1.5 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                      >
                        <SelectValue placeholder={selectedCompany ? "Selecteer een project" : "Selecteer eerst een bedrijf"} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects
                          .filter(p => p.company === selectedCompany)
                          .map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="note" className="text-gray-700 font-medium">
                      Opmerking (optioneel)
                    </Label>
                    <Textarea
                      id="note"
                      data-testid="note-input"
                      value={clockInData.note}
                      onChange={(e) =>
                        setClockInData({ ...clockInData, note: e.target.value })
                      }
                      placeholder="Voeg een opmerking toe..."
                      rows={3}
                      className="mt-1.5 border-gray-300 focus:border-teal-500 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleClockIn}
                    data-testid="clock-in-button"
                    disabled={loading || gettingLocation}
                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {gettingLocation ? (
                      "Locatie ophalen..."
                    ) : loading ? (
                      "Inklokken..."
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Inklokken
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">GPS Locatie</p>
                  <p>
                    Bij het in- en uitklokken wordt automatisch je locatie opgeslagen voor
                    verificatie doeleinden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Totaal aantal uren</h3>
                  <p className="text-4xl font-bold">{getTotalHours().toFixed(2)}</p>
                  <p className="text-teal-100 mt-1">
                    {clockEntries.filter((e) => e.status === "clocked_out").length} voltooide sessies
                  </p>
                </div>
                <Button
                  onClick={handleExportPDF}
                  data-testid="export-pdf-button"
                  className="bg-white text-teal-600 hover:bg-gray-100 font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Entries List */}
            <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
              <div className="p-6 border-b border-teal-100">
                <h2 className="text-2xl font-bold text-gray-900">Mijn uren</h2>
              </div>

              {clockEntries.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nog geen uren geregistreerd</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-teal-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Datum
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Bedrijf
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          In
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Uit
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Uren
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clockEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-teal-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(entry.clock_in_time).toLocaleDateString("nl-NL")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {entry.company}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {entry.project_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(entry.clock_in_time).toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {entry.clock_out_time
                              ? new Date(entry.clock_out_time).toLocaleTimeString("nl-NL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-teal-700">
                            {entry.total_hours ? `${entry.total_hours.toFixed(2)}u` : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {entry.status === "clocked_out" ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Voltooid
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                Actief
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Instellingen</h2>
              
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Account</h3>
                  <p className="text-gray-600 text-sm mb-4">Email: {user.email}</p>
                  <Button
                    onClick={() => setPasswordDialog(true)}
                    data-testid="change-password-button"
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    Wachtwoord wijzigen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wachtwoord wijzigen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div>
              <Label>Huidig wachtwoord</Label>
              <Input
                type="password"
                data-testid="old-password-input"
                value={passwordData.old_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, old_password: e.target.value })
                }
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Nieuw wachtwoord</Label>
              <Input
                type="password"
                data-testid="new-password-input"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, new_password: e.target.value })
                }
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Bevestig nieuw wachtwoord</Label>
              <Input
                type="password"
                data-testid="confirm-password-input"
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirm_password: e.target.value })
                }
                required
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setPasswordDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                data-testid="save-password-button"
                disabled={loading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clock In Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inklokken bevestigen</DialogTitle>
          </DialogHeader>
          {confirmData && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-teal-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-gray-900">Project:</span>
                  <span className="text-gray-700">{confirmData.project?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-gray-900">Tijd:</span>
                  <span className="text-gray-700">{confirmData.dateTime}</span>
                </div>
                {confirmData.project?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-gray-900">Locatie:</span>
                    <span className="text-gray-700">{confirmData.project.location}</span>
                  </div>
                )}
                {confirmData.note && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-900">Opmerking:</span>
                    <span className="text-gray-700">{confirmData.note}</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>Uw GPS-locatie wordt vastgelegd bij het inklokken. Zorg ervoor dat locatietoegang is ingeschakeld.</span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmDialog(false);
                    setConfirmData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={confirmClockIn}
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? "Bezig..." : "Bevestigen"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clock Out Confirmation Dialog */}
      <Dialog open={clockOutConfirmDialog} onOpenChange={setClockOutConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uitklokken bevestigen</DialogTitle>
          </DialogHeader>
          {clockOutConfirmData && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-orange-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-gray-900">Project:</span>
                  <span className="text-gray-700">{clockOutConfirmData.project?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-gray-900">Tijd:</span>
                  <span className="text-gray-700">{new Date().toLocaleString("nl-NL")}</span>
                </div>
                {clockOutConfirmData.project?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-gray-900">Projectlocatie:</span>
                    <span className="text-gray-700">{clockOutConfirmData.project.location}</span>
                  </div>
                )}
                {clockOutConfirmData.distance !== null && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-gray-900">Afstand:</span>
                    <span className={clockOutConfirmData.withinRadius ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {Math.round(clockOutConfirmData.distance)}m
                    </span>
                  </div>
                )}
              </div>
              
              {clockOutConfirmData.withinRadius === false && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Locatie komt niet overeen!</p>
                    <p className="text-sm text-red-700 mt-1">
                      U bent {Math.round(clockOutConfirmData.distance)}m van de projectlocatie. 
                      Dit wordt geregistreerd in het systeem.
                    </p>
                  </div>
                </div>
              )}
              
              {clockOutConfirmData.withinRadius === true && (
                <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-sm text-green-800">Locatie komt overeen met projectlocatie</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setClockOutConfirmDialog(false);
                    setClockOutConfirmData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={confirmClockOut}
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? "Bezig..." : "Uitklokken"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}