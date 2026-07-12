/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6F898B',
        secondary: '#54595F',
        text: '#7A7A7A',
        accent: '#54AAB1',
        // Premium neutral scale for the public site
        ink: {
          50: '#F7F8F8',
          100: '#EEF0F1',
          200: '#DCE0E2',
          300: '#B9C0C4',
          400: '#8E979D',
          500: '#6B747A',
          600: '#4D555B',
          700: '#363C41',
          800: '#22262A',
          900: '#141719',
          950: '#0A0C0D',
        },
      },
      fontSize: {
        'display-xl': ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        display: ['clamp(2.25rem, 4.5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        headline: ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,12,13,0.04), 0 4px 16px rgba(10,12,13,0.06)',
        lift: '0 2px 4px rgba(10,12,13,0.06), 0 12px 32px rgba(10,12,13,0.12)',
        glow: '0 0 0 1px rgba(84,170,177,0.25), 0 8px 32px rgba(84,170,177,0.18)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.9s ease both',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
