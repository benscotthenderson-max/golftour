import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { GolferUser } from '../types/golf';
import { AuthService } from '../services/authService';

interface EmailVerificationModalProps {
  user: GolferUser;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (updatedUser: GolferUser) => void;
  restrictedFeatureName?: string; // e.g. "create tournaments", "participate in matches"
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  user,
  isOpen,
  onClose,
  onVerified,
  restrictedFeatureName,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit confirmation code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await AuthService.verifyEmailWithOtp(user.email, cleanCode);
      if (!res.success || !res.user) {
        setError(res.error || 'Invalid verification code. Please check the email sent by Supabase.');
        return;
      }

      setSuccessMsg('Email verified successfully! All features are now unlocked.');
      setTimeout(() => {
        onVerified(res.user!);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckStatus = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsCheckingStatus(true);
    try {
      const res = await AuthService.checkEmailVerificationStatus(user.id);
      if (res.verified && res.user) {
        setSuccessMsg('Email confirmed in Supabase! Unlocking account features.');
        setTimeout(() => {
          onVerified(res.user!);
          onClose();
        }, 1000);
      } else {
        setError('Your email is not confirmed yet. Please click the confirmation link in your inbox.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to check verification status with Supabase.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await AuthService.resendVerificationEmail(user.email);
      if (res.success) {
        setSuccessMsg(`A new verification email has been dispatched by Supabase to ${user.email}.`);
      } else {
        setError(res.error || 'Failed to send verification email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="email-verification-modal"
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 inline-block mb-1">
                Supabase Auth Verification
              </span>
              <h3 className="text-lg font-black text-white">Verify Your Email</h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            A confirmation email was dispatched by Supabase to{' '}
            <span className="font-bold text-white">{user.email}</span>. Click the link in your inbox or enter the verification code below.
          </p>

          {restrictedFeatureName && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email verification is required before you can {restrictedFeatureName}.</span>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Direct Link Confirmation Check */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Already clicked the link in your inbox?</span>
            </div>
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              <span>{isCheckingStatus ? 'Checking Supabase Auth...' : 'Check Confirmation Status'}</span>
            </button>
          </div>

          {/* Code Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Enter Verification Code / Token
              </label>
              <input
                type="text"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. 849201"
                className="w-full text-center tracking-[0.2em] font-mono text-xl font-black py-3 px-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || code.trim().length < 6}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying with Supabase...' : 'Submit Verification Code'}</span>
            </button>
          </form>

          {/* Resend & Help Options */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Didn't receive the email?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
              <span>{isResending ? 'Sending...' : 'Resend Email via Supabase'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
