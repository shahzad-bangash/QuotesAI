"use client";

import { useState } from "react";
import { Search, Loader2, BookOpen, Plus, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface ExtractedQuote {
  text: string;
  author: string;
  source: string;
}

export default function BookQuotesPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [addedQuotes, setAddedQuotes] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setQuotes([]);
    setAddedQuotes(new Set());
    setErrorMsg("");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/book-quotes/search?query=${encodeURIComponent(query)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load quotes");
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setErrorMsg("No internet connection. Please check your network and try again.");
        } else {
          setErrorMsg("Server is unreachable or down. Please try again later.");
        }
      } else {
        setErrorMsg(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (quote: ExtractedQuote, index: number) => {
    if (addedQuotes.has(index)) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/quotes/`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: quote.text,
          author: quote.author,
          source: quote.source,
          tags: "book-quote"
        })
      });
      
      if (res.ok) {
        setAddedQuotes(prev => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Book Quotes Explorer</h1>
          <p className="text-muted-foreground text-lg">Search for any book by title or author, and our AI will extract famous exact quotes from it. You can save these quotes to your library to generate beautiful graphics later.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-12 relative flex items-center group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a book title (e.g. Pride and Prejudice)..."
          className="w-full bg-card border-2 border-border rounded-full py-4 pl-12 pr-32 text-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-500/20"
          >
            {errorMsg}
          </motion.div>
        )}

        {loading && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-zinc-500 gap-4"
          >
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-lg text-foreground">Reading the book...</p>
              <p className="text-sm mt-1">Downloading text and extracting famous quotes. This may take a few seconds.</p>
            </div>
          </motion.div>
        )}

        {!loading && quotes.length === 0 && query && (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-muted-foreground"
          >
            No quotes found. Try another book or author.
          </motion.div>
        )}

        {!loading && quotes.length > 0 && (
          <motion.div 
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {quotes.map((quote, idx) => (
              <motion.div 
                key={idx}
                variants={item}
                className="bg-card text-card-foreground p-6 rounded-3xl border border-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                
                <div className="mb-6 pl-4">
                  <p className="text-xl font-medium leading-relaxed italic mb-4 text-foreground/90">
                    "{quote.text}"
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                    <span className="text-primary">{quote.author}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quote.source}</span>
                  </div>
                </div>

                <div className="flex justify-end mt-auto pl-4">
                  <button
                    onClick={() => addToLibrary(quote, idx)}
                    disabled={addedQuotes.has(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      addedQuotes.has(idx) 
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" 
                        : "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground border border-border"
                    }`}
                  >
                    {addedQuotes.has(idx) ? (
                      <>
                        <Check className="w-4 h-4" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Add to Library
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
