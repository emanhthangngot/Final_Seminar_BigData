/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#050506',
          card: 'rgba(12,12,20,0.8)',
          overlay: 'rgba(20,20,32,0.6)',
        },
        primary: {
          DEFAULT: '#5E6AD2',
          light: '#7C8DE8',
          dark: '#4A54BA',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#9D5FF0',
          dark: '#6025CC',
        },
        qdrant: '#EF4444',
        weaviate: '#3B82F6',
        milvus: '#10B981',
        border: 'rgba(94,106,210,0.2)',
        'border-bright': 'rgba(124,58,237,0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #5E6AD2, #7C3AED)',
        'gradient-card': 'linear-gradient(135deg, rgba(94,106,210,0.05), rgba(124,58,237,0.05))',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(94,106,210,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(94,106,210,0.3)',
        'glow-accent': '0 0 20px rgba(124,58,237,0.4)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
