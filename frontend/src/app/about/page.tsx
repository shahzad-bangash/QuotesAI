"use client";

import { Sparkles, BookOpen, Clock, FileText, Palette, LayoutDashboard, BrainCircuit, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutPage() {
  const features = [
    {
      title: "AI Graphic Generation",
      description: "Instantly transform plain text into stunning, customized quote graphics perfect for social media.",
      icon: Palette,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Document Intelligence (RAG)",
      description: "Upload your PDFs and TXT files. Our AI indexes them so you can search and extract exact quotes instantly.",
      icon: BrainCircuit,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Automated Scheduling",
      description: "Set a cron schedule and let the AI automatically generate and save new quote graphics to your library in the background.",
      icon: Clock,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Vast Book Library",
      description: "Search across massive databases to find the perfect quote from your favorite authors and books.",
      icon: BookOpen,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 lg:p-24 flex flex-col items-center justify-center text-center">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 shadow-inner shadow-primary/20">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Quote Curation</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
            QuotesAI is a powerful platform that merges artificial intelligence with beautiful design. Whether you are extracting knowledge from dense PDF documents or automatically scheduling social media graphics, QuotesAI handles the heavy lifting.
          </p>
          
          <Link 
            href="/dashboard"
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform flex items-center gap-3"
          >
            <Zap className="w-5 h-5" /> Get Started
          </Link>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-24 w-full text-left">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card text-card-foreground p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${feature.bg}`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
