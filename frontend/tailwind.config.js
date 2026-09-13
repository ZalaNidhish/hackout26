/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: '#f8fafc',
        navy: '#0f172a',
        rust: '#ea580c',
        rustbg: '#ffedd5',
        surplus: '#ca8a04',
        surplusbg: '#fef9c3',
        steel: '#1e3a5f',
        border: '#e2e8f0',
        ok: '#16a34a',
        okbg: '#dcfce7',
        danger: '#dc2626',
        dangerbg: '#fee2e2',
        emergency: '#6b21a8',
        emergencybg: '#f3e8ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        cardHover: '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        panel: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
}
