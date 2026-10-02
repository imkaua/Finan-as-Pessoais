import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Publicado junto com o app de finanças, em /Finan-as-Pessoais/painel-vida/
export default defineConfig({
  base: '/Finan-as-Pessoais/painel-vida/',
  plugins: [react()],
})
