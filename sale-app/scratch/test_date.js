const d = new Date(2026, 3, 23); // April 23, 2026 local
console.log("Local:", d.toString());
const toLocalDateStr = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
console.log("toLocalDateStr:", toLocalDateStr(d));
const iso = d.toISOString().split('T')[0];
console.log("ISO:", iso);
