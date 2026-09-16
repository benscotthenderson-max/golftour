import React, { useState } from 'react';
import { Mail, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { GolferUser } from '../types/golf';
import { AuthService } from '../services/authService';

interface EmailVerificationBannerProps {
  user: GolferUser;
  onOpenVerifyModal: (featureContext?: string) => void;
  onEmailVerified: (updatedUser: GolferUser) => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  user,
  onOpenVerifyModal,
  onEmailVerified,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Only show if user is not verified
  if (user.emailVerified) return null;

  const handleQuickResend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSending(true);
    setResendStatus(null);

    try {
      const res = await AuthService.resendVerificationEmail(user.email);
      if (res.success) {
        setResendStatus('Verification email re-sent via Supabase!');
        setTimeout(() => setResendStatus(null), 3500);
      } else {
        setResendStatus(res.error || 'Failed to send email.');
      }
    } catch {
      setResendStatus('Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      id="email-verification-banner"
      className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-y sm:border sm:rounded-2xl border-amber-400/40 p-3 sm:p-3.5 mb-4 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-400/30">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-black uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700/50">
                Action Required
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Email Verification Needed
              </span>
            </div>
            <p className="text-2xs text-slate-600 dark:text-slate-300 mt-0.5">
              A verification email was sent to <span className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</span>. Please verify to unlock tournament creation and match participation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleQuickResend}
            disabled={isSending}
            className="text-2xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
            <span>{resendStatus || (isSending ? 'Sending...' : 'Resend Email')}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenVerifyModal()}
            className="text-2xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 py-1.5 px-3 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Mail className="w-3 h-3" />
            <span>Verify Now</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
