import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import L from 'leaflet';

export default function DashboardMap({ visits }) {
    if (!visits || visits.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl">
                <span className="text-gray-400 font-medium">ไม่มีข้อมูลพิกัดการลงพื้นที่</span>
            </div>
        );
    }

    // Calculate bounds to fit all markers
    const validVisits = visits.filter(v => v.latitude && v.longitude);
    
    if (validVisits.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl">
                <span className="text-gray-400 font-medium">ข้อมูลการเข้าพบไม่มีพิกัด GPS</span>
            </div>
        );
    }

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    validVisits.forEach(v => {
        if (v.latitude < minLat) minLat = v.latitude;
        if (v.latitude > maxLat) maxLat = v.latitude;
        if (v.longitude < minLng) minLng = v.longitude;
        if (v.longitude > maxLng) maxLng = v.longitude;
    });

    // Add padding to bounds
    const bounds = [
        [minLat - 0.01, minLng - 0.01],
        [maxLat + 0.01, maxLng + 0.01]
    ];

    const getIconPrefix = (purpose) => {
        if (purpose === 'pitch') return '🗣️';
        if (purpose === 'inspection') return '📋';
        if (purpose === 'collection') return '💰';
        return '📍';
    };

    return (
        <div style={{ zIndex: 1 }} className="h-full w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative">
            <MapContainer bounds={bounds} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {validVisits.map((visit, idx) => (
                    <Marker key={idx} position={[visit.latitude, visit.longitude]}>
                        <Popup>
                            <div className="font-sans min-w-[150px]">
                                <div className="font-bold text-gray-900 border-b pb-1 mb-1 border-gray-100">
                                    {visit.customer_name || visit.customer_code}
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    {new Date(visit.created_at).toLocaleString('th-TH')}
                                </div>
                                <div className="text-sm font-semibold text-blue-700">
                                    {getIconPrefix(visit.purpose)} {visit.sales_person}
                                </div>
                                {visit.notes && <div className="text-xs text-gray-500 mt-1 italic">"{visit.notes}"</div>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
