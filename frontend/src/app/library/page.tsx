"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Trash2, Calendar, FileText, Loader2, Sparkles, ImageIcon, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface ImageMeta {
  id: string;
  name: string;
  url: string;
  type: string;
  size: string;
  created_at: string;
}

interface TextQuote {
  id: number;
  text: string;
  author: string;
  source: string;
}

export default function LibraryPage() {
  const { token } = useAuth();
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [textQuotes, setTextQuotes] = useState<TextQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jpeg" | "png" | "text">("jpeg");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingAllQuotes, setIsDeletingAllQuotes] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (token) {
      if (activeTab === "text") {
        fetchTextQuotes();
      } else {
        fetchImages();
      }
    }
  }, [activeTab, token]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/images?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load images");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (filename: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Picture",
      message: "Are you sure you want to delete this picture?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/images/${activeTab}/${filename}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to delete picture");
          showNotification("Picture deleted successfully.");
          fetchImages();
        } catch (error) {
          console.error(error);
          showNotification("Error deleting picture.", "error");
        }
      }
    });
  };

  const fetchTextQuotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/quotes/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load quotes");
      const data = await res.json();
      setTextQuotes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuoteClick = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Quote",
      message: "Are you sure you want to delete this quote?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/quotes/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to delete quote");
          showNotification("Quote deleted successfully.");
          fetchTextQuotes();
        } catch (error) {
          console.error(error);
          showNotification("Error deleting quote.", "error");
        }
      }
    });
  };

  const handleDeleteAllPicturesClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete All Pictures",
      message: "Are you sure you want to delete ALL generated pictures? This action is permanent and cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setIsDeletingAll(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/images/all`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to delete all pictures");
          const data = await res.json();
          if (data.deleted_count === 0) {
            showNotification("Already cleared.");
          } else {
            showNotification("All pictures deleted successfully.");
          }
          fetchImages();
        } catch (error) {
          console.error(error);
          showNotification("Error deleting pictures.", "error");
        } finally {
          setIsDeletingAll(false);
        }
      }
    });
  };

  const handleDeleteAllQuotesClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete All Text Quotes",
      message: "Are you sure you want to delete ALL your saved text quotes? This action is permanent and cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setIsDeletingAllQuotes(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/quotes/all`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to delete all quotes");
          const data = await res.json();
          if (data.deleted_count === 0) {
            showNotification("Already cleared.");
          } else {
            showNotification("All text quotes deleted successfully.");
          }
          fetchTextQuotes();
        } catch (error) {
          console.error(error);
          showNotification("Error deleting quotes.", "error");
        } finally {
          setIsDeletingAllQuotes(false);
        }
      }
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.01
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Your Library</h1>
          <p className="text-muted-foreground text-lg">View, manage, and download your generated quote graphics and saved text quotes.</p>
          {(activeTab === 'jpeg' || activeTab === 'png') && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button 
                onClick={handleDeleteAllPicturesClick}
                disabled={isDeletingAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
              >
                {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete All Pictures
              </button>
            </div>
          )}
          {activeTab === 'text' && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button 
                onClick={handleDeleteAllQuotesClick}
                disabled={isDeletingAllQuotes}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
              >
                {isDeletingAllQuotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete All Quotes
              </button>
            </div>
          )}
        </div>
        
        <div className="flex bg-muted p-1 rounded-2xl sm:rounded-full border border-border w-full md:w-auto">
          <button 
            onClick={() => setActiveTab("jpeg")}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "jpeg" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> JPEG
          </button>
          <button 
            onClick={() => setActiveTab("png")}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "png" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="hidden sm:inline">Raw Overlays (</span>PNG<span className="hidden sm:inline">)</span>
          </button>
          <button 
            onClick={() => setActiveTab("text")}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "text" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="hidden sm:inline">Text </span>Quotes
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-4"
          >
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-medium">Loading your library...</p>
          </motion.div>
        ) : (activeTab === "text" ? textQuotes.length === 0 : images.length === 0) ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl"
          >
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">It's quiet here</h3>
            <p className="text-sm">Generate some quotes to see them appear in your library.</p>
          </motion.div>
        ) : activeTab === "text" ? (
          <motion.div 
            key="text-grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {textQuotes.map((quote) => (
              <motion.div 
                key={quote.id}
                variants={item}
                className="bg-card text-card-foreground p-6 rounded-3xl border border-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                
                <div className="mb-6 pl-4">
                  <p className="text-lg font-medium leading-relaxed italic mb-4 text-foreground/90">
                    "{quote.text}"
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                    <span className="text-primary">{quote.author}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quote.source || "Unknown"}</span>
                  </div>
                </div>

                <div className="flex justify-end mt-auto pl-4">
                  <button
                    onClick={() => handleDeleteQuoteClick(quote.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {images.map((img) => (
              <motion.div 
                key={img.id}
                variants={item}
                className="group relative bg-card text-card-foreground rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md flex flex-col transition-all duration-300"
              >
                <div className="aspect-square relative overflow-hidden bg-muted p-4 flex items-center justify-center border-b border-border">
                  <Image
                    src={img.url.startsWith('http') ? img.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${img.url.startsWith('/') ? '' : '/'}${img.url}`}
                    alt={img.name}
                    width={400}
                    height={400}
                    unoptimized={true}
                    className="w-full h-auto object-contain shadow-md rounded-lg group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                
                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm truncate mb-2" title={img.name}>
                      {img.name.replace(".jpeg", "").replace(".png", "")}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {img.size}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(img.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-auto">
                    <a
                      href={img.url.startsWith('http') ? img.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${img.url.startsWith('/') ? '' : '/'}${img.url}`}
                      download
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                    <button
                      onClick={() => handleDeleteClick(img.name)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md z-50 max-w-sm ${
              notification.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-medium text-sm">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-card border border-border shadow-2xl p-6 rounded-3xl z-50 flex flex-col gap-5"
            >
              <div className="flex items-center gap-4 text-destructive">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{confirmDialog.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Yes, I'm sure
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
