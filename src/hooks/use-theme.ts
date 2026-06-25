'use client';

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    apply(initial);
    setTheme(initial);
  }, []);

  const apply = (t: Theme) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('theme', t);
  };

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    apply(next);
    setTheme(next);
  };

  return { theme, toggle };
}
