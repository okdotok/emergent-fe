import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin } from 'lucide-react';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LocationPreview({ location, address, onConfirm, onCancel }) {
  if (!location) return null;

  return (
    <div className="mt-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Locatie Preview</h3>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-700 mb-1"><strong>Adres:</strong> {address}</p>
        <p className="text-sm text-gray-600">
          <strong>Coördinaten:</strong> {parseFloat(location.lat).toFixed(6)}, {parseFloat(location.lon).toFixed(6)}
        </p>
      </div>

      <div className="h-64 rounded-lg overflow-hidden border-2 border-gray-300 mb-3">
        <MapContainer 
          center={[parseFloat(location.lat), parseFloat(location.lon)]} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          key={`${location.lat}-${location.lon}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[parseFloat(location.lat), parseFloat(location.lon)]}>
            <Popup>
              <div className="text-sm">
                <strong>{address}</strong>
                <br />
                {parseFloat(location.lat).toFixed(6)}, {parseFloat(location.lon).toFixed(6)}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onConfirm}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 mr-2" />
          Bevestig Locatie
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4 mr-2" />
          Annuleren
        </Button>
      </div>
    </div>
  );
}
