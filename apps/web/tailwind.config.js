/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════════
         🎨 SISTEMA DE DISEÑO - TAILWIND CONFIG
         ═══════════════════════════════════════════════════════════════ */

      /* ─────────────────────────────────────────────────────────────
         Tipografía - Sistema Inter
         ───────────────────────────────────────────────────────────── */
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },

      /* Escala Tipográfica Modular 1.250 (Major Third) con Line Heights */
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.5' }], // 14px
        base: ['1rem', { lineHeight: '1.6' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.5' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.4' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.25' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }], // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }], // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }], // 72px
      },

      /* Font Weights Consistentes */
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      /* ─────────────────────────────────────────────────────────────
         Paleta de Colores - Premium Neutra
         ───────────────────────────────────────────────────────────── */
      colors: {
        // Colores Base (Tailwind Standard)
        white: '#FFFFFF',
        black: '#000000',
        transparent: 'transparent',
        current: 'currentColor',

        // ═══════════════════════════════════════════════════════════
        // PALETA OFICIAL AUTORENTA
        // ═══════════════════════════════════════════════════════════

        // Marfil (Ivory) - Fondos suaves y highlights
        ivory: {
          50: '#FEFCF9',
          100: '#FDF9F3',
          200: '#FAF3E6',
          300: '#F7EDD9',
          400: '#F4E7CC',
        },

        // Grises Neutros - Textos y estructuras
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },

        // Beige - Acentos cálidos
        beige: {
          50: '#FAF7F2',
          100: '#F5F0E8',
          200: '#EDE4D3',
          300: '#E5D8BE',
          400: '#DDCCA9',
          500: '#D4C094',
        },

        // Azul Celeste Pastel (Sky) - Acciones e interacciones
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },

        // WhatsApp Brand Colors (Para componentes específicos)
        whatsapp: {
          teal: '#075E54',
          'teal-light': '#128C7E',
          'teal-darker': '#005C4B',
          green: '#25D366',
          'green-modern': '#00A884',
          'green-modern-dark': '#008069',
          'green-light': '#DCF8C6',
          'green-sent': '#D9FDD3',
          bg: '#ECE5DD',
          'bg-light': '#F0F2F5',
          'bg-dark': '#0B141A',
          'bg-header-dark': '#1F2C33',
          'bg-message-dark': '#202C33',
          'bg-input-dark': '#2A3942',
        },

        // ═══════════════════════════════════════════════════════════
        // COLORES SEMÁNTICOS - Basados en Paleta AutoRenta
        // ═══════════════════════════════════════════════════════════

        // Success - Solo para estados críticos de éxito (usar sky para acciones positivas)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // Error - Solo para estados críticos de error (usar gray para texto de error)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },

      /* ─────────────────────────────────────────────────────────────
         Sombras - Premium y Sutiles
         ───────────────────────────────────────────────────────────── */
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.04)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
        elevated: '0 8px 24px rgba(0, 0, 0, 0.12)',
        card: '0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        glow: '0 0 0 3px rgba(2, 132, 199, 0.1)', // sky-600
      },

      /* ─────────────────────────────────────────────────────────────
         Espaciados Extendidos
         ───────────────────────────────────────────────────────────── */
      spacing: {
        18: '4.5rem', // 72px
        88: '22rem', // 352px
        128: '32rem', // 512px
      },

      /* ─────────────────────────────────────────────────────────────
         Border Radius Consistente
         ───────────────────────────────────────────────────────────── */
      borderRadius: {
        sm: '0.5rem', // 8px
        DEFAULT: '0.75rem', // 12px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '2rem', // 32px
      },

      /* ─────────────────────────────────────────────────────────────
         Sistema de Transiciones
         ───────────────────────────────────────────────────────────── */
      transitionDuration: {
        instant: '100ms',
        fast: '200ms',
        normal: '300ms',
        slow: '400ms',
        slower: '600ms',
      },

      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },

      /* ─────────────────────────────────────────────────────────────
         Animaciones y Keyframes
         ───────────────────────────────────────────────────────────── */
      animation: {
        // Fades
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',

        // Slides
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',

        // Scale
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-in-slow': 'scaleIn 0.4s ease-out',

        // Loading
        'skeleton-loading': 'skeletonLoading 1.5s ease-in-out infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Spin
        spin: 'spin 1s linear infinite',
        'spin-slow': 'spin 2s linear infinite',

        // Bounce (sutil)
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',

        // Shake (error feedback)
        'shake': 'shake 0.5s ease-in-out',
      },

      keyframes: {
        // Fade animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Slide animations
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Scale animations
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Skeleton loading
        skeletonLoading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },

        // Pulse
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },

        // Spin
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },

        // Bounce sutil
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
          '50%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
        },

        // Shake (error feedback)
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
      },

        'pattern': 'radial-gradient(circle, #DDCCA9 1px, transparent 1px)', // beige-400
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
      },
      backgroundImage: {
        'pattern': 'radial-gradient(circle, #DDCCA9 1px, transparent 1px)', // beige-400
      },
    },
  },
  plugins: [],
};
