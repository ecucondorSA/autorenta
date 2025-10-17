/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // 🎨 Paleta Neutra Premium - Autorent
        // Inspirada en marcas premium: Audi, Apple, Airbnb Luxe

        // Fondos Light Mode
        'ivory-soft': '#F8F6F3',      // Fondo principal
        'sand-light': '#EDEAE3',      // Fondo alternativo/secciones
        'white-pure': '#FFFFFF',      // Superficies elevadas (cards, modals)

        // Bordes y Divisores
        'pearl-gray': '#D9D6D0',      // Bordes, dividers, inputs

        // Textos Light Mode
        'smoke-black': '#1A1A1A',     // Texto principal (títulos)
        'charcoal-medium': '#4B4B4B', // Texto secundario (subtítulos)
        'ash-gray': '#8E8E8E',        // Texto deshabilitado/placeholders

        // Fondos Dark Mode
        'graphite-dark': '#121212',   // Fondo principal dark
        'anthracite': '#1E1E1E',      // Superficies dark (cards)
        'slate-deep': '#2A2A2A',      // Hover states dark

        // Textos Dark Mode
        'ivory-luminous': '#FAF9F6',  // Texto principal dark mode
        'pearl-light': '#E5E3DD',     // Texto secundario dark mode

        // Sistema de Grises Completo (para gradientes sutiles)
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },

        // Accent opcional (para CTAs, links - usar con moderación)
        'accent-petrol': '#2C4A52',   // Azul petróleo elegante
        'accent-warm': '#8B7355',     // Arena cálida
      },

      // Sombras premium y sutiles
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.06)',
      },

      // Animaciones suaves
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
