import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts}'],
  theme: {
    extend: {
      colors: {
        hytale: {
          dark: '#1a1a2e',
          darker: '#16162a',
          accent: '#0f3460',
          highlight: '#e94560',
          text: '#eaeaea',
          muted: '#8b8b9e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
