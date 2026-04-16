import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const port = Number(env.VITE_PORT) || 5173; // Default to 5173 if not set

    // Only validate port for dev mode
    if (mode === 'dev' && !env.VITE_PORT) {
        console.warn('VITE_PORT not set, using default port 5173');
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
