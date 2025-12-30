import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle } from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function GPSDetailModal({ open, onClose, employeeName, entries, project }) {
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  
  if (!entries || entries.length === 0) return null;
  
  const filteredEntries = showOnlyMismatches 
    ? entries.filter(e => e.project_match === false)
    : entries;
  
  // Calculate center point for map
  const centerLat = project?.latitude || entries[0]?.clock_in_location?.latitude || 52.0907;
  const centerLon = project?.longitude || entries[0]?.clock_in_location?.longitude || 5.1214;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            GPS Details - {employeeName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Controls */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyMismatches}
                onChange={(e) => setShowOnlyMismatches(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Toon alleen afwijkingen (NEE)
              </span>
            </label>
            <div className="ml-auto text-sm text-gray-600">
              {filteredEntries.length} van {entries.length} entries
            </div>
          </div>
          
          {/* Map */}
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            <MapContainer 
              center={[centerLat, centerLon]} 
              zoom={14} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Project location marker */}
              {project?.latitude && project?.longitude && (
                <>
                  <Marker position={[project.latitude, project.longitude]}>
                    <Popup>
                      <div className="font-semibold">{project.name}</div>
                      <div className="text-sm">Project Locatie</div>
                    </Popup>
                  </Marker>
                  <Circle 
                    center={[project.latitude, project.longitude]} 
                    radius={250} 
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                  />
                </>
              )}
              
              {/* Employee entries markers */}
              {filteredEntries.map((entry, idx) => {
                const lat = entry.clock_in_location?.latitude;
                const lon = entry.clock_in_location?.longitude;
                if (!lat || !lon) return null;
                
                const isMatch = entry.project_match === true;
                
                return (
                  <Marker 
                    key={entry.id} 
                    position={[lat, lon]}
                    icon={L.divIcon({
                      className: 'custom-marker',
                      html: `<div style="background-color: ${isMatch ? 'green' : 'red'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                      iconSize: [12, 12]
                    })}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{new Date(entry.clock_in_time).toLocaleDateString('nl-NL')}</div>
                        <div>Project: {entry.project_name}</div>
                        <div>Afstand: {entry.distance_to_project_m ? Math.round(entry.distance_to_project_m) : 0}m</div>
                        <div className={isMatch ? 'text-green-600' : 'text-red-600'}>Match: {isMatch ? 'JA' : 'NEE'}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          
          {/* Entry List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-teal-50 px-4 py-2 font-semibold text-sm text-gray-700">
              Registraties Detail
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Datum/Tijd</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Project</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Locatie (lat, lon)</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Afstand (m)</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => {
                    const lat = entry.clock_in_location?.latitude;
                    const lon = entry.clock_in_location?.longitude;
                    const distance = entry.distance_to_project_m;
                    const isMatch = entry.project_match === true;
                    
                    return (
                      <tr key={entry.id} className={isMatch ? '' : 'bg-red-50'}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Date(entry.clock_in_time).toLocaleString('nl-NL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{entry.project_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {lat && lon ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {distance !== null && distance !== undefined ? Math.round(distance) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {entry.project_match === null ? (
                            <span className="text-gray-400">-</span>
                          ) : isMatch ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              JA
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                NEE
                              </span>
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white">
              Sluiten
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
