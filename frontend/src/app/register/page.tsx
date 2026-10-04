"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Lock, Mail, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "good" | "strong" | "">("");
  
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  useEffect(() => {
    if (!password) {
      setPasswordStrength("");
      return;
    }
    
    let strength = "weak";
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);

    if (hasMinLength && hasLetter && hasNumber) {
      strength = "good";
    }
    if (hasMinLength && hasLetter && hasNumber && hasSpecial) {
      strength = "strong";
    }
    setPasswordStrength(strength as "weak" | "good" | "strong");
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (passwordStrength === "weak" || passwordStrength === "") {
      setErrorMsg("Password is too weak. Please use a stronger password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, username, email, password }),
      });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseErr) {
          throw new Error("Failed to register: Server returned an invalid response");
        }

        let errorMessage = "Failed to register";
        if (errorData && typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (errorData && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((e: any) => {
              if (e && typeof e.msg === "string") return e.msg;
              try { return JSON.stringify(e); } catch { return "Invalid error format"; }
            })
            .join(", ");
        } else if (errorData && typeof errorData === "object") {
          try {
            errorMessage = JSON.stringify(errorData);
          } catch {
            errorMessage = "Failed to register (Unknown error object)";
          }
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data.requires_verification) {
        setStep(2);
        setTimeLeft(120);
      } else {
        login(data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      let finalMsg = "An unexpected error occurred";
      if (err instanceof Error) {
        finalMsg = err.message;
      } else if (typeof err === "string") {
        finalMsg = err;
      } else if (err && typeof err === "object") {
        try {
          finalMsg = JSON.stringify(err);
        } catch {
          finalMsg = String(err);
        }
      }
      
      // Final fallback to prevent React rendering issues
      if (finalMsg === "[object Object]" || typeof finalMsg !== "string") {
        finalMsg = "Failed to register (Invalid error format received)";
      }
      
      if (err instanceof Error && err.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          finalMsg = "No internet connection. Please check your network and try again.";
        } else {
          finalMsg = "Server is unreachable or down. Please try again later.";
        }
      }
      
      setErrorMsg(finalMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/verify-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to verify OTP");
      }

      const data = await res.json();
      login(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/resend-signup-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to resend OTP");
      }

      setTimeLeft(120);
      setErrorMsg(""); // clear any old errors
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while resending OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak": return "bg-red-500";
      case "good": return "bg-yellow-500";
      case "strong": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case "weak": return "Weak";
      case "good": return "Good";
      case "strong": return "Strong";
      default: return "";
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
        
        <h2 className="text-2xl font-bold text-center mb-6 tracking-tight">Create Account</h2>

        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm mb-4 border border-destructive/20"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {step === 1 && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
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

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-sm font-semibold">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Choose a unique username"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-sm font-semibold">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-1">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className={`font-semibold ${
                    passwordStrength === 'weak' ? 'text-red-500' :
                    passwordStrength === 'good' ? 'text-yellow-500' : 'text-green-500'
                  }`}>{getStrengthText()}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 rounded-full ${passwordStrength === 'weak' || passwordStrength === 'good' || passwordStrength === 'strong' ? getStrengthColor() : 'bg-transparent'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${passwordStrength === 'good' || passwordStrength === 'strong' ? getStrengthColor() : 'bg-transparent'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${passwordStrength === 'strong' ? getStrengthColor() : 'bg-transparent'}`}></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-sm font-semibold">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-xl border bg-muted pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all ${
                  confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500' : 
                  confirmPassword && password === confirmPassword ? 'border-green-500 focus:ring-green-500' : 'border-input'
                }`}
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute ${confirmPassword && password === confirmPassword ? 'right-9' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {confirmPassword && password === confirmPassword && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
          </button>
        </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-xl text-sm mb-2 border border-primary/20 text-center">
              Verification email sent to {email}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">OTP Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all tracking-widest font-mono"
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
                  onClick={handleResendOtp} 
                  className="text-primary font-semibold hover:underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
