"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Loader2, CheckCircle2, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = "Failed to send reset email.";
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          errorMessage = errorData.detail[0].msg;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMessage(data.message);
      setStatus("idle");
      setTimeLeft(120);
      setStep(2);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setMessage("No internet connection. Please check your network and try again.");
        } else {
          setMessage("Server is unreachable or down. Please try again later.");
        }
      } else {
        setMessage(err.message);
      }
      setStatus("error");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = "Failed to verify OTP.";
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          errorMessage = errorData.detail[0].msg;
        }
        throw new Error(errorMessage);
      }

      // OTP is valid, proceed to step 3
      setMessage("");
      setStatus("idle");
      setStep(3);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setMessage("No internet connection. Please check your network and try again.");
        } else {
          setMessage("Server is unreachable or down. Please try again later.");
        }
      } else {
        setMessage(err.message);
      }
      setStatus("error");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = "Failed to reset password.";
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          errorMessage = errorData.detail[0].msg;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMessage(data.message);
      setStatus("success");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          setMessage("No internet connection. Please check your network and try again.");
        } else {
          setMessage("Server is unreachable or down. Please try again later.");
        }
      } else {
        setMessage(err.message);
      }
      setStatus("error");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 min-h-[calc(100vh-100px)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card text-card-foreground p-8 rounded-3xl border border-border shadow-xl shadow-black/5"
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6 tracking-tight">Reset Password</h2>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center gap-4 py-4"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg">Password Reset Successfully</h3>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Redirecting to login...</p>
            <Link 
              href="/login"
              className="mt-4 w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg inline-flex justify-center"
            >
              Return to Login Now
            </Link>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {status === "error" && message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm mb-4 border border-destructive/20 text-center"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <p className="text-sm text-center text-muted-foreground mb-2">
                  Enter your email address and we'll send you an OTP code to reset your password.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-input bg-muted pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex justify-center"
                >
                  {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-xl text-sm mb-2 border border-primary/20 text-center">
                  OTP sent to {email}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-xl border border-input bg-muted pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 px-1 text-sm">
                  {timeLeft > 0 ? (
                    <span className="text-muted-foreground">Resend OTP in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleRequestOtp} 
                      className="text-primary font-semibold hover:underline"
                      disabled={status === "loading"}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex justify-center"
                >
                  {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-xl text-sm mb-2 border border-primary/20 text-center">
                  OTP Verified. Please enter your new password.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-input bg-muted pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-sm font-semibold">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-xl border pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all ${
                        confirmPassword && newPassword !== confirmPassword 
                        ? 'border-destructive/50 bg-destructive/5 focus:ring-destructive/20' 
                        : 'border-input bg-muted'
                      }`}
                      placeholder="Confirm new password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground px-1 mt-1">Must be at least 8 chars with uppercase, lowercase, number & special char.</p>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading" || (confirmPassword !== "" && newPassword !== confirmPassword)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex justify-center"
                >
                  {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </button>
              </form>
            )}
          </>
        )}

        {status !== "success" && (
          <p className="text-center text-sm text-zinc-500 mt-8">
            Remember your password?{" "}
            <Link href="/login" className="text-foreground font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
