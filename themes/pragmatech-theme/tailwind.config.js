/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layouts/**/*.html',
    './assets/js/**/*.js',
  ],
  theme: {
    fontFamily: {
      'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      'serif': ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      'mono': ['Source Code Pro', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
    extend: {
      screens: {
        'xs': '480px',
      },
      keyframes: {
        'slow-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      animation: {
        'slow-float': 'slow-float 6s ease-in-out infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
            h1: {
              fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
            },
            h2: {
              fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
            },
            h3: {
              fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
            },
            h4: {
              fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
            },
            code: {
              fontFamily: ['Source Code Pro', 'monospace'].join(','),
            },
            pre: {
              fontFamily: ['Source Code Pro', 'monospace'].join(','),
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
