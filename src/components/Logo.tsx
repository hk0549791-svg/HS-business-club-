/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'brand';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'brand',
  showTagline = true,
}) => {
  const sizeClasses = {
    sm: {
      bag: 'w-7 h-7 text-xs',
      title: 'text-base',
      tagline: 'text-[9px]',
      star: 'w-3 h-3',
    },
    md: {
      bag: 'w-9 h-9 text-sm',
      title: 'text-xl',
      tagline: 'text-[11px]',
      star: 'w-3.5 h-3.5',
    },
    lg: {
      bag: 'w-12 h-12 text-base',
      title: 'text-2xl',
      tagline: 'text-xs',
      star: 'w-4 h-4',
    },
    xl: {
      bag: 'w-16 h-16 text-xl',
      title: 'text-3xl md:text-4xl',
      tagline: 'text-sm',
      star: 'w-6 h-6',
    },
  }[size];

  const textColor = variant === 'light' ? 'text-white' : variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subColor = variant === 'light' ? 'text-amber-300' : variant === 'dark' ? 'text-[#2874f0]' : 'text-amber-300';

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Flipkart-Style Monogram Shopping Emblem */}
      <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 shadow-md text-blue-900 font-extrabold tracking-tight ${sizeClasses.bag} shrink-0`}>
        {/* Shopping bag handle shape */}
        <div className="absolute -top-1.5 w-3.5 h-2 rounded-t-full border-2 border-amber-400 border-b-0 pointer-events-none" />
        <span className="italic font-black text-slate-900">HS</span>
        {/* Sparkle badge */}
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white font-bold ring-1 ring-white">
          ★
        </span>
      </div>

      {/* Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1">
          <span className={`font-black italic tracking-tight ${textColor} ${sizeClasses.title}`}>
            HS <span className="font-extrabold not-italic text-amber-400">market</span>
          </span>
          <span className="inline-block bg-amber-400 text-blue-900 text-[10px] font-black uppercase px-1.5 py-0.5 rounded italic tracking-wider">
            CLUB
          </span>
        </div>
        {showTagline && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`font-semibold italic ${subColor} ${sizeClasses.tagline}`}>
              Explore <span className="font-bold text-amber-400">Plus / Club</span>
            </span>
            <span className="text-amber-400 font-bold text-[10px]">✦</span>
          </div>
        )}
      </div>
    </div>
  );
};
