"use client";

import { useState, useRef } from "react";
import { Upload, Search, BookOpen, Loader2, Save, Send, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Documents() {
  const router = useRouter();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [prompt, setPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{quote: string, relevance: string}[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isCleaningRAG, setIsCleaningRAG] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processUpload(selectedFile);
    }
  };

  const processUpload = async (uploadFile: File) => {
    setIsUploading(true);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadMessage(`Success! Indexed ${data.chunks_indexed} chunks from ${data.filename}.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setUploadMessage(`Error: ${data.detail}`);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setUploadMessage("Error: No internet connection. Please check your network and try again.");
        } else {
          setUploadMessage("Error: Server is unreachable or down. Please try again later.");
        }
      } else {
        setUploadMessage(`Error: ${err.message}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSearching(true);
    setHasSearched(false);
    setSearchError("");
    setResults([]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/extract`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ prompt, limit: 3 }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResults(data.quotes);
      } else {
        setSearchError(data.detail || "An error occurred during search.");
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setSearchError("No internet connection. Please check your network and try again.");
        } else {
          setSearchError("Server is unreachable or down. Please try again later.");
        }
      } else {
        setSearchError(err.message);
      }
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const saveToLibrary = async (quote: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/quotes/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          text: quote,
          author: "Unknown Author", 
          source: "From Uploaded Documents",
          tags: "rag"
        }),
      });
      showNotification("Saved to Library!");
    } catch (err) {
      showNotification("Failed to save to library.", "error");
    }
  };

  const sendToGenerator = (quote: string) => {
    const params = new URLSearchParams();
    params.set("quote", quote);
    router.push(`/?${params.toString()}`);
  };

  const handleCleanRAGClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Clean RAG Documents",
      message: "Are you sure you want to clean all RAG documents? This will permanently clear your custom document search data.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setIsCleaningRAG(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/rag`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to clean RAG documents");
          const data = await res.json();
          if (data.deleted_chunks === 0) {
            showNotification("Already cleared.");
          } else {
            showNotification("RAG documents cleaned successfully.");
          }
        } catch (error) {
          console.error(error);
          showNotification("Error cleaning RAG documents.", "error");
        } finally {
          setIsCleaningRAG(false);
        }
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Documents</h1>
          <p className="text-muted-foreground text-lg mb-4">
            Upload your PDF or TXT documents and let AI index them. You can then search for specific topics and extract perfect quotes from your own files to generate beautiful graphics.
          </p>
          <button 
            onClick={handleCleanRAGClick}
            disabled={isCleaningRAG}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {isCleaningRAG ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clean RAG / Documents
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
        
        {/* Upload Section */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-zinc-500" />
              <h2 className="text-lg font-semibold">Upload Book</h2>
            </div>
            <p className="text-sm text-zinc-500 mb-6">
              Upload a PDF or TXT book or essay. The AI will chunk and index it so you can search for quotes later.
            </p>
            
            <div className="flex flex-col gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Indexing..." : "Upload & Index Document"}
              </button>
            </div>
            
            {uploadMessage && (
              <div className={`mt-4 text-sm font-medium p-3 rounded-md ${uploadMessage.startsWith("Error:") ? "bg-red-50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 dark:bg-red-900/20" : "bg-muted text-muted-foreground"}`}>
                {uploadMessage}
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Ask the Library</h2>
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Find quotes about overcoming fear and adversity..."
                  className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <button
                  type="submit"
                  disabled={isSearching || !prompt.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>
            </form>
            
            {searchError && (
              <div className="mt-4 p-3 bg-red-50 dark:text-red-600 text-sm rounded-md border border-red-200">
                {searchError}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              {results.length > 0 && <h3 className="font-semibold text-zinc-500">Results</h3>}
              
              {!isSearching && hasSearched && results.length === 0 && !searchError && (
                <div className="text-center p-8 bg-muted rounded-xl border border-dashed border-border text-muted-foreground flex flex-col items-center gap-2">
                  <BookOpen className="w-8 h-8 opacity-20" />
                  <p className="font-medium text-foreground">No quotes found.</p>
                  <p className="text-sm">Make sure you have uploaded a document, or try a different search prompt.</p>
                </div>
              )}
              
              {results.map((res, i) => (
                <div key={i} className="p-4 bg-muted rounded-lg border border-border">
                  <p className="text-lg italic text-foreground mb-2">"{res.quote}"</p>
                  <p className="text-sm text-zinc-500 mb-4">{res.relevance}</p>
                  <div className="flex gap-2 justify-end border-t border-zinc-200 dark:border-zinc-700 pt-3">
                    <button
                      onClick={() => saveToLibrary(res.quote)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-background border border-border rounded hover:bg-muted transition-colors"
                    >
                      <Save className="h-3 w-3" /> Save to Library
                    </button>
                    <button
                      onClick={() => sendToGenerator(res.quote)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Send className="h-3 w-3" /> Generate Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        </div>
      </main>

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
