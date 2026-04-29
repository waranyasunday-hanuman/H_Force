// components/Loading.js
export default function Loading({ fullScreen = false }) {
    const spinner = (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full opacity-20"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-500 font-medium text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 min-h-screen bg-gray-50/80 backdrop-blur-sm flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return (
        <div className="w-full flex items-center justify-center py-12">
            {spinner}
        </div>
    );
}
