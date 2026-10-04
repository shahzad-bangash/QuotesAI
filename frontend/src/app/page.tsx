"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { Loader2, Download, Image as ImageIcon, Sparkles, AlertCircle, Dices } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

import RANDOM_QUOTES from "@/data/quotes.json";


function GeneratorForm() {
  const searchParams = useSearchParams();
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [style, setStyle] = useState("dark");
  const [format, setFormat] = useState("jpeg");

  const [isGenerating, setIsGenerating] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [aiMetadata, setAiMetadata] = useState<{ topic?: string, tone?: string, style?: string } | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('quote');
      const a = searchParams.get('author');
      const s = searchParams.get('source');
      if (q) setQuote(q);
      if (a) setAuthor(a);
      if (s) setSource(s);
    }
  }, [searchParams]);

  const handleRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_QUOTES.length);
    const randomQuote = RANDOM_QUOTES[randomIndex];
    setQuote(randomQuote.quote);
    setAuthor(randomQuote.author);
    setSource(randomQuote.source);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg("");
    setImageBase64(null);
    setAiMetadata(null);
    setCaption("");
    setHashtags([]);

    try {
      const endpoint = style === "auto" ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/generate/auto` : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/generate/static`;

      const payload: any = { quote, author, source, format };
      if (style !== "auto") payload.style = style;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        let errorText = "Failed to generate image";
        if (data.detail) {
          errorText = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        }
        setErrorMsg(errorText);
        return;
      }

      // Backend returns "image_base64"
      setImageBase64(data.image_base64);
      if (data.caption) setCaption(data.caption);
      if (data.hashtags) setHashtags(data.hashtags);

      if (data.metadata) {
        setAiMetadata({
          topic: data.metadata.topic,
          tone: data.metadata.tone,
          style: data.metadata.style
        });
      }

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
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageBase64) return;
    const a = document.createElement("a");
    a.href = imageBase64;
    a.download = `quote-${Date.now()}.${format}`;
    a.click();
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">

      {/* Form Section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 flex flex-col gap-6"
      >
        <div className="bg-card text-card-foreground rounded-3xl p-8 border border-border shadow-xl shadow-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <h2 className="text-2xl font-bold tracking-tight">Generate Quote</h2>
            <button
              onClick={handleRandomQuote}
              type="button"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              <Dices className="w-4 h-4" /> Surprise Me
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Create beautiful, engaging quote graphics in seconds using AI.
          </p>

          <form onSubmit={handleGenerate} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Quote Text</label>
              <textarea
                required
                rows={4}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Write your quote here"
                className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Write author name here"
                  className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="write source name here"
                  className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Visual Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="auto">✨ Let AI Choose One Style</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="theme-crimson">Crimson</option>
                  <option value="theme-cyber">Cyber</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="jpeg">JPEG (Smaller)</option>
                  <option value="png">PNG (High Quality)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? "Generating Magic..." : "Generate Graphic"}
            </button>
          </form>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Preview Section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 flex flex-col gap-6"
      >
        <div className="bg-card text-card-foreground rounded-3xl p-8 border border-border shadow-xl shadow-black/5 min-h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Preview</h2>
            {imageBase64 && (
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            )}
          </div>

          <div className="flex-1 w-full flex items-center justify-center bg-muted rounded-2xl overflow-hidden relative group">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 text-muted-foreground"
                >
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="text-sm font-medium animate-pulse">Designing layout...</p>
                </motion.div>
              ) : imageBase64 ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full h-full min-h-[400px] flex items-center justify-center p-4"
                >
                  <Image
                    src={imageBase64}
                    alt="Generated Quote"
                    width={1080}
                    height={1080}
                    className="w-full h-auto max-w-[500px] object-contain shadow-2xl"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 text-muted-foreground"
                >
                  <ImageIcon className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Your creation will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Metadata Display */}
          <AnimatePresence>
            {caption && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="p-4 bg-muted rounded-2xl border border-border">
                  <p className="text-sm text-foreground font-medium mb-3">{caption}</p>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, i) => (
                        <span key={i} className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {aiMetadata && (
                  <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                    {aiMetadata.topic && <span>Topic: <span className="text-foreground">{aiMetadata.topic}</span></span>}
                    {aiMetadata.tone && <span>Tone: <span className="text-foreground">{aiMetadata.tone}</span></span>}
                    {aiMetadata.style && <span>Style: <span className="text-foreground">{aiMetadata.style}</span></span>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

    </div>
  );
}

export default function GeneratorPage() {
  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col items-center">
      <Suspense fallback={<div className="flex p-12 justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
        <GeneratorForm />
      </Suspense>
    </main>
  );
}
