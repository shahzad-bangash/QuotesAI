"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Schedule {
  id: number;
  cron_expression: string;
  topic_filter: string | null;
  is_active: boolean;
}

export default function SchedulePage() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cron, setCron] = useState("0 9 * * *");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (token) fetchSchedules();
  }, [token]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/schedules/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) return; 
      const data = await res.json();
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/schedules/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          cron_expression: cron,
          topic_filter: topic || null,
        }),
      });
      setCron("0 9 * * *");
      setTopic("");
      await fetchSchedules();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/schedules/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Schedule</h1>
        <p className="text-muted-foreground text-lg">
          Plan and automate your quote generation. You can configure cron jobs (like "0 9 * * *" for 9 AM daily) to automatically run the AI generator in the background and create quote graphics based on specific topics.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Create Schedule Form */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-1/3 flex flex-col gap-6"
      >
        <div className="bg-card text-card-foreground p-8 rounded-3xl border border-border shadow-xl shadow-black/5">
          <h2 className="text-xl font-bold tracking-tight mb-2">New Automaton</h2>
          <p className="text-sm text-zinc-500 mb-6">Set up a cron job to automatically generate quotes in the background.</p>
          
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Cron Schedule</label>
              <input
                type="text"
                required
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="0 9 * * *"
                className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
              <p className="text-xs text-zinc-500">Minute Hour Day Month Weekday</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Topic Filter</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Technology, Philosophy"
                className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={isCreating}
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg"
            >
              {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {isCreating ? "Scheduling..." : "Create Schedule"}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Schedule List */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-2/3 flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold tracking-tight mb-2">Active Automations</h2>
        
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center p-12 text-zinc-400"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
            </motion.div>
          ) : schedules.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-card text-card-foreground rounded-3xl border-2 border-dashed border-border p-12 flex flex-col items-center justify-center text-center gap-4"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">No schedules yet</h3>
              <p className="text-sm text-zinc-500">Create one to automate your quote generation pipeline.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {schedules.map((sched) => (
                <motion.div 
                  key={sched.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono bg-muted px-3 py-1 rounded-lg text-sm font-semibold tracking-widest text-muted-foreground">
                        {sched.cron_expression}
                      </span>
                      {sched.is_active && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-2 font-medium">
                      Topic Filter: <span className="text-zinc-900 dark:text-zinc-100">{sched.topic_filter || "None"}</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(sched.id)}
                    className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
    </div>
  );
}
