# Contributor Guide: AI Solution Architecture & FinOps

We welcome contributors who share our vision of creating a transparent, production-ready "Architectural Compass" for AI pipelines. Whether you're an AI Researcher, Cloud Architect, or FinOps Enthusiast, your help is invaluable.

## How to Contribute

The project is designed to be highly modular. Most meaningful improvements happen in the `docs/resources/` directory and the `lib/calculators.ts` engine.

### 1. Adding or Updating Model Presets
If a new state-of-the-art model is released (e.g., Llama-3, Grok, Mistral-Next), please update the "Source of Truth":
- **File**: `docs/resources/model_specifications.json`
- **What to add**: 
    - Number of Parameters (B) and Active Parameters (for MoE).
    - Resource requirements: **System RAM (GB)** and **CPU Cores** used in real production scenarios.
    - Architectural details: Layers, Num Heads, Attention Type (GQA/MHA).

### 2. Updating Hardware & Cloud Pricing
Cloud pricing changes frequently. Help us keep the "Matchmaker" accurate:
- **File**: `docs/resources/gpu_pricing.json`
- **Providers**: GCP, AWS, Azure, and On-Prem.
- **Metrics**: On-demand hourly, Spot hourly, and Monthly commitment costs.

### 3. Refining Architectural Formulas
The core logic resides in `lib/calculators.ts`. We strive for realistic estimations based on:
- **vLLM PagedAttention** fragmentation heuristics.
- **Latency Budgets** (Network hop, TTFT, TPOT).
- **TFLOPS Matching**: Validating if a model can sustain a target CCU based on hardware compute capacity.

### Development Workflow

1.  **Fork** the repository and create your branch from `main`.
2.  **Install dependencies**: `npm install`.
3.  **Run dev server**: `npm run dev`.
4.  **Verify**: Ensure your changes reflect accurately in the local calculator UI.
5.  **Submit PR**: Include a brief description of the architectural or financial logic behind your change.

## Code of Conduct

We are committed to providing a welcoming and inspiring community for everyone. Be professional, be helpful, and let's demystify AI infrastructure together.

---
> [!TIP]
> **Realism First**: When contributing, always prioritize "production-grade" numbers. For example, factor in at least 15-20% framework overhead for VRAM estimates to ensure users don't under-provision their clusters.
