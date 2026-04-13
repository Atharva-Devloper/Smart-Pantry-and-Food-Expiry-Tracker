import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const port = Number(env.VITE_PORT);

    if (!env.VITE_PORT) {
        throw new Error('Missing required environment variable: VITE_PORT');
    }

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error('VITE_PORT must be a valid positive integer');
    }

    return {
        plugins: [react()],
        server: {
            port,
            strictPort: true, // fail if port is in use instead of trying next port
        },
    };
});
