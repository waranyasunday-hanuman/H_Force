import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

export default function MapComponent({ lat, lng, popupText, markers = [], height = '300px' }) {
    if (!lat || !lng) return null;

    const position = [lat, lng];

    return (
        <div style={{ height: height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden', zIndex: 1 }} className="border border-gray-200 shadow-sm relative">
            <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {markers.length > 0 ? (
                    markers.map((m, i) => (
                        <Marker key={i} position={[m.lat, m.lng]}>
                            <Popup>
                                <div className="font-sans font-medium">
                                    <p className="font-bold">{m.title}</p>
                                    <p className="text-xs text-slate-500">{m.label}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))
                ) : (
                    <Marker position={position}>
                        <Popup>
                            <div className="font-sans font-medium">
                                {popupText || "ตำแหน่งของคุณอยู่ที่นี่ 📍"}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
