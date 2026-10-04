"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Loader2, Upload, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, KeyRound, Eye, EyeOff, Lock, Mail, Edit2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ProfilePage() {
  const { isAuthenticated, token, logout } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<{ id: number; username: string; email?: string; name: string; profile_pic_url?: string; is_admin?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Profile Picture States
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingPic, setIsDeletingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode Toggles
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Profile Info States
  const [infoName, setInfoName] = useState("");
  const [infoUsername, setInfoUsername] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoSuccess, setInfoSuccess] = useState("");

  // Email States
  const [emailValue, setEmailValue] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);

  // Password States
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Account Deletion States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        setProfile(data);
        setInfoName(data.name || "");
        setInfoUsername(data.username || "");
        setEmailValue(data.email || "");
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
          if (!navigator.onLine) setError("No internet connection.");
          else setError("Server is unreachable or down.");
        } else {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, token, router, logout]);

  useEffect(() => {
    if (isEmailVerifying && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [isEmailVerifying, timeLeft]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      setError("");
      
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile/picture`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error("Failed to upload profile picture");

        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, profile_pic_url: data.profile_pic_url } : null);
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
          if (!navigator.onLine) setError("No internet connection.");
          else setError("Server is unreachable or down.");
        } else {
          setError(err.message);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeletePicture = async () => {
    setIsDeletingPic(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile/picture`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete profile picture");
      setProfile((prev) => prev ? { ...prev, profile_pic_url: undefined } : null);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        if (!navigator.onLine) setError("No internet connection.");
        else setError("Server is unreachable or down.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsDeletingPic(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoLoading(true);
    setInfoError("");
    setInfoSuccess("");

    try {
      const payload: any = {};
      if (infoName !== profile?.name) payload.name = infoName;
      if (infoUsername !== profile?.username) payload.username = infoUsername;

      if (Object.keys(payload).length === 0) {
        setInfoSuccess("No changes to save.");
        setInfoLoading(false);
        setIsEditingInfo(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update profile info");

      setProfile(data.user);
      setInfoSuccess("Profile info updated successfully!");
      setIsEditingInfo(false);
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setInfoLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    setEmailSuccess("");

    if (!emailCurrentPassword) {
      setEmailError("Current password is required to change email.");
      setEmailLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: emailValue, current_password: emailCurrentPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update email");

      if (data.requires_otp) {
        setIsEmailVerifying(true);
        setTimeLeft(120);
        setEmailSuccess(data.message);
      }
    } catch (err: any) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ otp: emailOtp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to verify email");

      setProfile(data.user);
      setIsEmailVerifying(false);
      setEmailOtp("");
      setEmailSuccess("Email updated successfully!");
      setEmailCurrentPassword("");
      setIsEditingEmail(false);
    } catch (err: any) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile/resend-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to resend OTP");
      setTimeLeft(120);
      setEmailError("");
    } catch (err: any) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordCurrent) {
      setPasswordError("Current password is required.");
      setPasswordLoading(false);
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setPasswordError("New passwords do not match.");
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ password: passwordNew, current_password: passwordCurrent })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update password");

      setPasswordSuccess("Password updated successfully!");
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
      setIsEditingPassword(false);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError("");
    if (deleteConfirmation !== profile?.username) {
      setDeleteError("Username does not match");
      setDeleteLoading(false);
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete account");
      }
      logout();
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleteLoading(false);
    }
  };

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Account Settings</h1>

      {/* Profile Info Box */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Profile Information</h2>
          {!isEditingInfo ? (
            <button onClick={() => setIsEditingInfo(true)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <button onClick={() => {
              setIsEditingInfo(false);
              setInfoName(profile?.name || "");
              setInfoUsername(profile?.username || "");
            }} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full border-4 border-muted overflow-hidden bg-muted flex-shrink-0">
              {profile?.profile_pic_url ? (
                <img src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${profile.profile_pic_url}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-12 h-12 text-primary/50" />
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center justify-center gap-2 text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl transition-colors w-full"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
              </button>
              {profile?.profile_pic_url && (
                <button 
                  type="button" 
                  onClick={handleDeletePicture} 
                  className="flex items-center justify-center gap-2 text-sm font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-xl transition-colors w-full"
                  disabled={isDeletingPic}
                >
                  {isDeletingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 w-full">
            {infoError && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20 mb-4">{infoError}</div>}
            {infoSuccess && <div className="p-3 bg-green-500/10 text-green-600 rounded-xl text-sm border border-green-500/20 mb-4">{infoSuccess}</div>}
            
            {!isEditingInfo ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium text-lg">{profile?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Username</p>
                  <p className="font-medium text-lg">@{profile?.username}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateInfo} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={infoName} onChange={(e) => setInfoName(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={infoUsername} onChange={(e) => setInfoUsername(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={infoLoading} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                    {infoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Email Box */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Email Address</h2>
          {!isEditingEmail && !isEmailVerifying ? (
            <button onClick={() => setIsEditingEmail(true)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" /> Change Email
            </button>
          ) : (
            <button onClick={() => {
              setIsEditingEmail(false);
              setIsEmailVerifying(false);
              setEmailValue(profile?.email || "");
              setEmailCurrentPassword("");
              setEmailSuccess("");
              setEmailError("");
            }} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>

        {emailError && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20 mb-4 max-w-lg">{emailError}</div>}
        {emailSuccess && <div className="p-3 bg-green-500/10 text-green-600 rounded-xl text-sm border border-green-500/20 mb-4 max-w-lg">{emailSuccess}</div>}
        
        {!isEditingEmail && !isEmailVerifying ? (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Email</p>
            <p className="font-medium text-lg">{profile?.email}</p>
          </div>
        ) : (
          <form onSubmit={isEmailVerifying ? handleVerifyEmail : handleUpdateEmail} className="flex flex-col gap-4 max-w-lg">
            {!isEmailVerifying ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">New Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" required value={emailValue} onChange={(e) => setEmailValue(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={showEmailCurrentPassword ? "text" : "password"} required value={emailCurrentPassword} onChange={(e) => setEmailCurrentPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => setShowEmailCurrentPassword(!showEmailCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showEmailCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Required to change your email address.</p>
                </div>
                <div className="flex mt-2">
                  <button type="submit" disabled={emailLoading} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Email"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" required value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} maxLength={6} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter 6-digit OTP" />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  {timeLeft > 0 ? (
                    <span className="text-muted-foreground">Resend OTP in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  ) : (
                    <button type="button" onClick={handleResendEmailOtp} disabled={emailLoading} className="text-primary font-semibold hover:underline">Resend OTP</button>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="submit" disabled={emailLoading || emailOtp.length !== 6} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Email"}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* Password Box */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Password & Security</h2>
          {!isEditingPassword ? (
            <button onClick={() => setIsEditingPassword(true)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" /> Change Password
            </button>
          ) : (
            <button onClick={() => {
              setIsEditingPassword(false);
              setPasswordCurrent("");
              setPasswordNew("");
              setPasswordConfirm("");
            }} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>

        {passwordError && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20 mb-4 max-w-lg">{passwordError}</div>}
        {passwordSuccess && <div className="p-3 bg-green-500/10 text-green-600 rounded-xl text-sm border border-green-500/20 mb-4 max-w-lg">{passwordSuccess}</div>}
        
        {!isEditingPassword ? (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Password</p>
            <p className="font-medium text-lg">••••••••</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 max-w-lg">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPasswordCurrent ? "text" : "password"} required value={passwordCurrent} onChange={(e) => setPasswordCurrent(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <button type="button" onClick={() => setShowPasswordCurrent(!showPasswordCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswordCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPasswordNew ? "text" : "password"} required value={passwordNew} onChange={(e) => setPasswordNew(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <button type="button" onClick={() => setShowPasswordNew(!showPasswordNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswordNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPasswordConfirm ? "text" : "password"} required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${passwordConfirm && passwordNew !== passwordConfirm ? 'border-destructive/50 focus:ring-destructive/20' : 'border-input bg-background'}`} />
                <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex mt-2">
              <button type="submit" disabled={passwordLoading || (passwordConfirm !== "" && passwordNew !== passwordConfirm)} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 shadow-sm mt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-destructive mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button onClick={() => setDeleteModalOpen(true)} className="bg-destructive text-destructive-foreground px-6 py-2.5 rounded-xl font-semibold hover:bg-destructive/90 transition-colors text-sm whitespace-nowrap">
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You will lose all your generated quotes, history, and profile data permanently.
              </p>
              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">
                    Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground select-all">{profile?.username}</span> to confirm
                  </label>
                  <input type="text" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50" placeholder={profile?.username} />
                </div>
                {deleteError && <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{deleteError}</div>}
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                  <button type="submit" disabled={deleteLoading || deleteConfirmation !== profile?.username} className="bg-destructive text-destructive-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently Delete Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
