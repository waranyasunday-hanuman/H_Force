import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import dynamic from 'next/dynamic';
import Swal from 'sweetalert2';

const PURPOSE_CONFIG = {
    "นำเสนอสินค้า": { 
        gradient: "from-emerald-600 to-teal-700", 
        glowColor: "rgba(16,185,129,0.6)",
        light: "bg-emerald-50 text-emerald-600",
        label: "เสนอขาย",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    "ตรวจเยี่ยม": { 
        gradient: "from-indigo-600 to-violet-700", 
        glowColor: "rgba(99,102,241,0.6)",
        light: "bg-indigo-50 text-indigo-600",
        label: "ตรวจร้าน",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    "เก็บเงิน": { 
        gradient: "from-amber-600 to-orange-700", 
        glowColor: "rgba(245,158,11,0.6)",
        light: "bg-amber-50 text-amber-600",
        label: "เก็บเงิน",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    },
    "ส่งของ": { 
        gradient: "from-blue-600 to-sky-700", 
        glowColor: "rgba(59,130,246,0.6)",
        light: "bg-blue-50 text-blue-600",
        label: "ส่งของ",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    },
    "วันหยุดประจำสัปดาห์": { 
        gradient: "from-slate-400 to-slate-500", 
        glowColor: "rgba(148,163,184,0.6)",
        light: "bg-slate-50 text-slate-500",
        label: "วันหยุด",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002-2z" /></svg>
    },
    "ทั่วไป": { 
        gradient: "from-slate-600 to-slate-700", 
        glowColor: "rgba(100,116,139,0.6)",
        light: "bg-slate-50 text-slate-600",
        label: "ทั่วไป",
        icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
};
const DEFAULT_CFG = { gradient: "from-slate-500 to-slate-600", glowColor: "rgba(148,163,184,0.5)", light: "bg-slate-50 text-slate-500", label: "อื่นๆ", icon: "📍" };

const MapComponent = dynamic(() => import('../components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-slate-100 animate-pulse rounded-[2rem] flex items-center justify-center text-slate-400 font-medium">📍 กำลังโหลดแผนที่...</div>
});

export default function SaleWorkPage() {
    const router = useRouter();

    const toLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'calendar' | 'history'
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [currentDateTime, setCurrentDateTime] = useState("");
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    
    // GPS & Camera
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);

    // Data
    const [plans, setPlans] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [visitPurpose, setVisitPurpose] = useState("General");
    const [notes, setNotes] = useState("");
    const [sliderValue, setSliderValue] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [checkinRecords, setCheckinRecords] = useState({});
    const [checkinPhotos, setCheckinPhotos] = useState([]);
    const [hasSO, setHasSO] = useState({});
    
    // Operations State
    const [selectedPurposes, setSelectedPurposes] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [checkoutLocation, setCheckoutLocation] = useState(null);
    const [gettingCheckoutLocation, setGettingCheckoutLocation] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [inspectionData, setInspectionData] = useState({ stock: false, display: false, competitor: false, photos: [] });
    const [collectionData, setCollectionData] = useState({ amount: 0, method: 'cash' });
    const [otherComment, setOtherComment] = useState("");
    
    useEffect(() => {
        if (selectedPlan && step === 1) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedPlan, step]);

    const scrollRefs = useRef({});
    const detailScrollRef = useRef(null);
    const scrollRow = (date, direction) => {
        const el = scrollRefs.current[date];
        if (el) {
            el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                fetchPlans(session.user.id);
                fetchHistory(session.user.id);
                fetchOrders(session.user.id);
            }
        };
        init();

        const updateTime = () => {
            const now = new Date();
            setCurrentDateTime(now.toLocaleString('th-TH', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        
        fetchCustomers();

        return () => {
            clearInterval(interval);
            stopCamera();
        };
    }, []);

    const fetchPlans = async (userId) => {
        const { data, error } = await supabase
            .from('sales_plans')
            .select('*')
            .eq('user_id', userId)
            .order('plan_date', { ascending: true });
        if (data) setPlans(data);
    };

    const fetchHistory = async (userId) => {
        const { data, error } = await supabase
            .from('visits')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (data) setHistory(data);
    };

    const fetchOrders = async (userId) => {
        const { data, error } = await supabase
            .from('sales_orders')
            .select('customer_code, order_date, created_at');
            
        if (data) {
            const status = {};
            data.forEach(so => {
                if (so.customer_code) {
                    status[so.customer_code] = true;
                }
            });
            setHasSO(status);
        }
    };

    useEffect(() => {
        if (history && history.length > 0) {
            const records = {};
            history.forEach(v => {
                if (v.plan_id && !records[v.plan_id]) {
                    let photos = [];
                    try {
                        photos = JSON.parse(v.photo_url);
                        if (!Array.isArray(photos)) photos = [v.photo_url];
                    } catch(e) {
                        if (v.photo_url) photos = [v.photo_url];
                    }
                    records[v.plan_id] = {
                        location: { lat: v.latitude, lng: v.longitude },
                        timestamp: new Date(v.created_at).toLocaleString('th-TH', { 
                            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                        }),
                        photos: photos
                    };
                }
            });
            setCheckinRecords(prev => ({...prev, ...records}));
        }
    }, [history]);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.customers) setCustomers(data.customers);
        } catch (e) {
            console.error("Failed to fetch customers", e);
        }
    };

    const getLocation = () => {
        setGettingLocation(true);
        if (!navigator.geolocation) {
            Swal.fire('Error', 'Browser does not support GPS', 'error');
            setGettingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setGettingLocation(false);
            },
            (err) => {
                Swal.fire('Error', 'Please enable GPS location', 'error');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const getCheckoutLocation = () => {
        setGettingCheckoutLocation(true);
        if (!navigator.geolocation) {
            Swal.fire('Error', 'Browser does not support GPS', 'error');
            setGettingCheckoutLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCheckoutLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setGettingCheckoutLocation(false);
            },
            (err) => {
                Swal.fire('Error', 'Please enable GPS location for Check-out', 'error');
                setGettingCheckoutLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
            setCameraOpen(true);
        } catch (err) {
            Swal.fire('Error', 'Cannot access camera', 'error');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraOpen(false);
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            setPhoto(canvasRef.current.toDataURL("image/jpeg", 0.7));
            stopCamera();
        }
    };

    const handleConfirmCheckin = async () => {
        if (!location || checkinPhotos.length === 0) return;
        setLoading(true);
        Swal.fire({
            title: 'กำลังบันทึก Check-in...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const uploadedUrls = [];
            for (let i = 0; i < checkinPhotos.length; i++) {
                const p = checkinPhotos[i];
                const res = await fetch(p);
                const blob = await res.blob();
                const fileName = `checkin_${selectedPlan.id}_${Date.now()}_${i}.jpg`;
                const { data, error } = await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg' });
                if (data) {
                    const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
                    uploadedUrls.push(publicData.publicUrl);
                } else {
                    console.warn("Storage upload failed, falling back to base64 inline", error);
                    uploadedUrls.push(p); // Fallback to base64 if bucket doesn't exist
                }
            }

            const visitData = {
                user_id: user.id,
                customer_type: selectedPlan.customer_code ? 'existing' : 'new',
                customer_name: selectedPlan.customer_name,
                customer_code: selectedPlan.customer_code,
                latitude: location.lat,
                longitude: location.lng,
                photo_url: JSON.stringify(uploadedUrls),
                purpose: selectedPlan.purpose || "General",
                notes: "",
                gps_accuracy: location.accuracy || 0,
                plan_id: selectedPlan.id,
                sales_person: user.email,
                is_completed: false,
                is_out_of_range: false
            };

            const { error: insertError } = await supabase.from('visits').insert([visitData]);
            if (insertError) throw new Error("บันทึกข้อมูลไม่สำเร็จ: " + insertError.message);

            const { error: updateError } = await supabase.from('sales_plans').update({ status: 'completed' }).eq('id', selectedPlan.id);
            if (updateError) throw new Error("อัปเดตสถานะงานไม่สำเร็จ: " + updateError.message);

            setCheckinRecords(prev => ({
                ...prev,
                [selectedPlan.id]: {
                    location,
                    photos: uploadedUrls,
                    timestamp: currentDateTime
                }
            }));
            
            setStep(1);
            fetchHistory(user.id);
            fetchPlans(user.id);
            
            Swal.fire({
                title: 'Check-in สำเร็จ!',
                text: 'บันทึกเวลา พิกัด และรูปถ่ายเรียบร้อยแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-3xl' }
            });
        } catch (err) {
            Swal.fire('Error', 'Check-in failed: ' + err.message, 'error');
        }
        setLoading(false);
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getPurposeBadge = (purpose) => {
        const cfg = PURPOSE_CONFIG[purpose] || DEFAULT_CFG;
        return (
            <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${cfg.light}`}>
                {cfg.label}
            </div>
        );
    };

    const renderList = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const next7DaysList = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            next7DaysList.push(toLocalDateStr(date));
        }

        const grouped = plans.reduce((acc, p) => {
            if (p.status === 'cancelled') return acc;
            
            // ถ้าเช็คอินแล้ว (มีใน checkinRecords) หรือสถานะเป็น completed ให้ถือว่า DONE และไม่ต้องโชว์ในหน้าแผนงาน
            const isDone = checkinRecords[p.id] || p.status === 'completed';
            if (isDone) return acc;
            
            if (!acc[p.plan_date]) acc[p.plan_date] = [];
            acc[p.plan_date].push(p);
            return acc;
        }, {});

        const formatThaiDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const isToday = dateObj.getTime() === today.getTime();
            if (isToday) return 'วันนี้';
            return dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        };

        return (
            <div className="space-y-8 animate-fade-up">
                {next7DaysList.map((date, idx) => {
                    const dayPlans = grouped[date] || [];
                    const isToday = idx === 0;
                    return (
                        <div key={date} className="relative">
                            <div className="px-4 mb-3 flex items-end justify-between gap-3">
                                <h3 
                                    suppressHydrationWarning
                                    className={`font-black tracking-tight ${isToday ? 'text-3xl text-slate-900' : 'text-xs text-slate-400 uppercase tracking-[0.2em]'}`}
                                >
                                    {mounted ? formatThaiDate(date) : ''}
                                </h3>
                                <div className={`h-px bg-slate-100 flex-1 mb-2 ${isToday ? 'opacity-0' : 'opacity-100'}`}></div>
                                {dayPlans.length > 0 && (
                                    <span className={`font-bold ${isToday ? 'text-rose-500 text-sm mb-2' : 'text-slate-300 text-[10px]'}`}>{dayPlans.length} รายการ</span>
                                )}
                            </div>

                            <div className="relative group/row">
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 to-transparent z-20 pointer-events-none" />
                                <button 
                                    onClick={() => scrollRow(date, 'left')}
                                    className="absolute left-0 top-[85px] -translate-y-1/2 w-10 h-16 bg-gradient-to-r from-white/90 to-transparent flex items-center justify-start pl-2 text-slate-400 hover:text-rose-500 transition-all opacity-0 group-hover/row:opacity-100 z-20 cursor-pointer hidden md:flex"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                </button>

                                <div 
                                    ref={el => scrollRefs.current[date] = el}
                                    className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x"
                                >
                                    {dayPlans.length > 0 ? (
                                        dayPlans.sort((a,b) => (a.plan_time||"99:99").localeCompare(b.plan_time||"99:99")).map((plan) => {
                                            const cfg = PURPOSE_CONFIG[plan.purpose] || DEFAULT_CFG;
                                            const isCompleted = plan.status === 'completed';
                                            return (
                                                <div 
                                                    key={plan.id} 
                                                    onClick={() => setSelectedPlan(plan)}
                                                    className={`snap-start shrink-0 w-[170px] h-[170px] rounded-xl p-5 relative overflow-hidden card-glow active:scale-95 group/card cursor-pointer transition-all duration-500 shadow-md shadow-slate-200/50 group-hover/row:opacity-30 group-hover/row:blur-[3px] group-hover/row:brightness-[0.4] hover:!opacity-100 hover:!blur-none hover:!scale-105 hover:!brightness-100 z-10 hover:z-30 ${isCompleted ? 'bg-slate-300' : `bg-gradient-to-br ${cfg.gradient}`}`}
                                                >
                                                    {isCompleted && (
                                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg z-20 shadow-sm">
                                                            DONE
                                                        </div>
                                                    )}
                                                    {!isCompleted && <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D55] to-[#E11D48] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-xl" />}
                                                    <div className={`absolute -bottom-4 -right-4 opacity-10 text-white scale-[1.5] group-hover/card:scale-[2] transition-all duration-700 ${isCompleted ? 'text-slate-500' : ''}`}>
                                                        {cfg.icon}
                                                    </div>
                                                    <div className={`relative h-full flex flex-col transition-colors duration-500 ${isCompleted ? 'text-slate-600' : 'text-white'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className={`w-8 h-8 backdrop-blur-xl rounded-lg flex items-center justify-center shadow-sm transition-all ${isCompleted ? 'bg-slate-400/20 border-slate-400/20' : 'bg-white/20 border-white/20'}`}>
                                                                <div className="scale-75">{cfg.icon}</div>
                                                            </div>
                                                            {plan.plan_time && (
                                                                <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black border border-white/5 uppercase tracking-tighter transition-all">
                                                                    {plan.plan_time.substring(0, 5)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`mb-1 inline-block px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all ${isCompleted ? 'bg-slate-400/10 border-slate-400/10' : 'bg-white/10 border-white/5'}`}>{cfg.label}</div>
                                                            <h4 className="text-[15px] font-black tracking-tight leading-[1.1] drop-shadow-md line-clamp-3">{plan.customer_name}</h4>
                                                        </div>
                                                        <div className="opacity-60">
                                                            <p className="text-[8px] font-bold uppercase tracking-widest truncate">
                                                                {plan.contact_name || '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="w-full h-16 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center px-6">
                                            {isToday && plans.some(p => p.plan_date === date && (checkinRecords[p.id] || p.status === 'completed')) ? (
                                                <div className="text-center animate-fade-in">
                                                    <span className="text-lg block mb-0.5">🎉</span>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ดำเนินการครบทุก Task แล้ว</p>
                                                </div>
                                            ) : (
                                                <div className="text-center opacity-40">
                                                    <span className="text-lg block mb-0.5">📅</span>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ไม่มี Task สำหรับวันนี้</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => scrollRow(date, 'right')}
                                    className="absolute right-0 top-[85px] -translate-y-1/2 w-10 h-16 bg-gradient-to-l from-white/90 to-transparent flex items-center justify-end pr-2 text-slate-400 hover:text-rose-500 transition-all opacity-0 group-hover/row:opacity-100 z-20 cursor-pointer hidden md:flex"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderHistory = () => {
        // Group history by date (YYYY-MM-DD)
        const groupedHistory = history.reduce((acc, v) => {
            const d = new Date(v.created_at);
            const dateStr = toLocalDateStr(d);
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(v);
            return acc;
        }, {});

        // Get unique sorted dates descending
        const dates = Object.keys(groupedHistory).sort((a, b) => new Date(b) - new Date(a));

        const formatThaiDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (dateObj.getTime() === today.getTime()) return 'วันนี้';
            return dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        };

        return (
            <div className="space-y-8 animate-fade-up">
                {dates.length === 0 && (
                    <div className="px-4">
                        <div className="w-full h-24 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                            ไม่มีประวัติการเข้าพบ
                        </div>
                    </div>
                )}
                {dates.map((date, idx) => {
                    const dayVisits = groupedHistory[date];
                    const isToday = formatThaiDate(date) === 'วันนี้';
                    
                    return (
                        <div key={date} className="relative">
                            <div className="px-4 mb-3 flex items-end justify-between gap-3">
                                <h3 className={`font-black tracking-tight ${isToday ? 'text-3xl text-slate-900' : 'text-xs text-slate-400 uppercase tracking-[0.2em]'}`}>
                                    {formatThaiDate(date)}
                                </h3>
                                <div className={`h-px bg-slate-100 flex-1 mb-2 ${isToday ? 'opacity-0' : 'opacity-100'}`}></div>
                                <span className={`font-bold ${isToday ? 'text-rose-500 text-sm mb-2' : 'text-slate-300 text-[10px]'}`}>{dayVisits.length} รายการ</span>
                            </div>

                            <div className="relative group/row">
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 to-transparent z-20 pointer-events-none" />
                                
                                <button 
                                    onClick={() => scrollRow(`hist-${date}`, 'left')}
                                    className="absolute left-0 top-[85px] -translate-y-1/2 w-10 h-16 bg-gradient-to-r from-white/90 to-transparent flex items-center justify-start pl-2 text-slate-400 hover:text-rose-500 transition-all opacity-0 group-hover/row:opacity-100 z-20 cursor-pointer hidden md:flex"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                </button>

                                <div 
                                    ref={el => scrollRefs.current[`hist-${date}`] = el}
                                    className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x"
                                >
                                    {dayVisits.map((visit) => {
                                        const cfg = PURPOSE_CONFIG[visit.purpose] || DEFAULT_CFG;
                                        
                                        return (
                                            <div 
                                                key={visit.id} 
                                                onClick={() => {
                                                    let matchedPlan = plans.find(p => p.id === visit.plan_id);
                                                    if (!matchedPlan) {
                                                        matchedPlan = {
                                                            id: visit.plan_id || visit.id,
                                                            customer_name: visit.customer_name,
                                                            customer_code: visit.customer_code,
                                                            purpose: visit.purpose,
                                                            plan_date: date,
                                                            status: 'completed',
                                                            notes: visit.notes
                                                        };
                                                    } else {
                                                        matchedPlan = { ...matchedPlan, status: 'completed' };
                                                    }
                                                    setSelectedPlan(matchedPlan);
                                                }}
                                                className={`snap-start shrink-0 w-[170px] h-[170px] rounded-xl p-5 relative overflow-hidden card-glow active:scale-95 group/card cursor-pointer transition-all duration-500 shadow-md shadow-slate-200/50 group-hover/row:opacity-30 group-hover/row:blur-[3px] group-hover/row:brightness-[0.4] hover:!opacity-100 hover:!blur-none hover:!scale-105 hover:!brightness-100 z-10 hover:z-30 bg-slate-300`}
                                            >
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg z-20 shadow-sm">
                                                    DONE
                                                </div>
                                                <div className={`absolute -bottom-4 -right-4 opacity-10 scale-[1.5] group-hover/card:scale-[2] transition-all duration-700 text-slate-500`}>
                                                    {cfg.icon}
                                                </div>
                                                <div className={`relative h-full flex flex-col transition-colors duration-500 text-slate-600`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className={`w-8 h-8 backdrop-blur-xl rounded-lg flex items-center justify-center shadow-sm transition-all bg-slate-400/20 border-slate-400/20`}>
                                                            <div className="scale-75">{cfg.icon}</div>
                                                        </div>
                                                        {visit.created_at && (
                                                            <div className="bg-white/40 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black border border-white/5 uppercase tracking-tighter transition-all">
                                                                {new Date(visit.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`mb-1 inline-block px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all bg-slate-400/10 border-slate-400/10`}>{cfg.label}</div>
                                                        <h4 className="text-[15px] font-black tracking-tight leading-[1.1] drop-shadow-md line-clamp-3">{visit.customer_name}</h4>
                                                    </div>
                                                    <div className="opacity-60">
                                                        <p className="text-[8px] font-bold uppercase tracking-widest truncate">
                                                            {visit.is_out_of_range ? '⚠️ นอกระยะ' : '✅ เช็คอินแล้ว'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button 
                                    onClick={() => scrollRow(`hist-${date}`, 'right')}
                                    className="absolute right-0 top-[85px] -translate-y-1/2 w-10 h-16 bg-gradient-to-l from-white/90 to-transparent flex items-center justify-end pr-2 text-slate-400 hover:text-rose-500 transition-all opacity-0 group-hover/row:opacity-100 z-20 cursor-pointer hidden md:flex"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <Layout>
                <div className="max-w-md mx-auto pb-24">
                    <div className="mb-4 pt-2 px-4 flex justify-between items-end">
                        <div>
                            <p className="text-rose-500 font-black text-xl tracking-tighter leading-none mb-0.5">H Force</p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Sale Work</h2>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="text-right leading-tight">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                                <p className="text-xs font-black text-slate-900">{user?.email?.split('@')[0] || 'User'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-200 shrink-0">
                                 <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                            </div>
                        </div>
                    </div>

                    {step === 1 ? (
                        <>
                            <div className="flex gap-2.5 px-4 overflow-x-auto scrollbar-hide mb-10 no-wrap">
                                <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200 scale-105' : 'bg-white text-slate-500 border border-slate-100 shadow-sm'}`}>แผนงาน</button>
                                <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200 scale-105' : 'bg-white text-slate-500 border border-slate-100 shadow-sm'}`}>ประวัติ</button>
                                <button className="px-6 py-2.5 rounded-full text-xs font-black bg-white text-slate-300 border border-slate-50 shadow-sm whitespace-nowrap">ลูกค้าใหม่</button>
                                <button className="px-6 py-2.5 rounded-full text-xs font-black bg-white text-slate-300 border border-slate-50 shadow-sm whitespace-nowrap">ใบเสนอราคา</button>
                            </div>
                            {activeTab === 'list' && renderList()}
                            {activeTab === 'history' && renderHistory()}
                        </>
                    ) : (
                        <div className="animate-slide-in px-4">
                            <div className="flex items-center gap-5 mb-8">
                                <button onClick={() => setStep(1)} className="w-12 h-12 bg-white flex items-center justify-center rounded-2xl text-slate-600 hover:scale-105 transition-transform shadow-lg border border-slate-100">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">บันทึกการเข้าพบ</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">1</span> GPS Position
                                        </h4>
                                        {location && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">แม่นยำ: {location.accuracy.toFixed(1)}ม.</span>}
                                    </div>
                                    {location ? (
                                        <div className="h-[250px] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl relative">
                                            <MapComponent lat={location.lat} lng={location.lng} />
                                            <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black text-emerald-600 shadow-xl flex items-center gap-2 border border-white">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Verified Location
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={getLocation} disabled={gettingLocation} className="w-full py-16 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50 text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all flex flex-col items-center group shadow-sm hover:shadow-xl">
                                            <span className="text-5xl mb-4 transform group-hover:scale-125 transition-transform">{gettingLocation ? '🛰️' : '📍'}</span>
                                            <span className="font-black text-sm tracking-wide">{gettingLocation ? 'กำลังค้นหาตำแหน่ง...' : 'แตะเพื่อสแกนพิกัด GPS'}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-rose-100">2</span> Photo Evidence
                                        </h4>
                                    </div>
                                    {!photo ? (
                                        cameraOpen ? (
                                            <div className="relative inline-block w-full">
                                                <video ref={videoRef} autoPlay playsInline className="w-full rounded-[3rem] bg-slate-900 aspect-square object-cover shadow-2xl border-4 border-white"></video>
                                                <button onClick={takePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/30 backdrop-blur-xl border-4 border-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group">
                                                    <div className="w-14 h-14 bg-white rounded-full shadow-inner group-active:scale-90 transition-transform"></div>
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={startCamera} className="w-full py-16 bg-slate-50/50 rounded-[3rem] text-slate-400 border-2 border-dashed border-slate-200 hover:bg-white hover:border-rose-400 hover:text-rose-500 transition-all flex flex-col items-center group shadow-sm hover:shadow-xl">
                                                <span className="text-5xl mb-4 transform group-hover:scale-125 transition-transform">📸</span>
                                                <span className="font-black text-sm tracking-wide">เปิดกล้องถ่ายภาพ</span>
                                            </button>
                                        )
                                    ) : (
                                        <div className="relative inline-block w-full">
                                            <img src={photo} className="w-full rounded-[3rem] shadow-2xl border-8 border-white aspect-square object-cover" />
                                            <button onClick={() => { setPhoto(null); startCamera(); }} className="absolute top-5 right-5 bg-black/50 backdrop-blur-xl text-white w-12 h-12 flex items-center justify-center rounded-full shadow-2xl hover:scale-110 transition-transform font-black text-lg border border-white/20">✕</button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6">
                                    <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-100">3</span> Check-in Info
                                    </h4>
                                    {selectedPlan ? (
                                        <div className={`bg-gradient-to-br ${(PURPOSE_CONFIG[selectedPlan.purpose] || DEFAULT_CFG).gradient} text-white p-6 rounded-[2.5rem] shadow-xl`}>
                                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Target Business</p>
                                            <h5 className="font-black text-2xl tracking-tight mb-2">{selectedPlan.customer_name}</h5>
                                            <div className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-black backdrop-blur-md border border-white/10 uppercase tracking-widest">{selectedPlan.purpose}</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <input type="text" placeholder="ระบุชื่อลูกค้าหรือชื่อร้าน..." className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all shadow-inner" onChange={(e) => setSelectedPlan({ customer_name: e.target.value })} />
                                            <select className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all appearance-none shadow-inner" onChange={(e) => setVisitPurpose(e.target.value)}>
                                                <option value="ทั่วไป">จุดประสงค์ทั่วไป</option>
                                                <option value="นำเสนอสินค้า">เสนอขายสินค้า</option>
                                                <option value="เก็บเงิน">เก็บเงิน/วางบิล</option>
                                                <option value="ตรวจเยี่ยม">ตรวจร้าน/เยี่ยมชม</option>
                                            </select>
                                        </div>
                                    )}
                                    <textarea placeholder="เพิ่มบันทึกหรือรายละเอียดการเข้าพบที่นี่..." className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold h-32 resize-none focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all shadow-inner" onChange={(e) => setNotes(e.target.value)}></textarea>
                                </div>

                                <div className="pt-4 pb-16 px-2">
                                    <div className="relative h-20 bg-slate-100 rounded-[2.5rem] shadow-inner overflow-hidden flex items-center justify-center border border-slate-200/50 group">
                                        <span className={`font-black text-slate-400 text-sm tracking-widest z-0 transition-opacity uppercase ${sliderValue > 15 ? 'opacity-0' : 'opacity-100 animate-pulse'}`}>Slide to Finalize Check-in 👉</span>
                                        <input type="range" min="0" max="100" value={sliderValue} className="absolute w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-20" onChange={(e) => { setSliderValue(e.target.value); if (e.target.value === '100') handleCheckIn(); }} onMouseUp={(e) => { if (e.target.value < 100) setSliderValue(0); }} onTouchEnd={(e) => { if (e.target.value < 100) setSliderValue(0); }} />
                                        <div className="absolute left-1.5 top-1.5 bottom-1.5 bg-rose-500 rounded-full transition-all ease-out z-10 pointer-events-none shadow-xl flex items-center" style={{ width: `calc(${Math.max(18, sliderValue)}% + 6px)` }}>
                                            <div className="absolute right-1.5 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-rose-100">
                                                <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>

            {selectedPlan && step === 1 && (
                <div className="fixed inset-0 z-[45] bg-slate-50 overflow-y-auto" onScroll={(e) => setIsScrolled(e.target.scrollTop > 20)}>
                    <div className="max-w-md mx-auto relative">
                        <div className={`fixed top-0 z-50 w-full max-w-md bg-rose-500 bg-gradient-to-b ${(PURPOSE_CONFIG[selectedPlan.purpose] || DEFAULT_CFG).gradient} shadow-[0_10px_30px_rgba(244,63,94,0.3)] overflow-hidden transition-all duration-300 ${isScrolled ? 'h-[100px] rounded-b-[30px]' : 'h-[190px]'}`}>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-white/10 blur-[100px] rounded-full opacity-60 pointer-events-none"></div>
                            
                            <div className={`absolute left-5 right-5 flex justify-between items-center z-20 transition-all duration-300 top-10`}>
                                <button onClick={() => setSelectedPlan(null)} className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-2xl flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all active:scale-90 shrink-0">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                
                                {isScrolled ? (
                                    <div className="flex-1 pl-4 pr-2 animate-fade-in flex flex-col justify-center text-left min-w-0 pt-1">
                                        <h2 className="text-white font-black text-lg truncate drop-shadow-md leading-none mb-1.5">{selectedPlan.customer_name}</h2>
                                        <div className="flex items-center gap-2 text-white font-bold text-[9px] uppercase tracking-widest truncate">
                                            <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-md shadow-sm shrink-0">
                                                <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                                                {(PURPOSE_CONFIG[selectedPlan.purpose] || DEFAULT_CFG).label}
                                            </div>
                                            <div className="bg-white/10 px-2 py-0.5 rounded-md shadow-sm shrink-0">
                                                {selectedPlan.plan_time ? selectedPlan.plan_time.substring(0, 5) : 'ไม่ระบุ'} น.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex justify-center animate-fade-in">
                                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/30 shadow-sm mt-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                            {(PURPOSE_CONFIG[selectedPlan.purpose] || DEFAULT_CFG).label}
                                        </div>
                                    </div>
                                )}

                                <button className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-2xl flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                </button>
                            </div>

                            <div className={`absolute bottom-3 left-6 right-6 flex items-center gap-4 transition-all duration-300 ${isScrolled ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-3xl rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/30 shrink-0 relative group">
                                    <div className="absolute inset-0 bg-white/10 rounded-2xl animate-pulse"></div>
                                    <div className="scale-90 drop-shadow-2xl z-10 relative">{(PURPOSE_CONFIG[selectedPlan.purpose] || DEFAULT_CFG).icon}</div>
                                </div>
                                <div className="text-white flex-1 min-w-0">
                                    <h1 className="text-2xl font-black mb-0.5 tracking-tight leading-none drop-shadow-xl truncate">{selectedPlan.customer_name}</h1>
                                    <p className="text-white/80 font-bold text-[10px]">
                                        {selectedPlan.plan_time ? selectedPlan.plan_time.substring(0, 5) : 'ไม่ระบุเวลา'} น. · {new Date(selectedPlan.plan_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {(() => {
                                            const notes = selectedPlan.notes || "";
                                            const locationStr = notes.split('สถานที่: ')[1]?.split('\n')[0];
                                            const contactStr = notes.split('ผู้ติดต่อ: ')[1]?.split('\n')[0];
                                            const phoneStr = notes.split('เบอร์โทร: ')[1]?.split('\n')[0];
                                            return (
                                                <>
                                                    {locationStr && <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-sm"><span className="text-[12px]">📍</span><span className="truncate max-w-[100px] drop-shadow-sm">{locationStr}</span></div>}
                                                    {contactStr && <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-sm"><span className="text-[12px]">👤</span><span className="truncate max-w-[80px] drop-shadow-sm">{contactStr}</span></div>}
                                                    {phoneStr && <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-sm"><span className="text-[12px]">📞</span><span className="tracking-wider drop-shadow-sm">{phoneStr}</span></div>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                </div>
                            </div>

                                <div className="h-[190px] w-full shrink-0 pointer-events-none"></div>

                        <div className="relative z-10 bg-white px-6 pt-8 pb-8 space-y-8 rounded-[40px] -mt-10 mb-28 shadow-[0_5px_40px_rgba(0,0,0,0.1)] min-h-[calc(100vh-180px)] flex flex-col border-b border-slate-200/50">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>

                            <div className="grid grid-cols-5 gap-2 shrink-0">
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlan.customer_name)}`} target="_blank" className="h-16 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-blue-100 transition-all border border-blue-100">
                                                            <span className="text-xl">🗺️</span>
                                                            <span className="text-[9px] font-black uppercase tracking-wider">นำทาง</span>
                                                        </a>
                                                        <button className="h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-emerald-100 transition-all border border-emerald-100">
                                                            <span className="text-xl">📞</span>
                                                            <span className="text-[9px] font-black uppercase tracking-wider">โทรออก</span>
                                                        </button>
                                                        <button className="h-16 bg-slate-50 text-slate-600 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-slate-100 transition-all border border-slate-100">
                                                            <span className="text-xl">📝</span>
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-center leading-none">บันทึก<br/>เก่า</span>
                                                        </button>
                                                        
                                                        {(() => {
                                                            const hasInvoice = hasSO[selectedPlan.id] || hasSO[selectedPlan.customer_code];
                                                            return (
                                                                <button disabled={!hasInvoice} onClick={() => window.open(`/print-so?visitId=${selectedPlan.id}`, '_blank')} className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${hasInvoice ? 'bg-indigo-50 text-indigo-600 border-indigo-100 active:scale-95 hover:bg-indigo-100' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}>
                                                                    <span className={`text-xl ${!hasInvoice ? 'opacity-50 grayscale' : ''}`}>📄</span>
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-center leading-none">ใบกำกับ<br/>อย่างย่อ</span>
                                                                </button>
                                                            );
                                                        })()}

                                                        {(() => {
                                                            const hasVisitReport = !!checkinRecords[selectedPlan.id] || selectedPlan.status === 'completed';
                                                            return (
                                                                <button disabled={!hasVisitReport} onClick={() => window.open(`/print-visit?visitId=${selectedPlan.id}`, '_blank')} className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${hasVisitReport ? 'bg-orange-50 text-orange-600 border-orange-100 active:scale-95 hover:bg-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}>
                                                                    <span className={`text-xl ${!hasVisitReport ? 'opacity-50 grayscale' : ''}`}>📊</span>
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-center leading-none">Visit<br/>Report</span>
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>

                            <div className="bg-slate-50 rounded-[2.5rem] p-7 border border-slate-100 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-4 bg-[#FF2D55] rounded-full"></span>
                                        Customer Insight
                                    </h5>
                                    <span className="text-[10px] font-bold text-slate-400">อัปเดต 5 นาทีที่แล้ว</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ยอดค้างชำระ</p>
                                        <p className="text-lg font-black text-rose-500">฿45,200</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">วงเงินเครดิต</p>
                                        <p className="text-lg font-black text-slate-800">฿100,000</p>
                                    </div>
                                </div>
                                <div className="bg-white/60 p-5 rounded-2xl border border-dashed border-slate-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">💡</span>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">โน้ตจากครั้งล่าสุด</p>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"ลูกค้าสนใจตัวสินค้าใหม่รุ่น X-Series ฝากเตรียมแคตตาล็อกและตัวอย่างไปให้ดูครั้งหน้าด้วย"</p>
                                </div>
                            </div>

                            {selectedPlan.reschedule_history && selectedPlan.reschedule_history.length > 0 && (
                                <div className="bg-slate-50 p-7 rounded-[2.5rem] space-y-4 border border-slate-100">
                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">ประวัติการเลื่อนนัด</h5>
                                    <div className="space-y-3">
                                        {selectedPlan.reschedule_history.map((hist, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs text-slate-600 font-bold px-1 py-2 border-b border-slate-200/60 last:border-0">
                                                <span className="opacity-60 font-medium text-[10px]">จากวันที่</span>
                                                <span className="bg-white px-2 py-1 rounded-lg">{new Date(hist.from).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                                <span className="text-slate-300">→</span>
                                                <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">{new Date(hist.to).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkinRecords[selectedPlan.id] && (
                                <div className="bg-emerald-50 p-7 rounded-[2.5rem] space-y-5 border border-emerald-100">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
                                            ข้อมูลการ Check-in
                                        </h5>
                                        <span className="bg-emerald-200 text-emerald-800 text-[9px] px-2 py-1 rounded-full font-bold">สำเร็จแล้ว</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-3xl border border-emerald-100 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">🕒</div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">เวลาบันทึก</p>
                                                <p className="text-sm font-black text-slate-700 truncate">{checkinRecords[selectedPlan.id].timestamp}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">📍</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">พิกัด GPS</p>
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${checkinRecords[selectedPlan.id].location?.lat},${checkinRecords[selectedPlan.id].location?.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-black text-blue-600 hover:text-blue-700 underline truncate block"
                                                >
                                                    {checkinRecords[selectedPlan.id].location?.lat?.toFixed(5)}, {checkinRecords[selectedPlan.id].location?.lng?.toFixed(5)}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">หลักฐาน ({checkinRecords[selectedPlan.id].photos.length} รูป)</p>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {checkinRecords[selectedPlan.id].photos.map((p, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => setSelectedPhoto(p)}
                                                        className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                    >
                                                        <img src={p} alt="checkin" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- Operation Results Block --- */}
                            {checkinRecords[selectedPlan.id] && selectedPlan.status !== 'completed' && (
                                <div className="mt-8 pt-8 border-t border-slate-100/80">
                                    <h5 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-4 bg-indigo-500 rounded-full"></span>
                                        ผลการจัดการ (เลือกได้มากกว่า 1)
                                    </h5>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {[
                                            { id: 'sales', label: 'ขายของ', icon: '🛍️' },
                                            { id: 'collection', label: 'เก็บหนี้', icon: '💰' },
                                            { id: 'inspection', label: 'ตรวจร้าน', icon: '📋' },
                                            { id: 'other', label: 'อื่นๆ', icon: '💬' }
                                        ].map(purpose => {
                                            const isSelected = selectedPurposes.includes(purpose.id);
                                            return (
                                                <button 
                                                    key={purpose.id}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedPurposes(prev => prev.filter(p => p !== purpose.id));
                                                        else setSelectedPurposes(prev => [...prev, purpose.id]);
                                                    }}
                                                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100 text-indigo-700' : 'border-slate-100 bg-white hover:border-indigo-200 text-slate-500'}`}
                                                >
                                                    <span className="text-2xl">{purpose.icon}</span>
                                                    <span className="font-bold text-[11px] uppercase tracking-wide">{purpose.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    
                                    {/* Action Buttons based on selection */}
                                    {selectedPurposes.length > 0 && (
                                        <div className="space-y-3 pb-8">
                                            {selectedPurposes.includes('sales') && (
                                                <button onClick={() => setActiveModal('sales')} className={`w-full p-4 bg-white border ${completedTasks.includes('sales') ? 'border-emerald-500 bg-emerald-50/50 opacity-80' : 'border-slate-200 hover:border-indigo-400'} rounded-2xl flex items-center justify-between group transition-colors`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${completedTasks.includes('sales') ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>🛍️</div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-slate-700 text-sm">สร้างใบสั่งขาย (SO)</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">เปิดออเดอร์ใหม่เข้าระบบ Ecount</p>
                                                        </div>
                                                    </div>
                                                    {completedTasks.includes('sales') ? (
                                                        <span className="text-emerald-500 font-bold text-xl drop-shadow-sm">✅</span>
                                                    ) : (
                                                        <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">→</span>
                                                    )}
                                                </button>
                                            )}
                                            {selectedPurposes.includes('collection') && (
                                                <button onClick={() => setActiveModal('collection')} className={`w-full p-4 bg-white border ${completedTasks.includes('collection') ? 'border-emerald-500 bg-emerald-50/50 opacity-80' : 'border-slate-200 hover:border-emerald-400'} rounded-2xl flex items-center justify-between group transition-colors`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${completedTasks.includes('collection') ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>💰</div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-slate-700 text-sm">บันทึกรับชำระหนี้</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">ตัดยอดอินวอยซ์ที่ค้างชำระ</p>
                                                        </div>
                                                    </div>
                                                    {completedTasks.includes('collection') ? (
                                                        <span className="text-emerald-500 font-bold text-xl drop-shadow-sm">✅</span>
                                                    ) : (
                                                        <span className="text-slate-300 group-hover:text-emerald-500 transition-colors">→</span>
                                                    )}
                                                </button>
                                            )}
                                            {selectedPurposes.includes('inspection') && (
                                                <button onClick={() => setActiveModal('inspection')} className={`w-full p-4 bg-white border ${completedTasks.includes('inspection') ? 'border-emerald-500 bg-emerald-50/50 opacity-80' : 'border-slate-200 hover:border-blue-400'} rounded-2xl flex items-center justify-between group transition-colors`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${completedTasks.includes('inspection') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>📋</div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-slate-700 text-sm">แบบฟอร์มตรวจร้าน</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">เช็คสต็อก การจัดวางสินค้า</p>
                                                        </div>
                                                    </div>
                                                    {completedTasks.includes('inspection') ? (
                                                        <span className="text-emerald-500 font-bold text-xl drop-shadow-sm">✅</span>
                                                    ) : (
                                                        <span className="text-slate-300 group-hover:text-blue-500 transition-colors">→</span>
                                                    )}
                                                </button>
                                            )}
                                            {selectedPurposes.includes('other') && (
                                                <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                                                    <label className="block text-xs font-bold text-slate-700 mb-2">ความคิดเห็น / อื่นๆ</label>
                                                    <textarea 
                                                        value={otherComment}
                                                        onChange={e => setOtherComment(e.target.value)}
                                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                        rows="3"
                                                        placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                                    ></textarea>
                                                </div>
                                            )}
                                            
                                            {/* Checkout Location Section */}
                                            <div className="mt-8 mb-6 p-5 bg-slate-50 rounded-3xl border border-slate-200">
                                                <h5 className="text-[11px] font-black text-slate-600 mb-3 uppercase tracking-widest">พิกัด Check-out <span className="text-rose-500">*</span></h5>
                                                {checkoutLocation ? (
                                                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-emerald-700 text-sm font-bold">
                                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-lg">📍</div>
                                                        <div>
                                                            <p>ได้รับพิกัดแล้ว</p>
                                                            <p className="text-[9px] text-emerald-500 opacity-80 font-mono">{checkoutLocation.lat.toFixed(5)}, {checkoutLocation.lng.toFixed(5)}</p>
                                                        </div>
                                                        <span className="ml-auto text-xl">✅</span>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={getCheckoutLocation} 
                                                        disabled={gettingCheckoutLocation}
                                                        className="w-full py-4 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 shadow-sm transition-colors"
                                                    >
                                                        {gettingCheckoutLocation ? (
                                                            <span className="animate-pulse">⏳ กำลังค้นหาพิกัด...</span>
                                                        ) : (
                                                            "📍 กดเพื่อดึงพิกัด (บังคับก่อนปิดงาน)"
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {(() => {
                                                const requiredTasks = selectedPurposes.filter(p => p !== 'other');
                                                const isAllTasksCompleted = requiredTasks.every(t => completedTasks.includes(t));
                                                const canCheckout = isAllTasksCompleted && checkoutLocation;
                                                
                                                return (
                                                    <button 
                                                        disabled={!canCheckout}
                                                        onClick={async () => {
                                                            Swal.fire({
                                                                title: 'กำลังบันทึก Check-out...',
                                                                allowOutsideClick: false,
                                                                didOpen: () => Swal.showLoading()
                                                            });
                                                            try {
                                                                const now = new Date().toISOString();
                                                                
                                                                // 1. Update Visits Table
                                                                const { error: visitError } = await supabase
                                                                    .from('visits')
                                                                    .update({ 
                                                                        is_completed: true, 
                                                                        check_out_time: now,
                                                                        notes: otherComment,
                                                                        checkout_latitude: checkoutLocation.lat,
                                                                        checkout_longitude: checkoutLocation.lng
                                                                    })
                                                                    .eq('plan_id', selectedPlan.id);
                                                                    
                                                                if (visitError) throw visitError;
                                                                
                                                                // 2. Update Sales Plans Table
                                                                const { error: planError } = await supabase
                                                                    .from('sales_plans')
                                                                    .update({ status: 'completed' })
                                                                    .eq('id', selectedPlan.id);
                                                                    
                                                                if (planError) throw planError;
                                                                
                                                                Swal.fire({
                                                                    title: 'ปิดงานสำเร็จ!',
                                                                    text: 'บันทึกเวลาและพิกัด Check-out เรียบร้อย',
                                                                    icon: 'success',
                                                                    timer: 2000,
                                                                    showConfirmButton: false,
                                                                    customClass: { popup: 'rounded-3xl' }
                                                                }).then(() => router.reload());
                                                            } catch (err) {
                                                                Swal.fire('Error', 'Check-out failed: ' + err.message, 'error');
                                                            }
                                                        }}
                                                        className={`w-full h-14 mt-2 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all ${canCheckout ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                                                    >
                                                        {canCheckout ? '✅ ยืนยันปิดงาน (Check-out)' : 'กรุณาทำ Task และดึงพิกัดให้ครบ'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!checkinRecords[selectedPlan.id] && selectedPlan.status !== 'completed' && (
                                <div className="pt-8 pb-4 mt-auto border-t border-slate-100/80 shrink-0">
                                    <button onClick={() => {
                                        setCheckinPhotos([]);
                                        setLocation(null);
                                        setStep(2);
                                    }} className="w-full h-18 bg-rose-500 text-white rounded-[2rem] font-black text-2xl shadow-xl shadow-rose-200/60 flex items-center justify-center gap-4 active:scale-95 hover:bg-rose-600 transition-all group border-b-4 border-rose-600">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                        </div>
                                        เริ่ม Work In
                                    </button>
                                    <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Ready to operate</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {selectedPlan && step === 2 && (
                <div className="fixed inset-0 z-[60] bg-slate-50 overflow-y-auto pb-32 animate-fade-in">
                    <div className="max-w-md mx-auto min-h-screen bg-white relative shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">ระบบ Check-in</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedPlan.customer_name}</p>
                            </div>
                            <button onClick={() => setStep(1)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8 flex-1">
                            {/* Timestamp */}
                            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shrink-0 shadow-inner">🕒</div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">เวลาปัจจุบัน</p>
                                    <p className="text-lg font-black text-blue-700">{currentDateTime}</p>
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-4 bg-emerald-400 rounded-full"></span>
                                    พิกัด GPS
                                </h3>
                                {!location ? (
                                    <button onClick={getLocation} disabled={gettingLocation} className="w-full h-16 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95">
                                        {gettingLocation ? (
                                            <span className="animate-pulse">กำลังค้นหาพิกัด...</span>
                                        ) : (
                                            <>📍 แตะเพื่อดึงพิกัดปัจจุบัน</>
                                        )}
                                    </button>
                                ) : (
                                    <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">📍</div>
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">พิกัดสำเร็จ</p>
                                                <p className="text-[10px] font-medium text-emerald-600/80">Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
                                            </div>
                                        </div>
                                        <div className="h-[120px] rounded-2xl overflow-hidden pointer-events-none shadow-sm">
                                            <MapComponent lat={location.lat} lng={location.lng} readOnly={true} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Photos */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-4 bg-rose-400 rounded-full"></span>
                                    ถ่ายรูปหน้างาน <span className="text-rose-500 text-[10px] bg-rose-50 px-2 py-0.5 rounded-md ml-1">*บังคับ</span>
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {checkinPhotos.map((p, i) => (
                                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm border border-slate-200 group">
                                            <img src={p} alt="Checkin" className="w-full h-full object-cover" />
                                            <button onClick={() => setCheckinPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                        </div>
                                    ))}
                                    
                                    <label className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">ถ่ายรูปเพิ่ม</span>
                                        <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            files.forEach(f => {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        const canvas = document.createElement('canvas');
                                                        const ctx = canvas.getContext('2d');
                                                        
                                                        const MAX_WIDTH = 1000;
                                                        let width = img.width;
                                                        let height = img.height;
                                                        if (width > MAX_WIDTH) {
                                                            height = Math.round(height * (MAX_WIDTH / width));
                                                            width = MAX_WIDTH;
                                                        }
                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        
                                                        ctx.drawImage(img, 0, 0, width, height);
                                                        
                                                        const barHeight = Math.max(60, height * 0.1);
                                                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                                                        ctx.fillRect(0, height - barHeight, width, barHeight);
                                                        
                                                        const fontSize = Math.max(14, Math.floor(width * 0.025));
                                                        ctx.fillStyle = '#ffffff';
                                                        ctx.font = `bold ${fontSize}px sans-serif`;
                                                        ctx.textBaseline = 'middle';
                                                        
                                                        const padding = fontSize;
                                                        const line1Y = height - barHeight + (barHeight / 3);
                                                        const line2Y = height - barHeight + (barHeight / 3) * 2;
                                                        
                                                        ctx.fillText(`ลูกค้า: ${selectedPlan.customer_name}`, padding, line1Y);
                                                        ctx.fillText(`เวลา: ${currentDateTime}`, padding, line2Y);
                                                        
                                                        if (location) {
                                                            ctx.textAlign = 'right';
                                                            ctx.fillText(`GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`, width - padding, line2Y);
                                                        }
                                                        
                                                        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.8);
                                                        setCheckinPhotos(prev => [...prev, watermarkedUrl]);
                                                    };
                                                    img.src = ev.target.result;
                                                };
                                                reader.readAsDataURL(f);
                                            });
                                        }} />
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Bottom */}
                        <div className="fixed bottom-0 left-0 w-full max-w-md left-1/2 -translate-x-1/2 p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
                            <button 
                                disabled={!location || checkinPhotos.length === 0 || loading} 
                                onClick={handleConfirmCheckin}
                                className={`w-full h-16 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all ${(!location || checkinPhotos.length === 0 || loading) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#FF2D55] text-white shadow-xl shadow-rose-200 active:scale-95'}`}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                ยืนยัน Check-in
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Full Screen Photo Viewer */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in">
                    <div className="flex justify-end p-4">
                        <button 
                            onClick={() => setSelectedPhoto(null)}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                        <img 
                            src={selectedPhoto} 
                            alt="Full Screen Checkin" 
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
            
            {/* --- Modals for Operations --- */}
            {activeModal === 'sales' && (
                <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <h3 className="font-bold text-slate-800">🛍️ สร้างใบสั่งขาย</h3>
                        <div className="flex gap-2">
                            <button onClick={() => { setCompletedTasks(prev => [...new Set([...prev, 'sales'])]); setActiveModal(null); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-200 flex items-center gap-1 shadow-sm">
                                ✅ เสร็จสิ้น
                            </button>
                            <button onClick={() => setActiveModal(null)} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <iframe 
                            src={`/create-so?embed=true&visitId=${selectedPlan.id}&custCode=${selectedPlan.customer_code || ''}&newCustName=${encodeURIComponent(selectedPlan.customer_name || '')}`}
                            className="w-full h-full border-0"
                        />
                    </div>
                </div>
            )}

            {activeModal === 'collection' && (
                <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-fade-in overflow-y-auto pb-32">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <h3 className="font-bold text-emerald-800">💰 บันทึกรับชำระหนี้</h3>
                        <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 font-bold hover:bg-slate-200">✕ ปิด</button>
                    </div>
                    <div className="p-4 max-w-md mx-auto w-full space-y-4">
                        {/* Mock Invoice List */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">อินวอยซ์ที่ค้างชำระ (จำลอง)</h4>
                            <div className="space-y-2">
                                {[
                                    { id: 'INV-2401-001', date: '2024-01-15', amount: 15400 },
                                    { id: 'INV-2402-045', date: '2024-02-10', amount: 8900 }
                                ].map(inv => (
                                    <label key={inv.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-400" />
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-700 text-sm">{inv.id}</p>
                                            <p className="text-[10px] text-slate-400">ครบกำหนด: {inv.date}</p>
                                        </div>
                                        <p className="font-mono font-bold text-emerald-600">฿{inv.amount.toLocaleString()}</p>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">สรุปการรับชำระ</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ยอดรวมที่ต้องชำระ (บาท)</label>
                                    <input type="number" defaultValue="24300" className="w-full p-3 bg-emerald-50 text-emerald-700 font-mono font-bold rounded-xl border border-emerald-100 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">วิธีการชำระเงิน</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setCollectionData({...collectionData, method: 'cash'})}
                                            className={`py-2 border-2 rounded-xl font-bold text-sm transition-colors ${collectionData.method === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500'}`}
                                        >
                                            💵 เงินสด
                                        </button>
                                        <button 
                                            onClick={() => setCollectionData({...collectionData, method: 'transfer'})}
                                            className={`py-2 border-2 rounded-xl font-bold text-sm transition-colors ${collectionData.method === 'transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500'}`}
                                        >
                                            📱 โอนเงิน
                                        </button>
                                    </div>
                                </div>
                                {collectionData.method === 'transfer' && (
                                    <div className="pt-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">แนบสลิปการโอนเงิน</label>
                                        <input type="file" accept="image/*" className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-slate-50" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {completedTasks.includes('collection') ? (
                            <button disabled className="w-full py-4 bg-slate-200 text-slate-500 rounded-2xl font-bold text-lg cursor-not-allowed">
                                ✅ บันทึกแล้ว
                            </button>
                        ) : (
                            <button onClick={() => { Swal.fire('Success', 'บันทึกรับชำระเงินเรียบร้อย', 'success'); setCompletedTasks(prev => [...new Set([...prev, 'collection'])]); setActiveModal(null); }} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 transition-colors active:scale-95">
                                บันทึกรับชำระ
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeModal === 'inspection' && (
                <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-fade-in overflow-y-auto pb-32">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <h3 className="font-bold text-blue-800">📋 ตรวจเยี่ยมร้าน</h3>
                        <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 font-bold hover:bg-slate-200">✕ ปิด</button>
                    </div>
                    <div className="p-4 max-w-md mx-auto w-full space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Checklist การตรวจ</h4>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                    <input type="checkbox" checked={inspectionData.stock} onChange={e => setInspectionData({...inspectionData, stock: e.target.checked})} className="w-6 h-6 text-blue-500 rounded focus:ring-blue-400" />
                                    <span className="font-medium text-slate-700">ตรวจนับสต็อกสินค้าคงเหลือ</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                    <input type="checkbox" checked={inspectionData.display} onChange={e => setInspectionData({...inspectionData, display: e.target.checked})} className="w-6 h-6 text-blue-500 rounded focus:ring-blue-400" />
                                    <span className="font-medium text-slate-700">ตรวจสอบการจัดเรียงสินค้าหน้าร้าน</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                    <input type="checkbox" checked={inspectionData.competitor} onChange={e => setInspectionData({...inspectionData, competitor: e.target.checked})} className="w-6 h-6 text-blue-500 rounded focus:ring-blue-400" />
                                    <span className="font-medium text-slate-700">สำรวจสินค้าคู่แข่ง</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">แนบรูปภาพเพิ่มเติม</h4>
                            <input type="file" accept="image/*" multiple className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-slate-50" />
                        </div>

                        {completedTasks.includes('inspection') ? (
                            <button disabled className="w-full py-4 bg-slate-200 text-slate-500 rounded-2xl font-bold text-lg cursor-not-allowed">
                                ✅ บันทึกแล้ว
                            </button>
                        ) : (
                            <button onClick={() => { Swal.fire('Success', 'บันทึกผลการตรวจร้านเรียบร้อย', 'success'); setCompletedTasks(prev => [...new Set([...prev, 'inspection'])]); setActiveModal(null); }} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-colors active:scale-95">
                                บันทึกผลตรวจ
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .card-glow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.5s ease; }
                .card-glow:hover { box-shadow: 0 0 30px rgba(255, 45, 85, 0.7); }
            `}</style>
        </>
    );
}
