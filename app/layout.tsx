import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinOps Estimator — Conversational AI Capacity Planning',
  description: 'Open-source tool for VRAM calculation, latency budgeting, and GPU cost estimation for STT/LLM/TTS pipelines. Find the most cost-effective GPU for your AI workload.',
  keywords: 'FinOps, LLM, VRAM calculator, GPU cost, AI capacity planning, vLLM, KV cache, latency budget',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧮</text></svg>" />
      </head>
      <body className="relative z-10">
        {children}
      </body>
    </html>
  )
}
