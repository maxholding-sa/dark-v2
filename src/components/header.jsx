"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ArrowLeft, CarFront, Heart, Layout, Menu, Loader2 } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { getLogoByType } from "@/actions/site-management";
import LoadingBar from "./LoadingBar";
import { logger } from "@/lib/logger";


const baseNavItems = [
  { name: "الصفحة الرئيسية", href: "/" },
  { name: "من نحن", href: "/about", dynamic: true },
  { name: "السيارات", href: "/cars" },
  { name: "البنوك", href: "/banks" },
  { name: "الشركات", href: "/companies" },
  { name: "اراء العملاء", href: "/reviews" },
  { name: "مقالات", href: "/articles" },
  { name: "طلبات الشركات", href: "/company-requests" },
  { name: "تواصل معنا", href: "/contact" },
];


const Header = ({ isAdminPage = false, navLogo: initialNavLogo, aboutNavLabel = "من نحن" }) => {
  const [open, setOpen] = useState(false);
  const [navLogo, setNavLogo] = useState(initialNavLogo);
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const navItems = baseNavItems.map((item) =>
    item.dynamic ? { ...item, name: aboutNavLabel } : item
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update navLogo if prop changes
  useEffect(() => {
    if (initialNavLogo) {
      setNavLogo(initialNavLogo);
    }
  }, [initialNavLogo]);

  // Fetch navigation logo if not provided
  useEffect(() => {
    if (navLogo) return;

    const fetchNavLogo = async () => {
      try {
        const result = await getLogoByType("navbar");
        if (result.success && result.data) {
          setNavLogo(result.data);
        }
      } catch (error) {
        logger.error("Error fetching nav logo:", error);
      }
    };
    fetchNavLogo();
  }, [navLogo]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!isLoaded) {
        return;
      }

      if (!clerkUser) {
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      try {
        // Fetch role from your API/Supabase
        const response = await fetch('/api/user/role', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // Prevent caching of role response
        });

        // Always get role from Clerk metadata as well
        const clerkRole = clerkUser.publicMetadata?.role;
        const isClerkAdmin = clerkRole === "ADMIN" || clerkRole === "EDITOR";

        if (response.ok) {
          const data = await response.json();
          logger.debug("[header] Role resolved from API", { role: data.role });
          const isApiAdmin = data.role === "ADMIN" || data.role === "EDITOR";

          // Trust BOTH sources - if either says Admin, they see the dashboard button
          setIsAdmin(isApiAdmin || isClerkAdmin);
        } else {
          logger.warn("[header] Role API failed, using Clerk metadata");
          setIsAdmin(isClerkAdmin);
        }
      } catch (error) {
        logger.error("[header] Error fetching role", error);
        // Fallback to Clerk metadata
        const clerkRole = clerkUser.publicMetadata?.role;
        setIsAdmin(clerkRole === "ADMIN" || clerkRole === "EDITOR");
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRole();
  }, [clerkUser, isLoaded]);

  return (
    <header className="fixed top-0 w-full bg-[#000000] backdrop-blur-none z-50 border-b">
      <nav className="mx-auto px-4 md:px-12 py-4 flex items-center justify-between">
        {/* NavBar Logo */}
        <Link href={isAdminPage ? "/admin" : "/"} className="flex items-center gap-2 md:mr-12">
          <Image
            src={navLogo?.imageUrl || "/logo.JPG"}
            alt={navLogo?.altText || "maxmotors_logo"}
            width={100}
            height={60}
            className="object-contain h-12 w-auto"
          />
          {isAdminPage && (
            <span className="text-xs font-extralight text-white">Admin</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
          {navItems.filter(item => item.name).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('startLoading'));
              }}
              className={`text-white hover:text-yellow-600 transition-colors text-sm font-medium ${item.name === "تواصل معنا" ? "mr-6" : ""
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2 md:space-x-4 rtl:space-x-reverse">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  id="mobile-nav-trigger" 
                  aria-controls="mobile-nav-content"
                  suppressHydrationWarning
                >
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[300px]" 
                id="mobile-nav-content"
              >
                <div className="sr-only">
                  <SheetTitle>قائمة التنقل</SheetTitle>
                  <SheetDescription>تصفح أقسام الموقع</SheetDescription>
                </div>
                <div className="flex flex-col space-y-4 mt-8">
                  <div className="mt-4"></div>
                  {navItems.filter(item => item.name).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center justify-start h-10 px-4 py-2 text-lg font-medium text-white hover:bg-zinc-800 rounded-md transition-colors"
                      onClick={() => {
                        setOpen(false);
                        window.dispatchEvent(new CustomEvent('startLoading'));
                      }}
                    >
                      {item.name}
                    </Link>
                  ))}

                  <SignedIn>
                    {roleLoading ? (
                      <div className="flex justify-center py-2">
                        <LoadingBar fullScreen={false} size="sm" />
                      </div>
                    ) : isAdmin ? (
                      <Link
                        href="/admin"
                        className="inline-flex items-center justify-start h-10 px-4 py-2 text-lg font-medium text-white hover:bg-zinc-800 rounded-md transition-colors"
                        onClick={() => {
                          setOpen(false);
                          window.dispatchEvent(new CustomEvent('startLoading'));
                        }}
                      >
                        <Layout size={18} className="ml-2" />
                        لوحة الإدارة
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/saved-cars"
                          className="inline-flex items-center justify-start h-10 px-4 py-2 text-lg font-medium text-white hover:bg-zinc-800 rounded-md transition-colors"
                          onClick={() => {
                            setOpen(false);
                            window.dispatchEvent(new CustomEvent('startLoading'));
                          }}
                        >
                          <CarFront size={18} className="ml-2" />
                          السيارات المحفوظة
                        </Link>
                        <Link
                          href="/reservations"
                          className="inline-flex items-center justify-start h-10 px-4 py-2 text-lg font-medium text-white hover:bg-zinc-800 rounded-md transition-colors"
                          onClick={() => {
                            setOpen(false);
                            window.dispatchEvent(new CustomEvent('startLoading'));
                          }}
                        >
                          <Heart size={18} className="ml-2" />
                          حجوزاتي
                        </Link>
                      </>
                    )}
                  </SignedIn>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <SignedIn>
            {isAdminPage ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-zinc-700 text-white hover:bg-zinc-800 transition-colors gap-2"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('startLoading'));
                }}
              >
                <span className="hidden md:inline">العودة للتطبيق</span>
                <ArrowLeft size={18} />
              </Link>
            ) : roleLoading ? (
              <div className="hidden md:flex items-center gap-2">
                <LoadingBar fullScreen={false} size="sm" />
              </div>
            ) : (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="hidden md:flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md font-medium text-sm transition-colors ml-4"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('startLoading'));
                    }}
                  >
                    <Layout size={18} />
                    <span>لوحة الإدارة</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/saved-cars"
                      className="hidden md:flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-md font-medium text-sm text-white transition-colors"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('startLoading'));
                      }}
                    >
                      <CarFront size={18} />
                      <span>السيارات المحفوظة</span>
                    </Link>

                    <Link
                      href="/reservations"
                      className="hidden md:flex items-center gap-2 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-md font-medium text-sm text-white transition-colors ml-4"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('startLoading'));
                      }}
                    >
                      <Heart size={18} />
                      <span>حجوزاتي</span>
                    </Link>
                  </>
                )}
              </>
            )}

            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </SignedIn>

          <SignedOut>
            <SignInButton>
              <Button variant="outline" className="text-white border-white/30" onClick={() => {
                // Dispatch custom event to show loading immediately
                window.dispatchEvent(new CustomEvent('startLoading'));
              }}>تسجيل الدخول</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
};

export default Header;