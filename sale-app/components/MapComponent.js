import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

export default function MapComponent({ lat, lng, popupText }) {
    if (!lat || !lng) return null;

    const position = [lat, lng];

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', zIndex: 1 }} className="border border-gray-200 shadow-sm relative">
            <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        <div className="font-sans font-medium">
                            {popupText || "ตำแหน่งของคุณอยู่ที่นี่ 📍"}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
