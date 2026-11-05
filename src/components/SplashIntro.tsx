/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface SplashIntroProps {
  onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 4; // reaches 100 in ~1.8 seconds
      });
    }, 60);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1c54b2] via-[#2874f0] to-[#0f3473] text-white overflow-hidden p-6 select-none"
      >
        {/* Background ambient lighting effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Floating particles */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Central Brand Container */}
        <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.6, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
            className="mb-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl"
          >
            <Logo size="xl" variant="brand" showTagline={false} />
          </motion.div>

          {/* Subtitle Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-blue-950 text-xs font-bold uppercase tracking-wider mb-4 shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-900" />
            <span>India’s Next-Gen Multi-Vendor Platform</span>
          </motion.div>

          {/* Developer Highlight Card (Specified Requirement: himanshu kushwaha H/S) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="w-full bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg text-center mb-6"
          >
            <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold mb-1">
              Architect & Full-Stack Developer
            </div>
            <div className="text-xl md:text-2xl font-black tracking-wide text-white flex items-center justify-center gap-2">
              <span>Himanshu Kushwaha</span>
              <span className="inline-block bg-amber-400 text-blue-900 text-xs px-2 py-0.5 rounded font-black tracking-wider">
                H/S
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-blue-100/90 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 4 Secure Portals
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" /> Automated 2.5% Commission
              </span>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-4 overflow-hidden border border-white/10">
            <motion.div
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Skip / Enter Action */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-blue-950 font-extrabold text-sm shadow-xl transition-colors cursor-pointer"
          >
            <span>Enter Marketplace Now</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-4 text-[11px] text-blue-200/80">
          Flipkart-Style Multi-Vendor Engine • Customer • Seller • Courier • Admin
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
