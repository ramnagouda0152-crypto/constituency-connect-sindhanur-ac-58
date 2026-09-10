import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Phone,
  Lock,
  CreditCard,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Users,
  Loader2,
  RotateCw,
  Search,
  ChevronDown,
  Check,
  Key
} from 'lucide-react';
import { api, PublicVillage } from '../services/api.ts';
import { User, GramPanchayat } from '../types.ts';
import { Language, t } from '../translations.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: User) => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Directory for registration
  const [villagesList, setVillagesList] = useState<PublicVillage[]>([]);
  const [gpsList, setGpsList] = useState<GramPanchayat[]>([]);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [villagesError, setVillagesError] = useState<string | null>(null);
  const [villageSearchQuery, setVillageSearchQuery] = useState('');
  const [villageDropdownOpen, setVillageDropdownOpen] = useState(false);

  // Login form state
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password Reset form state
  const [resetMobile, setResetMobile] = useState('');
  const [resetVoterId, setResetVoterId] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regVoterId, setRegVoterId] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('MALE');
  const [regAddress, setRegAddress] = useState('');
  const [regVillageId, setRegVillageId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  useEffect(() => {
    loadPublicDirectories();
  }, []);

  useEffect(() => {
    if (activeTab === 'register' && villagesList.length === 0 && !villagesLoading) {
      loadPublicDirectories();
    }
  }, [activeTab]);

  const loadPublicDirectories = async () => {
    setVillagesLoading(true);
    setVillagesError(null);
    try {
      const [vils, gps] = await Promise.all([
        api.getPublicVillages(),
        api.getPublicGramPanchayats().catch(() => [])
      ]);
      const validVillages = (vils || []).filter(v => Boolean(v.village_id || (v as any).id));
      setVillagesList(validVillages);
      setGpsList(gps || []);
    } catch (err: any) {
      console.error('Failed to load villages for registration:', err);
      const msg = err?.message || err?.data?.error || 'Unable to load villages. Please try again.';
      setVillagesError(msg);
    } finally {
      setVillagesLoading(false);
    }
  };

  if (!isOpen) return null;

  // Selected village info for registration
  const selectedVillage = villagesList.find(v => v.village_id === regVillageId);
  const selectedGp = selectedVillage ? gpsList.find(g => g.gp_id === selectedVillage.gp_id) : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await api.loginWithCredentials({
        mobile: loginMobile.trim(),
        password: loginPassword
      });
      onSuccess(res.user);
    } catch (err: any) {
      if (err.code === 'ACCOUNT_PENDING') {
        setError('Your voter registration is PENDING verification by Constituency Administration. Please wait for approval.');
      } else {
        setError(err.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!regFullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (regMobile.replace(/[^0-9]/g, '').length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!regVoterId.trim() || regVoterId.trim().length < 5) {
      setError('Please provide a valid Voter ID / EPIC number.');
      return;
    }
    if (!regVillageId) {
      setError('Please choose your village in Sindhanur AC-58.');
      return;
    }
    const villageExists = villagesList.some(v => (v.village_id || (v as any).id) === regVillageId);
    if (!villageExists) {
      setError('Selected village is not valid for Sindhanur AC-58. Please select from the dropdown.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: regFullName.trim(),
        mobile: regMobile.trim(),
        voter_id: regVoterId.trim().toUpperCase(),
        dob: regDob || undefined,
        gender: regGender,
        address: regAddress.trim() || undefined,
        village_id: regVillageId,
        password: regPassword,
        confirm_password: regConfirmPassword
      });

      setSuccessMessage(
        'Voter registration submitted successfully! Your account has been assigned role: MEMBER and status: PENDING. The Super Admin will review your voter verification.'
      );
      // Pre-fill login mobile
      setLoginMobile(regMobile.trim());
      setLoginPassword('');
      // Reset registration form
      setRegFullName('');
      setRegMobile('');
      setRegVoterId('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegAddress('');
      setTimeout(() => {
        setActiveTab('login');
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    const cleanMobile = resetMobile.trim();
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please provide a valid 10-digit registered mobile number first.');
      return;
    }
    if (!resetVoterId.trim()) {
      setError('Please provide your official Voter ID (EPIC) number first.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await api.sendResetOtp({
        mobile: cleanMobile,
        voter_id: resetVoterId.trim().toUpperCase()
      });
      setOtpSent(true);
      setSuccessMessage(res.message || 'OTP has been dispatched to your registered mobile number.');
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP. Please verify your mobile and Voter ID.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanMobile = resetMobile.trim();
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please provide a valid 10-digit registered mobile number.');
      return;
    }
    if (!resetVoterId.trim()) {
      setError('Please provide your official Voter ID (EPIC) number.');
      return;
    }
    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification OTP sent to your registered mobile number.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        mobile: cleanMobile,
        voter_id: resetVoterId.trim().toUpperCase(),
        otp: resetOtp.trim(),
        new_password: resetNewPassword,
        confirm_password: resetConfirmPassword
      });

      setSuccessMessage(res.message || 'Password reset successfully! Please sign in with your new credentials.');
      setLoginMobile(cleanMobile);
      setLoginPassword('');
      setResetMobile('');
      setResetVoterId('');
      setResetOtp('');
      setOtpSent(false);
      setResetNewPassword('');
      setResetConfirmPassword('');
      setTimeout(() => {
        setActiveTab('login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header with Karnataka Emblem & Constituency Title */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
                AC58
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  Constituency Connect
                </h2>
                <p className="text-xs text-slate-300">
                  Sindhanur AC-58 • Raichur District • Karnataka
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              OFFICIAL PORTAL
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mt-4 border border-slate-700 gap-1">
            <button
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[38px] py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[38px] py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Voter Registration
            </button>
            <button
              onClick={() => {
                setActiveTab('reset');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[38px] py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'reset'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Reset Password
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit registered mobile number"
                    value={loginMobile}
                    onChange={e => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('reset');
                      setResetMobile(loginMobile);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Constituency Connect'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD RESET */}
          {activeTab === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  Official Voter Identity Verification
                </p>
                <p className="text-[11px] text-amber-800">
                  To securely reset your password, provide your registered mobile number and corresponding official Voter ID (EPIC) number.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Mobile Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={resetMobile}
                    onChange={e => setResetMobile(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voter ID / EPIC Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    autoCapitalize="characters"
                    placeholder="e.g. KA050580000001"
                    value={resetVoterId}
                    onChange={e => setResetVoterId(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Verification OTP *
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !resetMobile || resetMobile.length !== 10 || !resetVoterId}
                    className="text-xs font-bold text-amber-600 hover:text-amber-800 disabled:opacity-40 transition-colors"
                  >
                    {sendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit verification code"
                    value={resetOtp}
                    onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Verifying & Updating...' : 'Verify Voter Identity & Reset Password'}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Remembered your password? Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PUBLIC VOTER REGISTRATION */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Sindhanur AC-58 Voter Registration
                </p>
                <p className="text-[11px] text-blue-700">
                  Every public registrant receives role <strong>MEMBER</strong> and initial status <strong>PENDING</strong>. Your registration will be verified by the Constituency Administration before full activation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (as per Voter ID) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (Unique) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={regMobile}
                      onChange={e => setRegMobile(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voter ID / EPIC Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. KA0505812345"
                      value={regVoterId}
                      onChange={e => setRegVoterId(e.target.value.toUpperCase())}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={regDob}
                    onChange={e => setRegDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={regGender}
                    onChange={e => setRegGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Real AC-58 Village Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-village-input" className="block text-xs font-semibold text-slate-700">
                    Select Your Village (Sindhanur AC-58) *
                  </label>
                  {villagesList.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {villagesList.length} villages
                    </span>
                  )}
                </div>

                {villagesLoading ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span>Loading villages...</span>
                  </div>
                ) : villagesError ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">{villagesError}</p>
                        <p className="text-[11px] text-red-600 mt-0.5">Please check your connection and click retry.</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={loadPublicDirectories}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>
                ) : villagesList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span className="font-medium">No villages have been configured yet. Please contact the administrator.</span>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={loadPublicDirectories}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Search / Select trigger input */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-village-input"
                        type="text"
                        placeholder="Search village..."
                        value={villageSearchQuery}
                        onFocus={() => setVillageDropdownOpen(true)}
                        onChange={e => {
                          setVillageSearchQuery(e.target.value);
                          setVillageDropdownOpen(true);
                        }}
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setVillageDropdownOpen(!villageDropdownOpen)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Hidden input to enforce form validation */}
                    <input
                      type="text"
                      tabIndex={-1}
                      className="sr-only"
                      required
                      value={regVillageId}
                      onChange={() => {}}
                    />

                    {/* Dropdown list of filtered villages */}
                    {villageDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setVillageDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100">
                          {(() => {
                            const query = villageSearchQuery.trim().toLowerCase();
                            const filtered = villagesList.filter(v => {
                              if (!query) return true;
                              const name = (v.village_name || v.name || '').toLowerCase();
                              const kannada = (v.kannada_name || '').toLowerCase();
                              const gp = (v.gramPanchayat || v.gram_panchayat || v.gp_id || '').toLowerCase();
                              const id = (v.village_id || v.id || '').toLowerCase();
                              return name.includes(query) || kannada.includes(query) || gp.includes(query) || id.includes(query);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="p-3 text-center text-xs text-slate-500">
                                  No village found matching "{villageSearchQuery}"
                                </div>
                              );
                            }

                            return filtered.map(v => {
                              const vId = v.village_id || v.id;
                              const vName = v.village_name || v.name;
                              const isSelected = regVillageId === vId;
                              const gpName = v.gramPanchayat || v.gram_panchayat || gpsList.find(g => g.gp_id === v.gp_id)?.gp_name;

                              return (
                                <button
                                  key={vId}
                                  type="button"
                                  onClick={() => {
                                    setRegVillageId(vId);
                                    setVillageSearchQuery(vName + (v.kannada_name ? ` (${v.kannada_name})` : ''));
                                    setVillageDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/80 transition-colors flex items-center justify-between text-xs cursor-pointer ${
                                    isSelected ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold">{vName}</span>
                                      {v.kannada_name && (
                                        <span className="text-slate-500 text-[11px]">({v.kannada_name})</span>
                                      )}
                                    </div>
                                    {gpName && (
                                      <span className="text-[10px] text-slate-500 block mt-0.5">
                                        GP: {gpName}
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedVillage && (
                  <p className="mt-1.5 text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Selected Village: <strong className="text-slate-900">{selectedVillage.village_name || selectedVillage.name}</strong>
                      {selectedGp ? ` • Jurisdiction: ${selectedGp.gp_name}` : selectedVillage.gramPanchayat ? ` • Jurisdiction: ${selectedVillage.gramPanchayat} GP` : ''}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address / Ward / House No.
                </label>
                <input
                  type="text"
                  placeholder="Street, Ward, or House Number"
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {loading ? 'Submitting Registration...' : 'Submit Voter Registration'}
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
