// pages/user-management.js
import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

const ROLES = ["manager", "sale"];

const ROLE_COLORS = {
    manager: "bg-purple-100 text-purple-700 border-purple-200",
    sale:    "bg-blue-100 text-blue-700 border-blue-200",
};

const ROLE_ICONS = {
    manager: "🏆",
    sale:    "🧑‍💼",
};

function StatusBadge({ active }) {
    return active ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span> Inactive
        </span>
    );
}

// Modal: Invite User
function InviteModal({ onClose, onSuccess, existingPics }) {
    const [form, setForm] = useState({ email: "", role: "sale", display_name: "", pic_code: "", pic_name: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email) { setError("กรุณาระบุ Email"); return; }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/users/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
            await Swal.fire({
                icon: "success",
                title: "ส่ง Invitation แล้ว! 🎉",
                html: `ส่ง Email เชิญไปยัง <b>${form.email}</b> แล้ว<br/>ผู้ใช้ต้องกด Link ใน Email เพื่อตั้ง Password`,
                confirmButtonColor: "#2563eb",
            });
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // เมื่อเลือก PIC จาก dropdown ที่มีอยู่แล้ว
    const handlePickPic = (user) => {
        setForm({ ...form, pic_code: user.pic_code, pic_name: user.pic_name || user.display_name });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
                    <h2 className="text-xl font-bold text-white">✉️ เชิญผู้ใช้ใหม่</h2>
                    <p className="text-emerald-100 text-sm mt-1">ระบบจะส่ง Email เชิญให้ผู้ใช้ตั้ง Password เอง</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="name@company.com"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อแสดงผล</label>
                        <input
                            type="text"
                            value={form.display_name}
                            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                            placeholder="เช่น สมชาย รักงาน"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLES.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setForm({ ...form, role: r })}
                                    className={`py-2.5 px-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${
                                        form.role === r
                                            ? r === "manager" ? "border-purple-400 bg-purple-50 text-purple-700"
                                            : "border-emerald-400 bg-emerald-50 text-emerald-700"
                                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                                    }`}
                                >
                                    <span className="text-lg">{ROLE_ICONS[r]}</span>
                                    <span>{r}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PIC Section */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🔗</span>
                            <span className="text-sm font-bold text-indigo-800">เชื่อม PIC (Person In Charge)</span>
                        </div>

                        {/* เลือกจาก existing PIC */}
                        {existingPics.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">เลือกจาก PIC ที่มีอยู่แล้ว</label>
                                <select
                                    onChange={(e) => {
                                        const selected = existingPics.find(p => p.pic_code === e.target.value);
                                        if (selected) handlePickPic(selected);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white"
                                    defaultValue=""
                                >
                                    <option value="">— หรือเลือก PIC สำเร็จรูป —</option>
                                    {existingPics.map((p) => (
                                        <option key={p.pic_code} value={p.pic_code}>
                                            [{p.pic_code}] {p.pic_name || p.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">PIC Code (รหัส)</label>
                                <input
                                    type="text"
                                    value={form.pic_code}
                                    onChange={(e) => setForm({ ...form, pic_code: e.target.value.toUpperCase() })}
                                    placeholder="เช่น S001"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">PIC Name (ชื่อ)</label>
                                <input
                                    type="text"
                                    value={form.pic_name}
                                    onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
                                    placeholder="เช่น สมชาย"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-indigo-600 font-medium">
                            💡 PIC Code ใช้สำหรับระบุผู้รับผิดชอบใน Sales Order — ตั้งชื่อให้ตรงกับที่ใช้ใน Ecount ERP
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    กำลังส่ง...
                                </>
                            ) : "✉️ ส่ง Invitation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function UserManagementPage() {
    const router = useRouter();
    const [currentRole, setCurrentRole] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [editModal, setEditModal] = useState(null);
    const [showInvite, setShowInvite] = useState(false);

    useEffect(() => {
        async function checkAccess() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            const role = profile?.role || "sale";
            setCurrentRole(role);
        }
        checkAccess();
    }, [router]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "ดึงข้อมูลไม่สำเร็จ");
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentRole === "admin" || currentRole === "manager") fetchUsers();
    }, [currentRole, fetchUsers]);

    const filtered = users.filter((u) => {
        const matchSearch =
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.pic_code?.toLowerCase().includes(search.toLowerCase()) ||
            u.pic_name?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const handleSave = async (userData) => {
        setSaving(userData.id);
        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

            await Swal.fire({
                icon: "success",
                title: "บันทึกสำเร็จ!",
                text: `อัพเดตข้อมูล ${userData.email} เรียบร้อยแล้ว`,
                timer: 1500,
                showConfirmButton: false,
            });

            setEditModal(null);
            await fetchUsers();
        } catch (err) {
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
        } finally {
            setSaving(null);
        }
    };

    const handleToggleActive = async (user) => {
        const confirm = await Swal.fire({
            icon: "question",
            title: user.is_active ? "ปิดการใช้งาน?" : "เปิดการใช้งาน?",
            text: `ต้องการ${user.is_active ? "ปิด" : "เปิด"}การใช้งานของ ${user.email} ?`,
            showCancelButton: true,
            confirmButtonColor: user.is_active ? "#dc2626" : "#16a34a",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก",
        });
        if (confirm.isConfirmed) {
            await handleSave({ ...user, is_active: !user.is_active });
        }
    };

    const stats = {
        total: users.length,
        admin: users.filter((u) => u.role === "admin").length,
        manager: users.filter((u) => u.role === "manager").length,
        sale: users.filter((u) => u.role === "sale").length,
        active: users.filter((u) => u.is_active).length,
    };

    // PIC list ที่มีอยู่แล้ว (สำหรับ dropdown เลือก PIC สำเร็จรูป)
    const existingPics = users.filter((u) => u.pic_code);

    // กำลังโหลด role
    if (currentRole === null) return null;

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            👥 จัดการผู้ใช้งาน
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">
                            กำหนด Role, PIC และสิทธิ์การใช้งานสำหรับผู้ใช้ในระบบ
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchUsers}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-blue-300 font-semibold shadow-sm transition-all"
                        >
                            🔄 รีเฟรช
                        </button>
                        {currentRole === "manager" && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                <span className="text-lg">+</span> เพิ่มผู้ใช้ใหม่
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: "ทั้งหมด", value: stats.total, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
                        { label: "Active", value: stats.active, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
                        { label: "Admin 👑", value: stats.admin, color: "bg-red-50 border-red-200", text: "text-red-700" },
                        { label: "Manager 🏆", value: stats.manager, color: "bg-purple-50 border-purple-200", text: "text-purple-700" },
                        { label: "Sale 🧑‍💼", value: stats.sale, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
                    ].map((s) => (
                        <div key={s.label} className={`${s.color} border rounded-2xl p-4 text-center shadow-sm`}>
                            <div className={`text-3xl font-extrabold ${s.text}`}>{s.value}</div>
                            <div className={`text-sm font-semibold ${s.text} opacity-80`}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาอีเมล, ชื่อ, PIC..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {["all", "admin", "manager", "sale"].map((r) => (
                            <button
                                key={r}
                                onClick={() => setFilterRole(r)}
                                className={`px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${
                                    filterRole === r
                                        ? "bg-blue-600 text-white border-transparent shadow-md"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                                }`}
                            >
                                {r === "all" ? "ทั้งหมด" : `${ROLE_ICONS[r]} ${r}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                        <span>⚠️</span> <span className="font-medium">{error}</span>
                        <details className="ml-auto text-xs text-red-500 cursor-pointer">
                            <summary>แนวทางแก้ไข</summary>
                            <p className="mt-1">ตรวจสอบว่า SUPABASE_SERVICE_ROLE_KEY ถูกต้องใน .env.local และ restart server</p>
                        </details>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-16 text-center">
                            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">กำลังโหลดรายชื่อผู้ใช้...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center text-gray-400">
                            <div className="text-5xl mb-3">👤</div>
                            <p className="font-medium">ไม่พบผู้ใช้ที่ค้นหา</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PIC (Person In Charge)</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เข้าสู่ระบบล่าสุด</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((user, idx) => (
                                        <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-400 font-medium">{idx + 1}</td>

                                            {/* User Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                                        {(user.display_name || user.email || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800 text-sm">
                                                            {user.display_name || <span className="text-gray-400 italic">ยังไม่ตั้งชื่อ</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                    {ROLE_ICONS[user.role]} {user.role || "sale"}
                                                </span>
                                            </td>

                                            {/* PIC */}
                                            <td className="px-6 py-4">
                                                {user.pic_code ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold">{user.pic_code.slice(0, 2)}</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-800">{user.pic_name || user.display_name}</div>
                                                            <div className="text-xs text-indigo-500 font-mono">{user.pic_code}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditModal({ ...user })}
                                                        className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:underline"
                                                    >
                                                        <span>🔗</span> กำหนด PIC
                                                    </button>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <StatusBadge active={user.is_active} />
                                            </td>

                                            {/* Last Sign In */}
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {user.last_sign_in_at
                                                    ? new Date(user.last_sign_in_at).toLocaleString("th-TH", {
                                                        year: "numeric", month: "short", day: "numeric",
                                                        hour: "2-digit", minute: "2-digit",
                                                    })
                                                    : <span className="text-gray-300">ยังไม่เคยเข้าสู่ระบบ</span>}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditModal({ ...user })}
                                                        className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-all"
                                                    >
                                                        ✏️ แก้ไข
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(user)}
                                                        disabled={saving === user.id}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                                                            user.is_active
                                                                ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                                        }`}
                                                    >
                                                        {saving === user.id ? "..." : user.is_active ? "🔒 ปิด" : "✅ เปิด"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {!loading && (
                    <p className="text-sm text-gray-400 text-center font-medium">
                        แสดง {filtered.length} จาก {users.length} ผู้ใช้ทั้งหมด
                    </p>
                )}
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <InviteModal
                    existingPics={existingPics}
                    onClose={() => setShowInvite(false)}
                    onSuccess={() => { setShowInvite(false); fetchUsers(); }}
                />
            )}

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                            <h2 className="text-xl font-bold text-white">✏️ แก้ไขผู้ใช้</h2>
                            <p className="text-blue-200 text-sm mt-1">{editModal.email}</p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Display Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อแสดงผล (Display Name)</label>
                                <input
                                    type="text"
                                    value={editModal.display_name || ""}
                                    onChange={(e) => setEditModal({ ...editModal, display_name: e.target.value })}
                                    placeholder="เช่น สมชาย รักงาน"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Role / สิทธิ์การใช้งาน</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ROLES.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setEditModal({ ...editModal, role: r })}
                                            className={`py-3 px-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${
                                                editModal.role === r
                                                    ? r === "admin" ? "border-red-400 bg-red-50 text-red-700"
                                                    : r === "manager" ? "border-purple-400 bg-purple-50 text-purple-700"
                                                    : "border-blue-400 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                                            }`}
                                        >
                                            <span className="text-xl">{ROLE_ICONS[r]}</span>
                                            <span>{r}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    {editModal.role === "manager" && "🏆 Manager: เข้าถึงได้ทุกหน้า รวมถึงจัดการ User และ Dashboard"}
                                    {editModal.role === "sale" && "🧑‍💼 Sale: สร้างออเดอร์ เช็คอิน และดูสินค้า"}
                                </p>
                            </div>

                            {/* PIC */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🔗</span>
                                    <span className="text-sm font-bold text-indigo-800">PIC (Person In Charge)</span>
                                </div>

                                {/* เลือกจาก existing user */}
                                {existingPics.filter(p => p.id !== editModal.id).length > 0 && (
                                    <select
                                        onChange={(e) => {
                                            const sel = existingPics.find(p => p.pic_code === e.target.value);
                                            if (sel) setEditModal({ ...editModal, pic_code: sel.pic_code, pic_name: sel.pic_name || sel.display_name });
                                        }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white"
                                        defaultValue=""
                                    >
                                        <option value="">— คัดลอกจาก PIC ที่มีอยู่แล้ว —</option>
                                        {existingPics.filter(p => p.id !== editModal.id).map((p) => (
                                            <option key={p.pic_code} value={p.pic_code}>
                                                [{p.pic_code}] {p.pic_name || p.display_name}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">PIC Code (รหัส)</label>
                                        <input
                                            type="text"
                                            value={editModal.pic_code || ""}
                                            onChange={(e) => setEditModal({ ...editModal, pic_code: e.target.value.toUpperCase() })}
                                            placeholder="เช่น S001"
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">PIC Name (ชื่อ)</label>
                                        <input
                                            type="text"
                                            value={editModal.pic_name || ""}
                                            onChange={(e) => setEditModal({ ...editModal, pic_name: e.target.value })}
                                            placeholder="เช่น สมชาย"
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-indigo-600 font-medium">
                                    💡 PIC Code นี้จะถูกใช้ระบุผู้รับผิดชอบใน Sales Order และ Dashboard
                                </p>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">สถานะการใช้งาน</span>
                                    <p className="text-xs text-gray-400 mt-0.5">ปิดสถานะจะไม่สามารถ Login ได้</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditModal({ ...editModal, is_active: !editModal.is_active })}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shadow-inner ${
                                        editModal.is_active ? "bg-emerald-500" : "bg-gray-300"
                                    }`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                        editModal.is_active ? "translate-x-6" : "translate-x-1"
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setEditModal(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleSave(editModal)}
                                disabled={saving === editModal.id}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {saving === editModal.id ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        กำลังบันทึก...
                                    </>
                                ) : "💾 บันทึกการเปลี่ยนแปลง"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
