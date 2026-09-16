import React, { useState } from 'react';
import { GolferUser, TeeColor } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { AuthService, generateInitialsAvatar } from '../services/authService';
import { 
  Trophy, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock,
  ArrowRight, 
  Check,
  UserPlus,
  LogIn,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  Camera,
  Upload,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { processProfileImageFile } from '../utils/imageUpload';
import { uploadAvatarToSupabase, isSupabaseConfigured } from '../lib/supabase';

interface OnboardingAuthScreenProps {
  onComplete?: (user: GolferUser) => void;
  existingUsers?: GolferUser[];
}

const AVATAR_PALETTES: Array<{ id: string; name: string; gradient: string }> = [
  { id: 'emerald', name: 'Emerald', gradient: 'from-emerald-600 to-emerald-900' },
  { id: 'teal', name: 'Teal', gradient: 'from-teal-600 to-teal-900' },
  { id: 'sky', name: 'Ocean Sky', gradient: 'from-sky-600 to-sky-900' },
  { id: 'amber', name: 'Amber Gold', gradient: 'from-amber-600 to-amber-900' },
  { id: 'purple', name: 'Royal Purple', gradient: 'from-purple-600 to-purple-900' },
  { id: 'slate', name: 'Graphite Slate', gradient: 'from-slate-600 to-slate-900' },
];

export const OnboardingAuthScreen: React.FC<OnboardingAuthScreenProps> = ({
  onComplete,
  existingUsers = [],
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'verify'>(
    existingUsers.length > 0 ? 'login' : 'signup'
  );

  // Email verification state
  const [pendingUser, setPendingUser] = useState<GolferUser | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sign up fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [handicapIndex, setHandicapIndex] = useState<number>(12.4);
  const [homeClubId, setHomeClubId] = useState<string>(MOCK_COURSES[0]?.id || 'course-simola-estate');
  const [preferredTees, setPreferredTees] = useState<TeeColor>('White');
  const [selectedPalette, setSelectedPalette] = useState('emerald');
  const [customPhotoURL, setCustomPhotoURL] = useState('');
  const [bio, setBio] = useState('Passionate golfer ready for matchplay & tournament rounds.');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDraggingOverSignUp, setIsDraggingOverSignUp] = useState(false);
  const signUpFileInputRef = React.useRef<HTMLInputElement>(null);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Status & Error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Compute GolfTour skill level (0.5 to 7.0 scale based on WHS handicap)
  const computedLevel = Math.max(0.5, Math.min(7.0, Number((7.0 - (handicapIndex * 0.15)).toFixed(2))));
  const selectedClub = MOCK_COURSES.find(c => c.id === homeClubId) || MOCK_COURSES[0];

  const handleDeviceAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      setErrorMessage(null);

      // Try uploading to Supabase Storage bucket 'avatars' if live
      if (isSupabaseConfigured()) {
        try {
          const publicUrl = await uploadAvatarToSupabase(file, `avatar-signup-${Date.now()}`);
          if (publicUrl) {
            setCustomPhotoURL(publicUrl);
            return;
          }
        } catch (storageErr) {
          console.warn('[Onboarding] Supabase avatar upload fallback:', storageErr);
        }
      }

      // Local high-quality image processing fallback
      const base64 = await processProfileImageFile(file);
      setCustomPhotoURL(base64);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process selected picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = displayName.trim();
    const cleanUsername = username.trim().replace(/^@/, '');
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    const avatarUrl = customPhotoURL.trim() || generateInitialsAvatar(cleanName, selectedPalette);

    try {
      const result = await AuthService.signUpAsync({
        displayName: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
        handicapIndex,
        homeClubId: selectedClub.id,
        homeClubName: selectedClub.name,
        city: selectedClub.city || 'Garden Route',
        country: selectedClub.country || 'South Africa',
        preferredTees,
        bio,
        photoURL: avatarUrl,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.sessionCreated && result.user) {
        triggerConfetti();
        if (onComplete) {
          onComplete(result.user);
        }
        return;
      }

      if (result.user) {
        setPendingUser(result.user);
        setAuthMode('verify');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setErrorMessage(null);
    setResendNotice(null);

    if (!verificationInput.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await AuthService.verifyEmailWithOtp(pendingUser.email, verificationInput);

      if (!res.success || !res.user) {
        setErrorMessage(res.error || 'Invalid code. Please check your email or click the link in your inbox.');
        return;
      }

      triggerConfetti();
      if (onComplete) {
        onComplete(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingUser) return;
    setErrorMessage(null);
    setResendNotice(null);
    setIsVerifying(true);
    try {
      const res = await AuthService.checkEmailVerificationStatus(pendingUser.id);
      if (res.verified && res.user) {
        triggerConfetti();
        if (onComplete) {
          onComplete(res.user);
        }
      } else {
        setErrorMessage(`Email has not been confirmed yet. Please check ${pendingUser.email} and click the confirmation link.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to check verification status.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUser) return;
    setErrorMessage(null);
    setResendNotice(null);

    const res = await AuthService.resendVerificationEmail(pendingUser.email);
    if (res.success) {
      setResendNotice(`A confirmation email has been dispatched by Supabase to ${pendingUser.email}.`);
    } else {
      setErrorMessage(res.error || 'Failed to dispatch verification email.');
    }
  };

  const handleContinueUnverified = () => {
    if (pendingUser && onComplete) {
      onComplete(pendingUser);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginIdentifier.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const result = await AuthService.loginAsync({
      identifier: loginIdentifier.trim(),
      password: loginPassword,
    });
    setIsLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    if (result.user && onComplete) {
      triggerConfetti();
      onComplete(result.user);
    }
  };

  const currentInitials = displayName.trim() 
    ? displayName.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'GL';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative ambient background */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-900/40 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Trophy className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Golf<span className="text-emerald-500">Tour</span></h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Championship matchplay and tournament network. Sign up or log in to manage your official handicap, matches, and real-time Ryder Cup teams.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Profile</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          {authMode === 'verify' && (
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-xs cursor-default"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Verify Email</span>
            </button>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resend Success Notification */}
        {resendNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resendNotice}</span>
          </div>
        )}

        {/* MODE 0: EMAIL VERIFICATION */}
        {authMode === 'verify' && pendingUser && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white">Confirmation Email Dispatched via Supabase</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Supabase Auth has dispatched an activation email to <span className="font-bold text-emerald-300">{pendingUser.email}</span>. Please check your inbox and click the verification link, or enter the confirmation code below.
                </p>
              </div>
            </div>

            {/* Verification Actions */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Clicked the email link?</span>
                <span className="text-2xs text-emerald-400 font-normal">Direct Supabase Sync</span>
              </div>
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isVerifying}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Checking Status...' : "I've Confirmed in My Email — Check Status"}</span>
              </button>
            </div>

            {/* Code Form (if OTP / code token was received) */}
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Or Enter 6-Digit Verification Code / Token
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={verificationInput}
                  onChange={e => setVerificationInput(e.target.value)}
                  placeholder="e.g. 849201"
                  className="w-full text-center tracking-[0.2em] font-mono text-xl font-black py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 focus:border-emerald-500 text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || verificationInput.trim().length < 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying with Supabase...' : 'Submit Verification Code & Launch App'}</span>
              </button>
            </form>

            {/* Resend & Skip */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={handleResendCode}
                className="text-emerald-400 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier(pendingUser.email);
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-slate-200 transition text-2xs font-semibold cursor-pointer underline"
              >
                Back to Log In
              </button>

              <button
                type="button"
                onClick={handleContinueUnverified}
                className="text-slate-500 hover:text-slate-400 transition text-2xs font-medium cursor-pointer"
              >
                Skip For Now
              </button>
            </div>
          </div>
        )}

        {/* MODE 1: LOG IN */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Username or Email *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. your_handle or you@example.com"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Verifying Account...' : 'Sign In to Golf Network'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMessage(null); }}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Create one now
                </button>
              </span>
            </div>
          </form>
        )}

        {/* MODE 2: SIGN UP */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={displayName}
                    onChange={e => {
                      setDisplayName(e.target.value);
                      if (!username) {
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Golf Handle / Username *</label>
                <div className="relative">
                  <span className="text-slate-500 text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2">@</span>
                  <input
                    type="text"
                    required
                    placeholder="jordan_golf"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Handicap & GolfTour Level Live Preview */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> WHS Handicap Index
                  </span>
                  <p className="text-[11px] text-slate-400">Used for net matchplay strokes & tournament flighting.</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-white">{handicapIndex.toFixed(1)}</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="36"
                step="0.1"
                value={handicapIndex}
                onChange={e => setHandicapIndex(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setHandicapIndex(0.0)}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                    handicapIndex === 0 ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Scratch (0.0)
                </button>
                <button
                  type="button"
                  onClick={() => setHandicapIndex(5.4)}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                    handicapIndex === 5.4 ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Single (5.4)
                </button>
                <button
                  type="button"
                  onClick={() => setHandicapIndex(12.4)}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                    handicapIndex === 12.4 ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Mid HCP (12.4)
                </button>
                <button
                  type="button"
                  onClick={() => setHandicapIndex(22.0)}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                    handicapIndex === 22.0 ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  High HCP (22.0)
                </button>
              </div>
            </div>

            {/* Home Club & Preferred Tees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Home Golf Course</label>
                <select
                  value={homeClubId}
                  onChange={e => setHomeClubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {MOCK_COURSES.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.city || course.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Default Tee Box</label>
                <select
                  value={preferredTees}
                  onChange={e => setPreferredTees(e.target.value as TeeColor)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Championship">Championship (Black / Gold)</option>
                  <option value="Back">Back (White / Club)</option>
                  <option value="Middle">Middle (Yellow / Regular)</option>
                  <option value="Forward">Forward (Red / Ladies)</option>
                </select>
              </div>
            </div>

            {/* Profile Picture Device Picker */}
            <div className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Profile Picture (Optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload from your device storage or camera roll.
                  </p>
                </div>
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-emerald-500 shadow-md">
                    <img
                      src={customPhotoURL.trim() || generateInitialsAvatar(displayName || 'Golfer', selectedPalette)}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {customPhotoURL && (
                    <button
                      type="button"
                      onClick={() => setCustomPhotoURL('')}
                      className="absolute -top-1 -right-1 p-0.5 bg-rose-600 hover:bg-rose-500 rounded-full text-white cursor-pointer"
                      title="Remove custom photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Drag and drop / device file picker */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingOverSignUp(true); }}
                onDragLeave={() => setIsDraggingOverSignUp(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingOverSignUp(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleDeviceAvatarUpload(file);
                }}
                onClick={() => signUpFileInputRef.current?.click()}
                className={`p-3 rounded-xl border border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDraggingOverSignUp 
                    ? 'border-emerald-400 bg-emerald-500/10' 
                    : 'border-slate-800 hover:border-emerald-500/50 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  ref={signUpFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleDeviceAvatarUpload(file);
                    e.target.value = '';
                  }}
                />
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1.5">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  {isUploadingAvatar ? 'Processing image...' : 'Tap to select photo from device'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Or drag and drop an image file (PNG, JPEG, WebP)
                </span>
              </div>
            </div>

            {/* Player Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Player Bio</label>
              <input
                type="text"
                placeholder="Share your golfing goals or favorite courses..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Creating Golfer Profile...' : 'Complete Profile & Launch App'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
