import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        psa: {
          ink: '#0F172A',
          smoke: '#1E293B',
          mute: '#64748B',
          line: '#E2E8F0',
          bg: '#F8FAFC',
          accent: '#4F46E5',
          'accent-soft': '#EEF2FF',
          good: '#059669',
          'good-soft': '#ECFDF5',
          warn: '#D97706',
          'warn-soft': '#FFFBEB',
          bad: '#E11D48',
          'bad-soft': '#FFF1F2',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
