import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import GPSDetailModal from "@/components/GPSDetailModal";
import LocationPreview from "@/components/LocationPreview";
import {
  Clock,
  LogOut,
  Users,
  Briefcase,
  FileText,
  Mail,
  Plus,
  Download,
  Copy,
  Check,
  Trash2,
  Pencil,
  MapPin,
  Settings,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper: Format date to dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [invitations, setInvitations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [clockEntries, setClockEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  // Dialogs
  const [inviteDialog, setInviteDialog] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [editProjectDialog, setEditProjectDialog] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Forms
  const [inviteData, setInviteData] = useState({ email: "", name: "" });
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    company: "",
    location: "",
    latitude: "",
    longitude: "",
    location_radius: 100,
    description: "",
  });
  const [editingProject, setEditingProject] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  
  // New states for bulk delete and overview
  const [selectedInvitations, setSelectedInvitations] = useState([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  
  // GPS Detail Modal state
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeEntries, setSelectedEmployeeEntries] = useState([]);
  
  // NEW: Day/Week specific filtering
  const [selectedDate, setSelectedDate] = useState(null); // Format: YYYY-MM-DD
  const [selectedWeek, setSelectedWeek] = useState(null); // Format: { start: YYYY-MM-DD, end: YYYY-MM-DD, weekNum: number }
  const [detailViewMode, setDetailViewMode] = useState(null); // 'day' | 'week' | null
  
  // Project search/filter
  const [projectSearch, setProjectSearch] = useState("");
  
  // User search/filter
  const [userSearch, setUserSearch] = useState("");
  
  // Invitation search
  const [invitationSearch, setInvitationSearch] = useState("");
  
  // Location preview state
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [previewLocation, setPreviewLocation] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [invitesRes, projectsRes, usersRes] = await Promise.all([
        axios.get(`${API}/invitations`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/users`),
      ]);
      setInvitations(invitesRes.data);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      // DON'T load clock entries automatically - only after filter
    } catch (error) {
      toast.error("Kon gegevens niet laden");
    }
  };

  const fetchOverviewData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      if (filterProject) params.append('project_ids', filterProject);
      if (filterUser) params.append('user_ids', filterUser);
      
      const response = await axios.get(`${API}/admin/time-entries/overview?${params.toString()}`);
      setOverviewData(response.data);
      setClockEntries(response.data.entries);
    } catch (error) {
      toast.error("Kon overzicht niet laden");
      console.error(error);
    }
  };

  const applyFilters = () => {
    fetchOverviewData();
  };

  const setQuickDateFilter = (type) => {
    const today = new Date();
    let startDate, endDate;
    
    if (type === 'today') {
      startDate = endDate = today.toISOString().split('T')[0];
    } else if (type === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (type === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
  };

  const handleExportAdminPDF = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      if (filterProject && filterProject !== 'all') params.append('project_ids', filterProject);
      if (filterUser && filterUser !== 'all') params.append('user_ids', filterUser);
      
      const response = await axios.get(`${API}/admin/export/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `urenoverzicht_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Kon PDF niet downloaden');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (userName, filterDate = null) => {
    // Filter entries by employee and optionally by date
    let employeeEntries = clockEntries.filter(e => e.user_name === userName);
    
    if (filterDate) {
      // STRICT: Only show entries from this specific date
      employeeEntries = employeeEntries.filter(e => {
        const entryDate = new Date(e.clock_in_time).toISOString().split('T')[0];
        return entryDate === filterDate;
      });
    }
    
    setSelectedEmployee(userName);
    setSelectedEmployeeEntries(employeeEntries);
    setGpsModalOpen(true);
  };
  
  // NEW: Handle day click - show ONLY that day
  const handleDayClick = async (date) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // STRICT: Only fetch entries for this exact date
      const params = new URLSearchParams();
      params.append('date', date); // YYYY-MM-DD format
      
      const response = await axios.get(`${API}/clock/entries?${params.toString()}`, { headers });
      
      setClockEntries(response.data || []);
      setSelectedDate(date);
      setSelectedWeek(null);
      setDetailViewMode('day');
      
      toast.success(`Dag ${formatDate(date)} geladen`);
    } catch (error) {
      console.error('Day fetch error:', error);
      toast.error('Kon dag niet laden');
    } finally {
      setLoading(false);
    }
  };
  
  // NEW: Handle week click - show ONLY that week
  const handleWeekClick = async (startDate, endDate, weekNum) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // STRICT: Only fetch entries within this exact week range
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      
      const response = await axios.get(`${API}/clock/entries?${params.toString()}`, { headers });
      
      setClockEntries(response.data || []);
      setSelectedDate(null);
      setSelectedWeek({ start: startDate, end: endDate, weekNum });
      setDetailViewMode('week');
      
      toast.success(`Week ${weekNum} geladen`);
    } catch (error) {
      console.error('Week fetch error:', error);
      toast.error('Kon week niet laden');
    } finally {
      setLoading(false);
    }
  };
  
  // NEW: Return to full overview
  const handleBackToOverview = () => {
    setSelectedDate(null);
    setSelectedWeek(null);
    setDetailViewMode(null);
    fetchAllData(); // Reload with original filters
    toast.info('Terug naar volledig overzicht');
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Weet je zeker dat je dit project wilt verwijderen?")) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API}/projects/${projectId}`);
      toast.success("Project verwijderd!");
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kon project niet verwijderen");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProjects = () => {
    if (!projectSearch) return projects;
    return projects.filter(p => 
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.company.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.location.toLowerCase().includes(projectSearch.toLowerCase())
    );
  };

  const getFilteredUsers = () => {
    if (!userSearch) return users;
    return users.filter(u => 
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.first_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.last_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
    );
  };

  const getFilteredInvitations = () => {
    if (!invitationSearch) return invitations;
    return invitations.filter(inv => 
      inv.email.toLowerCase().includes(invitationSearch.toLowerCase()) ||
      (inv.name && inv.name.toLowerCase().includes(invitationSearch.toLowerCase()))
    );
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/invitations`, {
        email: inviteData.email,
        name: inviteData.name,
      });
      toast.success("Uitnodiging verstuurd!");
      setInvitations([response.data, ...invitations]);
      setInviteData({ email: "", name: "" });
      setInviteDialog(false);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Kon uitnodiging niet versturen"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const projectData = {
        ...projectForm,
        latitude: projectForm.latitude ? parseFloat(projectForm.latitude) : null,
        longitude: projectForm.longitude ? parseFloat(projectForm.longitude) : null,
      };
      const response = await axios.post(`${API}/projects`, projectData);
      toast.success("Project aangemaakt!");
      setProjects([response.data, ...projects]);
      setProjectForm({ name: "", company: "", location: "", latitude: "", longitude: "", location_radius: 100, description: "" });
      setProjectDialog(false);
    } catch (error) {
      toast.error("Kon project niet aanmaken");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject({
      ...project,
      latitude: project.latitude || "",
      longitude: project.longitude || "",
      location_radius: project.location_radius || 100,
    });
    setEditProjectDialog(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const projectData = {
        name: editingProject.name,
        company: editingProject.company,
        location: editingProject.location,
        latitude: editingProject.latitude ? parseFloat(editingProject.latitude) : null,
        longitude: editingProject.longitude ? parseFloat(editingProject.longitude) : null,
        location_radius: editingProject.location_radius,
        description: editingProject.description,
      };
      const response = await axios.put(
        `${API}/projects/${editingProject.id}`,
        projectData
      );
      toast.success("Project bijgewerkt!");
      setProjects(
        projects.map((p) => (p.id === editingProject.id ? response.data : p))
      );
      setEditProjectDialog(false);
      setEditingProject(null);
    } catch (error) {
      toast.error("Kon project niet bijwerken");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditUserDialog(true);
  };
  
  const handleResetUserPassword = (user) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setResetPasswordDialog(true);
  };
  
  const confirmResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }
    
    if (!window.confirm(`Weet je zeker dat je het wachtwoord wilt resetten voor ${resetPasswordUser.first_name} ${resetPasswordUser.last_name}? Dit wordt gelogd in het audit log.`)) {
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/admin/users/${resetPasswordUser.id}/reset-password`, null, {
        params: { new_password: newPassword }
      });
      toast.success(`Wachtwoord gereset voor ${resetPasswordUser.first_name} ${resetPasswordUser.last_name}`);
      setResetPasswordDialog(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error) {
      toast.error("Kon wachtwoord niet resetten");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(
        `${API}/users/${editingUser.id}`,
        {
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          email: editingUser.email,
          bsn: editingUser.bsn || "",
        }
      );
      toast.success("Medewerker bijgewerkt!");
      setUsers(users.map((u) => (u.id === editingUser.id ? response.data : u)));
      setEditUserDialog(false);
      setEditingUser(null);
    } catch (error) {
      toast.error("Kon medewerker niet bijwerken");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Weet je zeker dat je deze medewerker wilt verwijderen? Alle uren worden ook verwijderd.")) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success("Medewerker verwijderd!");
      setUsers(users.filter((u) => u.id !== userId));
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kon medewerker niet verwijderen");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterUser) params.append("user_id", filterUser);
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);

      const response = await axios.get(
        `${API}/reports/excel?${params.toString()}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `urenregistratie_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel bestand gedownload!");
    } catch (error) {
      toast.error("Kon export niet genereren");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    toast.success("Link gekopieerd!");
    setTimeout(() => setCopied(""), 2000);
  };

  const handleResendInvite = async (invitationId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/invitations/${invitationId}/resend`);
      toast.success("Uitnodiging opnieuw verzonden!");
    } catch (error) {
      toast.error("Kon uitnodiging niet opnieuw versturen");
    } finally {
      setLoading(false);
    }
  };

  const handleEditInvitation = (invitation) => {
    setEditingInvitation({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name || ""
    });
  };

  const handleUpdateInvitation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/invitations/${editingInvitation.id}`, {
        name: editingInvitation.name
      });
      toast.success("Uitnodiging bijgewerkt!");
      setInvitations(invitations.map(inv => 
        inv.id === editingInvitation.id 
          ? {...inv, name: editingInvitation.name}
          : inv
      ));
      setEditingInvitation(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kon uitnodiging niet bijwerken");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (invitationId) => {
    setItemsToDelete([invitationId]);
    setDeleteConfirmDialog(true);
  };

  const handleBulkDelete = () => {
    if (selectedInvitations.length === 0) {
      toast.error("Selecteer minimaal één uitnodiging");
      return;
    }
    setItemsToDelete(selectedInvitations);
    setDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      if (itemsToDelete.length === 1) {
        // Single delete
        await axios.delete(`${API}/invitations/${itemsToDelete[0]}`);
        toast.success("Uitnodiging verwijderd!");
      } else {
        // Bulk delete
        await axios.post(`${API}/invitations/bulk-delete`, {
          invitation_ids: itemsToDelete
        });
        toast.success(`${itemsToDelete.length} uitnodigingen verwijderd!`);
      }
      
      // Update UI
      setInvitations(invitations.filter((inv) => !itemsToDelete.includes(inv.id)));
      setSelectedInvitations([]);
      setDeleteConfirmDialog(false);
      setItemsToDelete([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kon uitnodigingen niet verwijderen");
    } finally {
      setLoading(false);
    }
  };

  const toggleInvitationSelection = (invitationId) => {
    setSelectedInvitations(prev => 
      prev.includes(invitationId) 
        ? prev.filter(id => id !== invitationId)
        : [...prev, invitationId]
    );
  };

  const toggleSelectAll = () => {
    const filteredInvitations = getFilteredInvitations();
    if (selectedInvitations.length === filteredInvitations.length) {
      setSelectedInvitations([]);
    } else {
      setSelectedInvitations(filteredInvitations.map(inv => inv.id));
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

  const getFilteredEntries = () => {
    return clockEntries.filter((entry) => {
      if (filterUser && entry.user_id !== filterUser) return false;
      if (filterProject && entry.project_id !== filterProject) return false;
      const entryDate = new Date(entry.clock_in_time).toISOString().split("T")[0];
      if (filterStartDate && entryDate < filterStartDate) return false;
      if (filterEndDate && entryDate > filterEndDate) return false;
      return true;
    });
  };

  const getTotalHours = () => {
    return getFilteredEntries().reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
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
                <p className="text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-md font-medium text-xs">
                    ADMIN
                  </span>{" "}
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSettingsDialog(true)}
                variant="outline"
                className="flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Instellingen
              </Button>
              <Button
                onClick={onLogout}
                data-testid="admin-logout-button"
                variant="outline"
                className="flex items-center gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <LogOut className="w-4 h-4" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            data-testid="tab-overview"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              activeTab === "overview"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            Overzicht
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            data-testid="tab-invitations"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              activeTab === "invitations"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <Mail className="w-4 h-4" />
            Uitnodigingen
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            data-testid="tab-projects"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              activeTab === "projects"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Projecten
          </button>
          <button
            onClick={() => setActiveTab("users")}
            data-testid="tab-users"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              activeTab === "users"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-teal-50 border border-teal-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Medewerkers
          </button>
          <a
            href="/mandagenstaat"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
          >
            <FileText className="w-4 h-4" />
            Mandagenstaat
          </a>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Totaal uren</h3>
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-4xl font-bold">{getTotalHours().toFixed(2)}</p>
                <p className="text-teal-100 mt-1 text-sm">
                  {getFilteredEntries().length} registraties
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Medewerkers
                  </h3>
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">
                  {users.filter((u) => u.role === "employee").length}
                </p>
                <p className="text-gray-600 mt-1 text-sm">Actieve accounts</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Projecten</h3>
                  <Briefcase className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">
                  {projects.length}
                </p>
                <p className="text-gray-600 mt-1 text-sm">Actieve projecten</p>
              </div>
            </div>

            {/* Filters & Export */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    Rapportage & Export
                  </h3>
                  {/* Breadcrumb for detail view */}
                  {detailViewMode && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">/</span>
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full font-medium">
                        {detailViewMode === 'day' && selectedDate && `Dag: ${formatDate(selectedDate)}`}
                        {detailViewMode === 'week' && selectedWeek && `Week ${selectedWeek.weekNum}`}
                      </span>
                      <Button
                        onClick={handleBackToOverview}
                        size="sm"
                        variant="ghost"
                        className="text-teal-600 hover:text-teal-800"
                      >
                        ← Terug naar volledig overzicht
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  onClick={fetchAllData}
                  size="sm"
                  variant="outline"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Verversen
                </Button>
              </div>
              
              {/* Quick Date Presets */}
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => setQuickDateFilter('today')}
                  size="sm"
                  variant="outline"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50"
                >
                  Vandaag
                </Button>
                <Button
                  onClick={() => setQuickDateFilter('week')}
                  size="sm"
                  variant="outline"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50"
                >
                  Deze week
                </Button>
                <Button
                  onClick={() => setQuickDateFilter('month')}
                  size="sm"
                  variant="outline"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50"
                >
                  Deze maand
                </Button>
              </div>

              <div className="grid md:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label className="text-gray-700 font-medium text-sm">
                    Medewerker
                  </Label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger data-testid="filter-user-select" className="mt-1.5 h-10">
                      <SelectValue placeholder="Alle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle medewerkers</SelectItem>
                      {users
                        .filter((u) => u.role === "employee")
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium text-sm">
                    Project
                  </Label>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger data-testid="filter-project-select" className="mt-1.5 h-10">
                      <SelectValue placeholder="Alle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle projecten</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium text-sm">
                    Van datum
                  </Label>
                  <Input
                    type="date"
                    data-testid="filter-start-date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium text-sm">
                    Tot datum
                  </Label>
                  <Input
                    type="date"
                    data-testid="filter-end-date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={applyFilters}
                    data-testid="apply-filters-button"
                    disabled={loading}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    Pas filters toe
                  </Button>
                </div>
              </div>

              {/* Totals Display */}
              {overviewData && (
                <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-teal-900">Totaal uren (gefilterd)</p>
                      <p className="text-2xl font-bold text-teal-700">{overviewData.total_hours}u</p>
                      <p className="text-xs text-teal-600 mt-1">{overviewData.entry_count} registraties</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-teal-900">Uren per project</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(overviewData.hours_per_project || {}).slice(0, 3).map(([project, hours]) => (
                          <p key={project} className="text-xs text-teal-700">
                            {project}: {hours.toFixed(2)}u
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-teal-900">Top medewerkers</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(overviewData.hours_per_user_top10 || {}).slice(0, 3).map(([user, hours]) => (
                          <p key={user} className="text-xs text-teal-700">
                            {user}: {hours.toFixed(2)}u
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleExport}
                  data-testid="export-excel-button"
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  onClick={handleExportAdminPDF}
                  data-testid="export-pdf-button"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Time Entries Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
              <div className="p-6 border-b border-teal-100">
                <h3 className="text-xl font-bold text-gray-900">
                  Alle urenregistraties
                </h3>
              </div>

              {!overviewData && clockEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 text-lg mb-2">Geen data geladen</p>
                  <p className="text-gray-500 text-sm">Klik op "Pas filters toe" om urenregistraties te bekijken</p>
                </div>
              ) : getFilteredEntries().length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Geen uren gevonden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-teal-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Datum 
                          <span className="text-xs text-teal-600 font-normal ml-1">(klik voor dag)</span>
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Medewerker
                          <span className="text-xs text-teal-600 font-normal ml-1">(klik voor GPS)</span>
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Bedrijf
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Start - Eind
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Uren
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Afstand (m)
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Project-match
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredEntries().map((entry) => {
                        const startTime = new Date(entry.clock_in_time).toLocaleTimeString("nl-NL", {hour: '2-digit', minute: '2-digit'});
                        const endTime = entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleTimeString("nl-NL", {hour: '2-digit', minute: '2-digit'}) : '-';
                        const projectMatch = entry.project_match !== undefined ? entry.project_match : null;
                        const distance = entry.distance_to_project_m !== undefined ? Math.round(entry.distance_to_project_m) : null;
                        
                        return (
                          <tr
                            key={entry.id}
                            data-testid={`admin-time-entry-${entry.id}`}
                            className={`hover:bg-teal-50 transition-colors ${
                              projectMatch === false ? "bg-red-50" : entry.location_warning ? "bg-yellow-50" : ""
                            }`}
                          >
                            <td className="px-6 py-4 text-sm">
                              <button
                                onClick={() => {
                                  const entryDate = new Date(entry.clock_in_time).toISOString().split('T')[0];
                                  handleDayClick(entryDate);
                                }}
                                className="text-teal-600 hover:text-teal-800 font-medium underline cursor-pointer"
                                title="Klik om alleen deze dag te tonen"
                              >
                                {formatDate(entry.clock_in_time)}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                onClick={() => {
                                  const entryDate = new Date(entry.clock_in_time).toISOString().split('T')[0];
                                  handleEmployeeClick(entry.user_name, entryDate);
                                }}
                                className="text-teal-600 hover:text-teal-800 font-medium underline"
                                title="Klik om GPS details van deze medewerker op deze dag te zien"
                              >
                                {entry.user_name}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.company}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.project_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {startTime} - {endTime}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-teal-700">
                              {entry.total_hours ? `${entry.total_hours.toFixed(2)}u` : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {distance !== null ? `${distance}m` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {projectMatch === null ? (
                                <span className="text-gray-400 text-xs">-</span>
                              ) : projectMatch === true ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  JA
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                      NEE
                                    </span>
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                  </div>
                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                    <p className="font-semibold mb-1">⚠️ GPS Locatie komt niet overeen</p>
                                    {entry.clock_in_location?.lat && entry.clock_in_location?.lon && (
                                      <>
                                        <p>Ingeklokt GPS: {entry.clock_in_location.lat.toFixed(6)}, {entry.clock_in_location.lon.toFixed(6)}</p>
                                        <p>Afstand tot project: {distance}m</p>
                                        <p className="mt-1 font-medium">Toegestaan: Max 50m</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
              <div className="p-6 border-b border-teal-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Uitnodigingen</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setLoading(true);
                        fetchAllData().finally(() => setLoading(false));
                      }}
                      disabled={loading}
                      variant="outline"
                      className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Ververs
                    </Button>
                    <Button
                      onClick={() => setInviteDialog(true)}
                      data-testid="open-invite-dialog-button"
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nieuwe uitnodiging
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Zoek uitnodigingen op naam of email..."
                  value={invitationSearch}
                  onChange={(e) => setInvitationSearch(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Medewerker uitnodigen</DialogTitle></DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4 mt-4">
                    <div><Label htmlFor="inviteName">Naam</Label>
                      <Input id="inviteName" data-testid="invite-name-input" type="text" value={inviteData.name}
                        onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })} placeholder="Voor- en achternaam" required className="mt-1.5" />
                    </div>
                    <div><Label htmlFor="inviteEmail">E-mailadres</Label>
                      <Input id="inviteEmail" data-testid="invite-email-input" type="email" value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} placeholder="naam@bedrijf.nl" required className="mt-1.5" />
                    </div>
                    <Button type="submit" data-testid="send-invite-button" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      {loading ? "Versturen..." : "Uitnodiging versturen"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              {invitations.length > 0 && selectedInvitations.length > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">
                    {selectedInvitations.length} uitnodiging(en) geselecteerd
                  </span>
                  <Button 
                    onClick={handleBulkDelete}
                    size="sm"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Verwijder geselecteerde
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={getFilteredInvitations().length > 0 && selectedInvitations.length === getFilteredInvitations().length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Naam</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">E-mail</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Aangemaakt</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredInvitations().map((inv) => (
                      <tr key={inv.id} data-testid={`invitation-${inv.id}`} className="hover:bg-teal-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedInvitations.includes(inv.id)}
                            onChange={() => toggleInvitationSelection(inv.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{inv.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{inv.email}</td>
                        <td className="px-6 py-4 text-sm">
                          {inv.used ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Gebruikt</span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Wachtend</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(inv.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!inv.used && (
                              <>
                                <Button onClick={() => handleEditInvitation(inv)} size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button onClick={() => copyInviteLink(inv.token)} data-testid={`copy-invite-${inv.id}`} size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                                  {copied === inv.token ? (<><Check className="w-4 h-4 mr-1" />Gekopieerd</>) : (<><Copy className="w-4 h-4 mr-1" />Kopieer</>)}
                                </Button>
                                <Button onClick={() => handleResendInvite(inv.id)} data-testid={`resend-invite-${inv.id}`} size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                  <Mail className="w-4 h-4 mr-1" />Opnieuw
                                </Button>
                                <Button onClick={() => handleDeleteInvite(inv.id)} data-testid={`delete-invite-${inv.id}`} size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
              <div className="p-6 border-b border-teal-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Projecten beheren</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setLoading(true);
                        fetchAllData().finally(() => setLoading(false));
                      }}
                      disabled={loading}
                      variant="outline"
                      className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Ververs
                    </Button>
                    <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="open-project-dialog" className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />Nieuw project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Project toevoegen</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                      <div><Label htmlFor="projectName">Projectnaam</Label>
                        <Input id="projectName" data-testid="project-name-input" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Bijv. Kantoor renovatie" required className="mt-1.5" />
                      </div>
                      <div><Label htmlFor="projectCompany">Bedrijf</Label>
                        <Input id="projectCompany" data-testid="project-company-input" value={projectForm.company} onChange={(e) => setProjectForm({ ...projectForm, company: e.target.value })} placeholder="Bijv. ABC Bouw BV" required className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="projectLocation">Locatie/Adres</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input 
                            id="projectLocation" 
                            data-testid="project-location-input" 
                            value={projectForm.location} 
                            onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} 
                            placeholder="Bijv. Laan van nieuw-guinea 59 Utrecht" 
                            required 
                          />
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!projectForm.location) {
                                toast.error("Vul eerst een adres in");
                                return;
                              }
                              setLoading(true);
                              try {
                                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(projectForm.location)}&format=json&limit=1`);
                                const data = await response.json();
                                if (data && data.length > 0) {
                                  setPreviewLocation({
                                    lat: data[0].lat,
                                    lon: data[0].lon,
                                    address: projectForm.location
                                  });
                                  setShowLocationPreview(true);
                                  toast.success("Locatie gevonden! Controleer de kaart.");
                                } else {
                                  toast.error("Locatie niet gevonden");
                                }
                              } catch (error) {
                                toast.error("Kon locatie niet ophalen");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Zoek
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label htmlFor="projectLat">GPS Latitude</Label>
                          <Input id="projectLat" data-testid="project-lat-input" type="number" step="any" value={projectForm.latitude} onChange={(e) => setProjectForm({ ...projectForm, latitude: e.target.value })} placeholder="52.3702" className="mt-1.5" />
                        </div>
                        <div><Label htmlFor="projectLon">GPS Longitude</Label>
                          <Input id="projectLon" data-testid="project-lon-input" type="number" step="any" value={projectForm.longitude} onChange={(e) => setProjectForm({ ...projectForm, longitude: e.target.value })} placeholder="4.8952" className="mt-1.5" />
                        </div>
                      </div>
                      {showLocationPreview && previewLocation && (
                        <LocationPreview
                          location={previewLocation}
                          address={previewLocation.address}
                          onConfirm={() => {
                            setProjectForm({
                              ...projectForm,
                              latitude: previewLocation.lat,
                              longitude: previewLocation.lon
                            });
                            setShowLocationPreview(false);
                            toast.success("Locatie bevestigd!");
                          }}
                          onCancel={() => {
                            setShowLocationPreview(false);
                            setPreviewLocation(null);
                          }}
                        />
                      )}
                      <div><Label>Toegestane afstand: {projectForm.location_radius}m</Label>
                        <Slider value={[projectForm.location_radius]} onValueChange={(val) => setProjectForm({ ...projectForm, location_radius: val[0] })} min={50} max={500} step={10} className="mt-2" />
                      </div>
                      <div><Label htmlFor="projectDesc">Beschrijving (optioneel)</Label>
                        <Textarea id="projectDesc" data-testid="project-description-input" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Project omschrijving..." rows={3} className="mt-1.5" />
                      </div>
                      <Button type="submit" data-testid="create-project-button" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                        {loading ? "Aanmaken..." : "Project aanmaken"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                  </div>
                </div>
                <Input
                  placeholder="Zoek projecten..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-teal-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Naam</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Bedrijf</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Locatie</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">GPS</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredProjects().map((project) => (
                        <tr key={project.id} data-testid={`project-row-${project.id}`} className="hover:bg-teal-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-teal-600" />
                              <span className="text-sm font-semibold text-gray-900">{project.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{project.company}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{project.location}</td>
                          <td className="px-6 py-4">
                            {(project.latitude && project.longitude) ? (
                              <div className="flex items-center gap-1 text-xs text-teal-600">
                                <MapPin className="w-3 h-3" />
                                <span>{parseFloat(project.latitude).toFixed(4)}, {parseFloat(project.longitude).toFixed(4)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Geen GPS</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                onClick={() => handleEditProject(project)} 
                                data-testid={`edit-project-${project.id}`} 
                                size="sm" 
                                variant="outline" 
                                className="border-teal-200 text-teal-700 hover:bg-teal-50"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                onClick={() => handleDeleteProject(project.id)} 
                                size="sm" 
                                variant="outline" 
                                className="border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
              <div className="p-6 border-b border-teal-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Medewerkers overzicht</h2>
                  <Button
                    onClick={() => {
                      setLoading(true);
                      fetchAllData().finally(() => setLoading(false));
                    }}
                    disabled={loading}
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Ververs
                  </Button>
                </div>
                <Input
                  placeholder="Zoek medewerkers op naam of email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Naam</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">E-mail</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">BSN</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Geregistreerd</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredUsers().map((u) => (
                      <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-teal-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.bsn ? (
                            <span className="font-mono">{u.bsn}</span>
                          ) : (
                            <span className="text-gray-400 italic">Niet ingevuld</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
                            {u.role === "admin" ? "Admin" : "Medewerker"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(u.created_at).toLocaleDateString("nl-NL")}</td>
                        <td className="px-6 py-4 text-right">
                          {u.role === "employee" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button onClick={() => handleEditUser(u)} data-testid={`edit-user-${u.id}`} size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50" title="Bewerken">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button onClick={() => handleResetUserPassword(u)} size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" title="Wachtwoord resetten">
                                <Lock className="w-4 h-4" />
                              </Button>
                              <Button onClick={() => handleDeleteUser(u.id)} data-testid={`delete-user-${u.id}`} size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" title="Verwijderen">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog open={editProjectDialog} onOpenChange={setEditProjectDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Project bewerken</DialogTitle></DialogHeader>
            {editingProject && (
              <form onSubmit={handleUpdateProject} className="space-y-4 mt-4">
                <div><Label htmlFor="editProjectName">Projectnaam</Label>
                  <Input id="editProjectName" data-testid="edit-project-name-input" value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} required className="mt-1.5" />
                </div>
                <div><Label htmlFor="editProjectCompany">Bedrijf</Label>
                  <Input id="editProjectCompany" data-testid="edit-project-company-input" value={editingProject.company} onChange={(e) => setEditingProject({ ...editingProject, company: e.target.value })} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="editProjectLocation">Locatie/Adres</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input 
                      id="editProjectLocation" 
                      data-testid="edit-project-location-input" 
                      value={editingProject.location} 
                      onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })} 
                      placeholder="Bijv. Laan van nieuw-guinea 59 Utrecht" 
                      required 
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!editingProject.location) {
                          toast.error("Vul eerst een adres in");
                          return;
                        }
                        setLoading(true);
                        try {
                          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editingProject.location)}&format=json&limit=1`);
                          const data = await response.json();
                          if (data && data.length > 0) {
                            setPreviewLocation({
                              lat: data[0].lat,
                              lon: data[0].lon,
                              address: editingProject.location
                            });
                            setShowLocationPreview(true);
                            toast.success("Locatie gevonden! Controleer de kaart.");
                          } else {
                            toast.error("Locatie niet gevonden");
                          }
                        } catch (error) {
                          toast.error("Kon locatie niet ophalen");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Zoek
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="editProjectLat">GPS Latitude</Label>
                    <Input id="editProjectLat" type="number" step="any" value={editingProject.latitude} onChange={(e) => setEditingProject({ ...editingProject, latitude: e.target.value })} placeholder="52.3702" className="mt-1.5" />
                  </div>
                  <div><Label htmlFor="editProjectLon">GPS Longitude</Label>
                    <Input id="editProjectLon" type="number" step="any" value={editingProject.longitude} onChange={(e) => setEditingProject({ ...editingProject, longitude: e.target.value })} placeholder="4.8952" className="mt-1.5" />
                  </div>
                </div>
                {showLocationPreview && previewLocation && (
                  <LocationPreview
                    location={previewLocation}
                    address={previewLocation.address}
                    onConfirm={() => {
                      setEditingProject({
                        ...editingProject,
                        latitude: previewLocation.lat,
                        longitude: previewLocation.lon
                      });
                      setShowLocationPreview(false);
                      toast.success("Locatie bevestigd!");
                    }}
                    onCancel={() => {
                      setShowLocationPreview(false);
                      setPreviewLocation(null);
                    }}
                  />
                )}
                <div><Label>Toegestane afstand: {editingProject.location_radius}m</Label>
                  <Slider value={[editingProject.location_radius]} onValueChange={(val) => setEditingProject({ ...editingProject, location_radius: val[0] })} min={50} max={500} step={10} className="mt-2" />
                </div>
                <div><Label htmlFor="editProjectDesc">Beschrijving</Label>
                  <Textarea id="editProjectDesc" value={editingProject.description || ""} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} rows={3} className="mt-1.5" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" onClick={() => setEditProjectDialog(false)} variant="outline" className="flex-1">Annuleren</Button>
                  <Button type="submit" data-testid="update-project-button" disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                    {loading ? "Bijwerken..." : "Bijwerken"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Medewerker bewerken</DialogTitle></DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
                <div><Label htmlFor="editFirstName">Voornaam</Label>
                  <Input id="editFirstName" data-testid="edit-user-firstname-input" value={editingUser.first_name} onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })} required className="mt-1.5" />
                </div>
                <div><Label htmlFor="editLastName">Achternaam</Label>
                  <Input id="editLastName" data-testid="edit-user-lastname-input" value={editingUser.last_name} onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })} required className="mt-1.5" />
                </div>
                <div><Label htmlFor="editEmail">E-mail</Label>
                  <Input id="editEmail" data-testid="edit-user-email-input" type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required className="mt-1.5" />
                </div>
                <div><Label htmlFor="editBsn">BSN (Burgerservicenummer)</Label>
                  <Input 
                    id="editBsn" 
                    data-testid="edit-user-bsn-input" 
                    value={editingUser.bsn || ""} 
                    onChange={(e) => setEditingUser({ ...editingUser, bsn: e.target.value })} 
                    placeholder="Optioneel - 9 cijfers"
                    maxLength={9}
                    className="mt-1.5" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Nodig voor Mandagenstaat export</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" onClick={() => setEditUserDialog(false)} variant="outline" className="flex-1">Annuleren</Button>
                  <Button type="submit" data-testid="update-user-button" disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                    {loading ? "Bijwerken..." : "Bijwerken"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog (Admin Only) */}
        <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Wachtwoord resetten</DialogTitle>
            </DialogHeader>
            {resetPasswordUser && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>Let op:</strong> Je staat op het punt om het wachtwoord te resetten voor:
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-2">
                    {resetPasswordUser.first_name} {resetPasswordUser.last_name} ({resetPasswordUser.email})
                  </p>
                  <p className="text-xs text-orange-700 mt-2">
                    Deze actie wordt gelogd in het audit log met jouw admin gegevens.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Minimaal 6 tekens"
                    required
                    className="mt-1.5" 
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => {
                      setResetPasswordDialog(false);
                      setResetPasswordUser(null);
                      setNewPassword("");
                    }} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button 
                    onClick={confirmResetPassword} 
                    disabled={loading || !newPassword}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading ? "Resetten..." : "Wachtwoord resetten"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
      </main>

      {/* Settings Dialog - Backup & Restore */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instellingen - Backup & Herstel</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Backup Section */}
            <div className="border border-teal-100 rounded-lg p-6 bg-teal-50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-600 rounded-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup maken</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download een volledige backup van alle gegevens (gebruikers, projecten, uren, uitnodigingen).
                  </p>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await axios.get(
                          `${API}/admin/backup/export`,
                          {
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                            responseType: 'blob'
                          }
                        );
                        
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        const filename = response.headers['content-disposition']?.split('filename=')[1] || 'backup.json';
                        link.setAttribute('download', filename);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        
                        toast.success("Backup succesvol gedownload!");
                      } catch (error) {
                        console.error("Backup export error:", error);
                        toast.error("Kon backup niet maken");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? "Bezig..." : "Download Backup"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Restore Section */}
            <div className="border border-orange-100 rounded-lg p-6 bg-orange-50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-600 rounded-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup herstellen</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Importeer een eerder gemaakte backup. Let op: Bestaande gegevens worden niet overschreven.
                  </p>
                  <Input
                    type="file"
                    accept=".json"
                    id="backup-upload-dialog"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setLoading(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const response = await axios.post(
                          `${API}/admin/backup/import`,
                          formData,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                              'Content-Type': 'multipart/form-data'
                            }
                          }
                        );
                        
                        toast.success(`Backup hersteld! Geïmporteerd: ${response.data.imported.users} gebruikers, ${response.data.imported.projects} projecten, ${response.data.imported.clock_entries} uren`);
                        fetchAllData();
                        e.target.value = '';
                      } catch (error) {
                        console.error("Backup import error:", error);
                        toast.error(error.response?.data?.detail || "Kon backup niet herstellen");
                        e.target.value = '';
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="mt-2"
                  />
                  <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded">
                    <p className="text-xs text-orange-800 font-medium">
                      ⚠️ Let op: Gebruik alleen backups van vertrouwde bronnen.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-600 rounded-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Wachtwoord wijzigen</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Wijzig uw admin wachtwoord.
                  </p>
                  <Button
                    onClick={() => {
                      setSettingsDialog(false);
                      setPasswordDialog(true);
                    }}
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Wachtwoord wijzigen
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              onClick={() => setSettingsDialog(false)}
              variant="outline"
            >
              Sluiten
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                data-testid="admin-old-password-input"
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
                data-testid="admin-new-password-input"
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
                data-testid="admin-confirm-password-input"
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
                data-testid="admin-save-password-button"
                disabled={loading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Invitation Dialog */}
      <Dialog open={!!editingInvitation} onOpenChange={() => setEditingInvitation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uitnodiging bewerken</DialogTitle>
          </DialogHeader>
          {editingInvitation && (
            <form onSubmit={handleUpdateInvitation} className="space-y-4 mt-4">
              <div>
                <Label>Email (niet wijzigbaar)</Label>
                <Input
                  value={editingInvitation.email}
                  disabled
                  className="mt-1.5 bg-gray-50"
                />
              </div>
              <div>
                <Label>Naam</Label>
                <Input
                  value={editingInvitation.name}
                  onChange={(e) => setEditingInvitation({...editingInvitation, name: e.target.value})}
                  placeholder="Voor- en achternaam"
                  required
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setEditingInvitation(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verwijderen bevestigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Weet je zeker dat je {itemsToDelete.length === 1 ? 'deze uitnodiging' : `deze ${itemsToDelete.length} uitnodigingen`} wilt verwijderen?
            </p>
            <p className="text-sm text-red-600 font-medium">
              Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => {
                  setDeleteConfirmDialog(false);
                  setItemsToDelete([]);
                }}
                variant="outline"
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Verwijderen..." : "Verwijderen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GPS Detail Modal */}
      <GPSDetailModal
        open={gpsModalOpen}
        onClose={() => setGpsModalOpen(false)}
        employeeName={selectedEmployee}
        entries={selectedEmployeeEntries}
        project={projects.find(p => p.id === selectedEmployeeEntries[0]?.project_id)}
      />
    </div>
  );
}