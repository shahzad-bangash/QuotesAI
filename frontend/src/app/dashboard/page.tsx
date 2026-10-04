"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, BookOpen, FileText, Clock, ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (token) {
      // Fetch profile for welcome message
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setProfileName(data.name);
        if (data && data.is_admin) setIsAdmin(true);
      })
      .catch(err => console.error("Failed to fetch profile", err));
    }
  }, [isAuthenticated, router, token]);

  if (!isAuthenticated) return null;

  const features = [
    { name: "Generate Quotes", description: "Create AI-generated quote graphics instantly.", path: "/", icon: Sparkles, color: "bg-primary/10 text-primary" },
    { name: "Your Library", description: "View and manage your saved quote graphics.", path: "/library", icon: BookOpen, color: "bg-blue-500/10 text-blue-500" },
    { name: "Book Quotes", description: "Search books and extract famous exact quotes using AI.", path: "/book-quotes", icon: Search, color: "bg-orange-500/10 text-orange-500" },
    { name: "Documents", description: "Extract quotes from uploaded documents.", path: "/documents", icon: FileText, color: "bg-emerald-500/10 text-emerald-500" },
    { name: "Schedule", description: "Plan and automate your quote generation.", path: "/schedule", icon: Clock, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            Welcome {profileName || "User"}!
            {isAdmin && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Admin
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            QuotesAI generates beautiful quote graphics instantly. You can extract quotes from documents, search famous book quotes, or schedule automated posts.
          </p>
          <p className="text-muted-foreground">Select an option below to get started.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Link key={idx} href={feature.path}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-card text-card-foreground border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col h-full gap-4 cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feature.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{feature.name}</h2>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  <div className="mt-auto pt-4 flex justify-end">
                    <ArrowRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>
    </div>
  );
}
