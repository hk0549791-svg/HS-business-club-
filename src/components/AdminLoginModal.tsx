/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      // Store authenticated flag in session storage
      sessionStorage.setItem('hs_admin_auth', 'true');
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDefaultCredentials = () => {
    setUsername('admin');
    setPassword('AdminPassword@123');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 text-white text-center relative border-b border-rose-900/40">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-black tracking-wide">
            Admin Panel Login
          </h2>
          <p className="text-xs text-rose-200/80 mt-1">
            सुरक्षित एडमिन कंट्रोल पैनल (Super Admin Access)
          </p>
        </div>

        {/* Content & Form */}
        <div className="p-6 space-y-5">
          {/* Default Credentials Guidance Card */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <KeyRound className="w-4 h-4 text-blue-600" />
                Default Access Credentials:
              </span>
              <button
                type="button"
                onClick={handleUseDefaultCredentials}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 underline hover:text-blue-800 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto Fill
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">Username:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">admin</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">Password:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">AdminPassword@123</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Note: You can change both your username and password anytime in the Admin Settings tab.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Admin Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Login to Super Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel & Continue Browsing Marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
