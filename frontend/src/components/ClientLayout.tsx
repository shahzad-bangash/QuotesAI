"use client";

import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LogOut, Sparkles, BookOpen, Clock, FileText, Menu, X, Palette, Check, LayoutDashboard, Search, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTheme } from "next-themes";

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!mounted) return <div className="w-8 h-8" />;

  const themes = [
    { id: "light", name: "Light", color: "bg-white border-zinc-200" },
    { id: "dark", name: "Dark", color: "bg-zinc-900 border-zinc-700" },
    { id: "theme-crimson", name: "Crimson", color: "bg-[#451a1a] border-[#7f1d1d]" },
    { id: "theme-cyber", name: "Cyber", color: "bg-[#0b1021] border-[#1e3a8a]" },
  ];

  return (
    <div className="relative z-50" ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-48 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl z-50 overflow-hidden p-2"
          >
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  theme === t.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border ${t.color}`} />
                  {t.name.split(" ")[0]}
                </div>
                {theme === t.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password") {
    return null;
  }

  const navItems = [
    { name: "About", path: "/about", icon: Sparkles },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Generator", path: "/", icon: Palette },
    { name: "Library", path: "/library", icon: BookOpen },
    { name: "Book Quotes", path: "/book-quotes", icon: Search },
    { name: "Documents", path: "/documents", icon: FileText },
    { name: "Schedule", path: "/schedule", icon: Clock },
  ];

  const mobileNavContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const mobileNavItem = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between h-full max-w-7xl mx-auto px-4 md:px-8 gap-2">
          
          {/* Logo Section */}
          <div className="flex items-center lg:justify-self-start shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 z-50 shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 bg-primary rounded-xl shadow-inner shadow-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground shrink-0" />
              </div>
              <span className="font-bold text-lg xl:text-xl tracking-tight text-foreground">QuotesAI</span>
            </Link>
          </div>
          
          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex justify-center items-center gap-0.5 xl:gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors group whitespace-nowrap ${
                    isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right: Controls & Auth */}
          <div className="hidden lg:flex items-center justify-end lg:justify-self-end gap-2 xl:gap-4 shrink-0">
            <ThemeSwitcher />
            <div className="w-px h-5 bg-border/80" />
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2 xl:gap-3">
                <Link 
                  href="/profile"
                  className="flex items-center justify-center w-8 h-8 xl:w-9 xl:h-9 rounded-full border border-border/60 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm shrink-0"
                  title="Profile"
                >
                  <User className="w-4 h-4" />
                </Link>
                <button 
                  onClick={logout}
                  className="px-3 xl:px-4 py-2 text-xs xl:text-sm font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex items-center gap-1.5 xl:gap-2 whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="px-4 xl:px-5 py-2 text-xs xl:text-sm font-semibold bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex lg:hidden items-center gap-2 z-50 shrink-0">
            <ThemeSwitcher />
            <button 
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-2xl flex flex-col lg:hidden border-t border-border/50"
          >
            <motion.div 
              variants={mobileNavContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col px-6 py-8 gap-1 h-full overflow-y-auto"
            >
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Navigation</h4>
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <motion.div variants={mobileNavItem} key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold transition-all ${
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      {item.name}
                    </Link>
                  </motion.div>
                );
              })}
              
              <div className="h-px bg-border/50 my-6 mx-2" />
              
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Account</h4>
              {isAuthenticated ? (
                <>
                  <motion.div variants={mobileNavItem}>
                    <Link 
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      Profile
                    </Link>
                  </motion.div>
                  <motion.div variants={mobileNavItem}>
                    <button 
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="flex items-center w-full gap-4 px-4 py-4 mt-2 rounded-2xl text-lg font-bold text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="w-6 h-6" /> Logout
                    </button>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={mobileNavItem}>
                  <Link 
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-lg font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  >
                    Sign In
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="pt-24 min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
