/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#060816',
          card: 'rgba(13,16,35,0.72)',
          overlay: 'rgba(18,24,46,0.62)',
          lift: 'rgba(23,31,58,0.74)',
        },
        primary: {
          DEFAULT: '#7C8DFF',
          light: '#A8B4FF',
          dark: '#5363D8',
        },
        accent: {
          DEFAULT: '#9B5CFF',
          light: '#C084FC',
          dark: '#6D28D9',
        },
        cyan: '#22D3EE',
        rose: '#FB7185',
        emerald: '#34D399',
        qdrant: '#FB7185',
        weaviate: '#22D3EE',
        milvus: '#34D399',
        border: 'rgba(148,163,255,0.16)',
        'border-bright': 'rgba(34,211,238,0.42)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'Satoshi', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Clash Display', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
        signature: ['"Segoe Script"', '"Brush Script MT"', '"Snell Roundhand"', 'cursive'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #22D3EE, #7C8DFF 48%, #C084FC)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.095), rgba(124,141,255,0.045) 45%, rgba(34,211,238,0.03))',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(34,211,238,0.18) 0%, transparent 70%)',
      },
      boxShadow: {
        glow: '0 0 28px rgba(34,211,238,0.28)',
        'glow-accent': '0 0 34px rgba(192,132,252,0.32)',
        card: '0 24px 80px rgba(0,0,0,0.38)',
        'deep-card': '0 30px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.08)',
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
        pulseLine: {
          '0%, 100%': { opacity: 0.35, transform: 'scaleY(0.7)' },
          '50%': { opacity: 1, transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
