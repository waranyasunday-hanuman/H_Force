import { Noto_Sans_Thai } from "next/font/google";
import Head from "next/head";
import 'leaflet/dist/leaflet.css';
import "../styles/globals.css";

const notoSansThai = Noto_Sans_Thai({
    subsets: ["thai", "latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-noto-sans-thai",
    display: "swap",
});

function MyApp({ Component, pageProps }) {
    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
            </Head>
            <style jsx global>{`
                html, body, .swal2-container {
                    font-family: ${notoSansThai.style.fontFamily} !important;
                }
            `}</style>
            <main className={`${notoSansThai.variable} font-sans antialiased text-gray-900 bg-gray-50 min-h-screen`}>
                <Component {...pageProps} />
            </main>
        </>
    );
}

export default MyApp;
