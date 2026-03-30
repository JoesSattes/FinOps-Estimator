# FinOps Estimator: The AI Architectural Compass

An open-source capacity planning and **FinOps estimation tool** for production-grade Conversational AI pipelines. This project is built to bridge the gap between AI research and real-world solution architecture, providing a mathematically-backed "compass" for infrastructure design.

> [!IMPORTANT]
> **Project Goal**: To demystify the high costs and latency of Voice AI and LLMs by simulating real-world resource requirements (GPU VRAM, System RAM, CPU Cores) across diverse deployment strategies.

---

## 🚀 Key Architectural Pillars

### 1. Multi-Resource Footprint
We go beyond simple VRAM calculators. We track the entire infrastructure stack:
- **GPU VRAM**: Weights, KV Cache (vLLM PagedAttention), and component overhead.
- **System RAM**: Host memory for model runtimes and audio buffering.
- **CPU Cores**: Dedicated vCPU recommendations based on architecture.

### 2. Compute Estimation (TFLOPS)
Match your workload with the right hardware using our **Required Compute (TFLOPS)** engine:
- `TFLOPS = 2 × Params × Total_Throughput`.
- Compare your needs against reference points like NVIDIA **H100**, **A100**, and **L4** to avoid over-provisioning.

### 3. Deployment Strategy Simulation
Test how your architecture scales across different patterns:
- **Monolithic (AIO)**: Single-instance, all-in-one pods.
- **Distributed**: Microservices-based pods for STT, LLM, and TTS separately.

### 4. FinOps & Hardware Matchmaker
Find the most cost-effective cloud GPUs (GCP, AWS, Azure) or calculate the **On-Prem ROI** (CapEx vs. OpEx) to decide when it's time to build your own cluster.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS (Modern Design System)
- **Visualization**: Recharts (Dynamic ROI & Latency Breakdown)
- **Logic Engine**: TypeScript (Modular calculation library)

### Getting Started

1.  **Clone the repo**: `git clone https://github.com/JoesSattes/FinOps-Estimator.git`
2.  **Install**: `npm install`
3.  **Run**: `npm run dev`
4.  **Export**: `npm run build` (Static export for GitHub Pages)

---

## 🤝 Roadmap & Contributing

This project aims to help everyone understand **real AI solution architecture**. We welcome contributions from architects and researchers to refine our formulas and data presets.

- **[CONTRIBUTOR.md](CONTRIBUTOR.md)**: Read our guide to adding new models and pricing.
- **Formulas**: Based on vLLM, TensorRT-LLM, and Pipecat/LiveKit benchmarks.

---
**March 2026 Update**: All hardware pricing and model specifications have been cross-referenced with latest GCP/AWS instance sheets.
