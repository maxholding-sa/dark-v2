"use client";

import React, { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingBar from "@/components/LoadingBar";
import Header from "@/components/header";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import ChatBotGate from "@/components/ChatBotGate";

// Routes that show the chat widget, matched exactly: the home page and the
// bare listing, not car detail pages. usePathname() drops the query string, so
// ChatBotGate does the second half of the check and excludes paginated and
// filtered listings (/cars?page=2).
const CHATBOT_ROUTES = ["/", "/cars"];

export default function ClientWrapper({ children, isSignUpPage, navLogo, aboutNavLabel, footerData }) {
    const [theme, setTheme] = useState("dark");
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith("/admin");
    const isAuthPage = pathname?.includes("/sign-in") || pathname?.includes("/sign-up") || isSignUpPage;
    const showChatBot = !isAuthPage && !isAdminPage && CHATBOT_ROUTES.includes(pathname);

    useEffect(() => {
        // Remove previously applied theme classes
        document.body.classList.remove("dark", "dark-alt");
        // Apply the selected theme class if not light
        if (theme === "dark") {
            document.body.classList.add("dark");
        } else if (theme === "dark-alt") {
            document.body.classList.add("dark-alt");
        }
    }, [theme]);

    // Handle loading bar for navigation
    useEffect(() => {
        let timeoutId;

        const handleStartLoading = () => {
            setIsLoading(true);
            if (timeoutId) clearTimeout(timeoutId);
        };

        const handleStopLoading = () => {
            setIsLoading(false);
            if (timeoutId) clearTimeout(timeoutId);
        };

        const handleRouteChange = () => {
            // Hide the loader immediately when the route changes
            setIsLoading(false);
        };

        window.addEventListener('startLoading', handleStartLoading);
        window.addEventListener('stopLoading', handleStopLoading);

        if (pathname) {
            handleRouteChange();
        }

        return () => {
            window.removeEventListener('startLoading', handleStartLoading);
            window.removeEventListener('stopLoading', handleStopLoading);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [pathname]);

    return (
        <>
            {!isAuthPage && !isAdminPage && <Header navLogo={navLogo} aboutNavLabel={aboutNavLabel} />}
            <main className="min-h-screen">{children}</main>
            <Toaster richColors />
            {!isAuthPage && !isAdminPage && <Footer initialData={footerData} />}
            {showChatBot && (
                <Suspense fallback={null}>
                    <ChatBotGate />
                </Suspense>
            )}
            {isLoading && <LoadingBar />}
        </>
    );
}
