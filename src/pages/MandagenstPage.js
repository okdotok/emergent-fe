import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, FileText, Calendar, Briefcase } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MandagenstPage({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    project_id: '',
    user_id: '',
    week_number: ''
  });
  
  const [mandagenstData, setMandagenstData] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [projectsRes, usersRes] = await Promise.all([
        axios.get(`${API}/projects`, { headers }),
        axios.get(`${API}/users`, { headers })
      ]);
      setProjects(projectsRes.data || []);
      setUsers((usersRes.data || []).filter(u => u.role === 'employee'));
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Kon gegevens niet laden');
    }
  };
  
  const handleGenerate = async () => {
    if (!filters.start_date || !filters.end_date || !filters.project_id) {
      toast.error('Vul minimaal periode en project in');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      params.append('project_id', filters.project_id);
      if (filters.user_id) params.append('user_id', filters.user_id);
      
      const response = await axios.get(`${API}/admin/mandagenstaat?${params.toString()}`, { headers });
      setMandagenstData(response.data);
      toast.success('Mandagenstaat gegenereerd');
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error.response?.data?.detail || 'Kon mandagenstaat niet genereren');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportPDF = async () => {
    if (!mandagenstData) {
      toast.error('Genereer eerst een mandagenstaat');
      return;
    }
    
    setLoading(true);
    
    // Create abort controller for cleanup
    const abortController = new AbortController();
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/pdf'
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      params.append('project_id', filters.project_id);
      if (filters.user_id && filters.user_id !== 'all') params.append('user_id', filters.user_id);
      
      const response = await axios.get(`${API}/admin/mandagenstaat/export/pdf?${params.toString()}`, {
        responseType: 'blob',
        headers,
        signal: abortController.signal,
        validateStatus: function (status) {
          return status >= 200 && status < 600; // Accept all HTTP statuses
        }
      });
      
      // Check if response is successful
      if (response.status !== 200) {
        // Handle error response from blob
        let errorMsg = 'PDF export mislukt';
        
        try {
          // Try to parse blob as JSON error
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch (parseError) {
          // If parsing fails, use generic message with status
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMsg);
      }
      
      // Verify we received a PDF
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('pdf') && response.data.size < 1000) {
        // Might be an error message disguised as blob
        const text = await response.data.text();
        throw new Error(text || 'Ongeldig PDF bestand ontvangen');
      }
      
      // Create download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from header or generate default
      let filename = `Mandagenstaat_${filters.start_date.substring(0, 7)}_Export.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }, 100);
      
      toast.success('PDF succesvol gedownload');
      
    } catch (error) {
      // Clean error handling without accessing responseText
      console.error('PDF download error:', error);
      
      let errorMsg = 'Kon PDF niet downloaden';
      
      // Check for custom error message
      if (error.message && !error.message.includes('Network Error')) {
        errorMsg = error.message;
      } 
      // Check for HTTP error without trying to access response body
      else if (error.response?.status) {
        errorMsg = `Server fout (${error.response.status})`;
      }
      // Check for network/abort errors
      else if (error.name === 'AbortError') {
        errorMsg = 'Download geannuleerd';
      }
      else if (error.code === 'ERR_NETWORK') {
        errorMsg = 'Netwerkfout - controleer je internetverbinding';
      }
      
      toast.error(errorMsg);
      
    } finally {
      setLoading(false);
      abortController.abort(); // Ensure request is cleaned up
    }
  };

  const handleExportExcel = async () => {
    if (!mandagenstData) {
      toast.error('Genereer eerst een mandagenstaat');
      return;
    }
    
    setLoading(true);
    
    // Create abort controller for cleanup
    const abortController = new AbortController();
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      params.append('project_id', filters.project_id);
      if (filters.user_id && filters.user_id !== 'all') params.append('user_id', filters.user_id);
      
      const response = await axios.get(`${API}/admin/mandagenstaat/export/excel?${params.toString()}`, {
        responseType: 'blob',
        headers,
        signal: abortController.signal,
        validateStatus: function (status) {
          return status >= 200 && status < 600; // Accept all HTTP statuses
        }
      });
      
      // Check if response is successful
      if (response.status !== 200) {
        // Handle error response from blob
        let errorMsg = 'Excel export mislukt';
        
        try {
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch (parseError) {
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMsg);
      }
      
      // Verify Excel content type
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('spreadsheet') && !contentType.includes('excel') && response.data.size < 1000) {
        const text = await response.data.text();
        throw new Error(text || 'Ongeldig Excel bestand ontvangen');
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from header or generate default
      let filename = `Mandagenstaat_${filters.start_date.substring(0, 7)}_Export.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }, 100);
      
      toast.success('Excel succesvol gedownload');
      
    } catch (error) {
      // Clean error handling without accessing responseText
      console.error('Excel download error:', error);
      
      let errorMsg = 'Kon Excel niet downloaden';
      
      if (error.message && !error.message.includes('Network Error')) {
        errorMsg = error.message;
      } 
      else if (error.response?.status) {
        errorMsg = `Server fout (${error.response.status})`;
      }
      else if (error.name === 'AbortError') {
        errorMsg = 'Download geannuleerd';
      }
      else if (error.code === 'ERR_NETWORK') {
        errorMsg = 'Netwerkfout - controleer je internetverbinding';
      }
      
      toast.error(errorMsg);
      
    } finally {
      setLoading(false);
      abortController.abort(); // Ensure request is cleaned up
    }
  };

  const handleWeekNumberChange = (weekNum) => {
    if (!weekNum || weekNum === "none") {
      setFilters({...filters, week_number: '', start_date: '', end_date: ''});
      return;
    }
    
    const year = new Date().getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (parseInt(weekNum) - 1) * 7;
    const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    
    // Adjust to Monday
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diff);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    setFilters({
      ...filters,
      week_number: weekNum,
      start_date: weekStart.toISOString().split('T')[0],
      end_date: weekEnd.toISOString().split('T')[0]
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mandagenstaat</h1>
              <p className="text-sm text-gray-600">Administrator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.location.href = '/'} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              Terug naar Dashboard
            </Button>
            <Button onClick={onLogout} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              Uitloggen
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
          
          <div className="mb-4">
            <Label className="text-gray-700 font-medium text-sm mb-2 block">
              Weeknummer (optioneel - vult automatisch datums in)
            </Label>
            <Select value={filters.week_number || "none"} onValueChange={handleWeekNumberChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecteer weeknummer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen week geselecteerd</SelectItem>
                {Array.from({length: 52}, (_, i) => i + 1).map(week => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-gray-700 font-medium text-sm mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Van datum (verplicht)
              </Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({...filters, start_date: e.target.value, week_number: ''})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium text-sm mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Tot datum (verplicht)
              </Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({...filters, end_date: e.target.value, week_number: ''})}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-gray-700 font-medium text-sm mb-2 block">
                <Briefcase className="w-4 h-4 inline mr-1" />
                Project (verplicht)
              </Label>
              <Select value={filters.project_id} onValueChange={(value) => setFilters({...filters, project_id: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecteer project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 font-medium text-sm mb-2 block">
                Medewerker (optioneel)
              </Label>
              <Select value={filters.user_id || "all"} onValueChange={(value) => setFilters({...filters, user_id: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Alle medewerkers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            {loading ? 'Genereren...' : 'Genereer Mandagenstaat'}
          </Button>
        </div>
        
        {/* Results */}
        {mandagenstData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Resultaat</h2>
              <div className="flex gap-2">
                <Button onClick={handleExportPDF} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={handleExportExcel} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            
            {/* Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-teal-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Project</p>
                <p className="text-lg font-semibold text-gray-900">{mandagenstData.project.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bedrijf</p>
                <p className="text-lg font-semibold text-gray-900">{mandagenstData.project.company}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Totaal uren</p>
                <p className="text-lg font-semibold text-teal-700">{mandagenstData.total_hours.toFixed(2)}u</p>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-teal-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Datum</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Medewerker</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Uren</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(mandagenstData.grouped_data).sort().map(([date, users]) =>
                    Object.entries(users).map(([userName, data], idx) => (
                      <tr key={`${date}-${userName}`} className="hover:bg-teal-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{userName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-teal-700">{data.hours.toFixed(1)}u</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{data.notes.join(', ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="2" className="px-6 py-4 text-sm font-semibold text-gray-900">Totaal per medewerker:</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                  {Object.entries(mandagenstData.user_totals).map(([userName, total]) => (
                    <tr key={userName}>
                      <td className="px-6 py-2"></td>
                      <td className="px-6 py-2 text-sm text-gray-900">{userName}</td>
                      <td className="px-6 py-2 text-sm font-semibold text-teal-700">{total.toFixed(1)}u</td>
                      <td className="px-6 py-2"></td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
