# Cloud Solutions & Architecture Reference

This document provides architectural best practices and specialized solutions for deploying Conversational AI pipelines across major cloud providers and on-premises infrastructure.

## 🚀 Google Cloud Platform (GCP)
GCP remains the "First Class" platform for this estimator due to its specialized **G2 (L4)** and **A3 (H100)** instances.

### Key Tips:
- **GKE (Google Kubernetes Engine):** Highly recommended for its native support for GPU time-sharing and compact placement.
- **WebSocket Gateway:** Use **Envoy** or **NGINX** with `proxy_buffer_size` optimization to handle low-latency streaming audio from clients to STT pods.
- **Spot VMs:** Preemptible VMs on GCP offer up to **60-90% savings**, but require an "Audio Session Buffer" (e.g., Redis) to resume conversations if a pod is preempted.

## ☁️ Amazon Web Services (AWS)
AWS provides a wide range of L4 and A100/H100 options, often with tighter integration with enterprise data lakes.

### Key Tips:
- **EKS (Elastic Kubernetes Service):** Use **Karpenter** for fast GPU node scaling (sub-2 minute boot times for G6 nodes).
- **Fractional GPUs (G6f):** Leverage NVIDIA Multi-Instance GPU (MIG) support on P4/P5 instances if running multiple lightweight STT/TTS models on a single H100.

## 🟦 Microsoft Azure
Azure is the preferred choice for OpenAI-integrated hybrid pipelines.

### Key Tips:
- **AKS (Azure Kubernetes Service):** Utilize **InfiniBand** interconnects on ND v5 nodes for large-scale multi-node LLM training or high-throughput batch inference.
- **NC v5 Series:** Best for single-GPU production workloads requiring dedicated 80GB H100 vRAM.

## 🏢 On-Premises
On-prem is ideal for **high-utilization (60%+), privacy-sensitive, or long-term** production workloads.

### CapEx vs OpEx:
- **Payback Period:** Typically **14-18 months** compared to On-Demand cloud pricing.
- **Hidden Costs:** Ensure you budget for **Data Center Cooling (PUE)** and redundant power supplies. High-end GPUs like H100 run at **700W TDP**, requiring specialized HVAC.
- **Network Latency:** Hosting on-prem may increase latency for remote users compared to global cloud edge locations. Use a **CDA (Cloud Direct Access)** line if possible.

---

## 🎙️ Speech Processing Detail
### VAD (Voice Activity Detection)
- **Silero VAD:** Gold standard for production. Runs efficiently on CPU/GPU.
- **Benefit:** Reduces LLM/STT compute by **40-60%** by skipping silence, significantly lowering CCU costs.

### Diarization
- **Pyannote 3.1:** High accuracy but adds ~1.8GB VRAM.
- **Optimization:** Use **MIG (Multi-Instance GPU)** to isolate Diarization pods from the main LLM pods if using an A100 or H100.
