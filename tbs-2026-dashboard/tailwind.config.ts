import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tbs: {
          // Dark theme tokens
          bg: '#0E0E14',
          'bg-2': '#161620',
          'bg-3': '#1F1F2C',
          surface: '#1A1A24',
          'surface-2': '#22222E',

          // Light theme tokens
          'bg-light': '#FAFAFA',
          'surface-light': '#FFFFFF',
          'ink-light': '#0E0E10',
          'line-light': '#E6E6EA',
          'mute-light': '#6B6B72',

          // Acentos laranja (compartilhados)
          orange: '#F08220',
          'orange-deep': '#D14A0F',
          'orange-light': '#FFA52A',
          'orange-bright': '#FF6B1A',
          'orange-50': '#FFF4E8',
          'orange-100': '#FFE1BF',

          // Tinta dark
          ink: '#FFFFFF',
          smoke: '#E5E5EC',
          line: '#2A2A38',
          'line-soft': '#1F1F2C',
          mute: '#9090A8',
          'mute-2': '#6B6B80',

          // Status
          success: '#22C55E',
          warn: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'sans-serif'],
        heavy: ['Anton', 'Oswald', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'tbs-gradient': 'linear-gradient(180deg, #D14A0F 0%, #F08220 50%, #FFA52A 100%)',
        'tbs-gradient-h': 'linear-gradient(90deg, #D14A0F 0%, #F08220 50%, #FFA52A 100%)',
        'tbs-hero': 'linear-gradient(180deg, #0E0E14 0%, #161620 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
