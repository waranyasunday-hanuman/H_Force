// middleware.js
import { NextResponse } from "next/server";

export function proxy(req) {
    // We expect the 'sb_auth_token' cookie to be present if the user is authenticated.
    const token = req.cookies.get("sb_auth_token")?.value;

    const { pathname } = req.nextUrl;

    // Paths that require authentication
    const protectedPaths = ["/dashboard", "/create-so"];
    
    // Check if current path is protected
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

    if (isProtected && !token) {
        // Redirect to login if unauthenticated
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname === "/") {
        if (token) {
            // If authenticated and visiting root, default to dashboard
            return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
            // If unauthenticated and visiting root, redirect to login
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Only run middleware on pages route to avoid running on static files/api
    matcher: ["/dashboard", "/create-so", "/"],
};
