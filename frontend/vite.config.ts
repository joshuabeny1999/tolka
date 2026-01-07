import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            // API Requests an Go weiterleiten
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            // WebSocket Requests für Live-Captions weiterleiten
            '/ws': {
                target: 'ws://localhost:8080',
                ws: true,
            }
        }
    }
})