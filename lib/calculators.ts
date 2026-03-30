// ============================================================
// FinOps Estimator - Core Calculator Library
// Based on formulas from knowledge PDFs + online research
// ============================================================

// --- Types ---
export interface ModelPreset {
  id: string;
  name: string;
  params_b: number;
  active_params_b: number;
  layers: number;
  num_heads: number;
  num_kv_heads: number;
  head_dim: number;
  max_context_tokens: number;
  is_moe: boolean;
  attention_type: string;
}

export interface CustomParams {
  use_custom_llm: boolean;
  use_custom_stt: boolean;
  use_custom_tts: boolean;
  llm_params_b: number;
  stt_params_b: number;
  tts_params_b: number;
}

export interface GpuPricing {
  machine_type?: string;
  instance_type?: string;
  on_demand_hourly: number;
  spot_hourly: number;
  monthly_on_demand: number;
  monthly_spot: number;
  unit_cost_usd?: number;
  setup_cost_usd?: number;
  monthly_ops_usd?: number;
}

export interface GpuSpec {
  id: string;
  name: string;
  vram_gb: number;
  bandwidth_gbps: number;
  fp16_tflops: number;
  int8_tops: number;
  tdp_watts: number;
  pricing: {
    gcp: GpuPricing;
    aws: GpuPricing;
    azure: GpuPricing;
    on_prem: GpuPricing;
  };
  use_case: string;
  tier: string;
}

export interface EnabledComponents {
  stt: boolean;
  llm: boolean;
  tts: boolean;
  speech_processing: boolean;
}

export interface CalculatorInputs {
  model: ModelPreset;
  quantization: 'fp32' | 'fp16' | 'fp8' | 'int8' | 'int4';
  context_length: number;
  target_ccu: number;
  cloud_provider: 'gcp' | 'aws' | 'azure' | 'on_prem';
  deployment_strategy: 'monolithic' | 'distributed';
  enabled_components: EnabledComponents;
  component_devices: Record<keyof EnabledComponents, 'gpu' | 'cpu'>;
  // STT
  stt_rtf: number;
  silence_ratio: number;
  // LLM
  user_tps_required: number;
  output_tokens: number;
  // TTS
  tts_rtf: number;
  // Latency
  network_latency_ms: number;
  // Infra
  use_paged_attention: boolean;
  use_gqa: boolean;
  overhead_multiplier: number;
  custom_params: CustomParams;
}

export interface ResourceResult {
  gpu_vram_gb: number;
  system_ram_gb: number;
  cpu_cores: number;
  total_tflops_req: number;
  breakdown: {
    weights_vram_gb: number;
    kv_cache_vram_gb: number;
    stt_vram_gb: number;
    tts_vram_gb: number;
    speech_vram_gb: number;
    overhead_vram_gb: number;
    stt_ram_gb: number;
    tts_ram_gb: number;
    llm_ram_gb: number;
    llm_tflops_req: number;
  };
  precision_bytes: number;
}

export interface LatencyResult {
  network_ms: number;
  stt_ms: number;
  ttft_ms: number;
  tpot_ms: number;
  tts_ms: number;
  speech_ms: number;
  total_ms: number;
  within_budget: boolean;
  budget_ms: number;
  breakdown_pct: {
    network: number;
    stt: number;
    llm_ttft: number;
    llm_tpot: number;
    tts: number;
    speech: number;
  };
}

export interface CcuResult {
  stt_ccu_per_instance: number;
  llm_ccu_per_instance: number;
  bottleneck: string;
  instances_needed: number;
}

export interface GpuMatch {
  gpu: GpuSpec;
  fits: boolean;
  vram_utilization_pct: number;
  instances_needed: number;
  on_demand_monthly_total: number;
  spot_monthly_total: number;
  on_prem_capex?: number;
  on_prem_opex_monthly?: number;
  cost_per_ccu_spot: number;
  compute_utilization_pct: number;
  effective_per_gpu: number;
  recommended: boolean;
  reason: string;
}

export interface SolutionVerdict {
  category: string;
  recommended_platform: string;
  advice: string;
  fixed_infra_monthly: number;
  total_monthly_with_infra: number;
}

export interface FinOpsResult {
  gpu_matches: GpuMatch[];
  best_gpu: GpuSpec | null;
  monthly_on_demand: number;
  monthly_spot: number;
  monthly_savings_spot: number;
  savings_pct: number;
  annual_on_demand: number;
  annual_spot: number;
  cost_per_ccu_spot: number;
  hpa_config: string;
  verdict: SolutionVerdict | null;
  on_prem_comparison?: {
    total_capex: number;
    monthly_opex: number;
    payback_months_vs_cloud: number;
  };
}

// --- Constants ---
const PRECISION_BYTES: Record<string, number> = {
  fp32: 4,
  fp16: 2,
  fp8: 1,
  int8: 1,
  int4: 0.5,
};

// ============================================================
// 1. Resource Calculator (GPU, RAM, CPU)
// ============================================================
export function calculateResources(inputs: CalculatorInputs): ResourceResult {
  const { model, quantization, context_length, target_ccu, use_paged_attention, use_gqa, overhead_multiplier, enabled_components, component_devices, custom_params, user_tps_required } = inputs;
  const precision_bytes = PRECISION_BYTES[quantization];

  let weights_vram_gb = 0;
  let kv_cache_vram_gb = 0;
  let llm_ram_gb = 0;
  let llm_cpu_cores = 0;
  let llm_tflops_req = 0;

  if (enabled_components.llm) {
    llm_ram_gb = (model as any).system_ram_gb || 8;
    llm_cpu_cores = (model as any).cpu_cores || 2;
    const params = custom_params.use_custom_llm ? custom_params.llm_params_b : model.params_b;
    const active_params = custom_params.use_custom_llm ? custom_params.llm_params_b : (model.is_moe ? model.active_params_b : model.params_b);
    const is_gpu = component_devices.llm === 'gpu';

    const w_gb = (active_params * precision_bytes);
    if (is_gpu) weights_vram_gb = w_gb;
    else llm_ram_gb += w_gb;

    // KV Cache logic
    const kv_heads = use_gqa ? (model.num_kv_heads || 8) : (model.num_heads || 32);
    const head_dim = model.head_dim || 128;
    const kv_bytes_per_token = 2 * model.layers * kv_heads * head_dim * precision_bytes;
    const raw_kv_gb = (kv_bytes_per_token * context_length * target_ccu) / 1e9;

    const fragmentation_factor = use_paged_attention ? 0.04 : 0.30;
    const kv_gb = raw_kv_gb * (1 + fragmentation_factor);

    if (is_gpu) kv_cache_vram_gb = kv_gb;
    else llm_ram_gb += kv_gb;

    // Compute TFLOPS estimation: 2 * Params * Throughput
    // Throughput = CCU * TPS
    const total_throughput = target_ccu * user_tps_required;
    llm_tflops_req = (2 * active_params * total_throughput) / 1000;
  }

  // STT Custom Logic
  let stt_vram_gb = 0;
  if (enabled_components.stt && component_devices.stt === 'gpu') {
    stt_vram_gb = custom_params.use_custom_stt ? Math.max(1, (custom_params.stt_params_b * 2)) : 3.1;
  }
  const stt_ram_gb = enabled_components.stt ? ((enabled_components.stt && component_devices.stt === 'cpu') ? 8 : 4) : 0;

  // TTS Custom Logic
  let tts_vram_gb = 0;
  if (enabled_components.tts && component_devices.tts === 'gpu') {
    tts_vram_gb = custom_params.use_custom_tts ? Math.max(1, (custom_params.tts_params_b * 2)) : 2.5;
  }
  const tts_ram_gb = enabled_components.tts ? ((enabled_components.tts && component_devices.tts === 'cpu') ? 8 : 4) : 0;

  const speech_vram_gb = (enabled_components.speech_processing && component_devices.speech_processing === 'gpu') ? 1.5 : 0;
  const speech_ram_gb = enabled_components.speech_processing ? 2 : 0;

  const total_gpu_vram = weights_vram_gb + kv_cache_vram_gb + stt_vram_gb + tts_vram_gb + speech_vram_gb;
  const overhead_vram_gb = total_gpu_vram * (overhead_multiplier - 1) + 1.2;

  return {
    gpu_vram_gb: total_gpu_vram + overhead_vram_gb,
    system_ram_gb: llm_ram_gb + stt_ram_gb + tts_ram_gb + speech_ram_gb,
    cpu_cores: llm_cpu_cores + (enabled_components.stt ? 4 : 0) + (enabled_components.tts ? 4 : 0) + (enabled_components.speech_processing ? 1 : 0),
    total_tflops_req: llm_tflops_req,
    breakdown: {
      weights_vram_gb,
      kv_cache_vram_gb,
      stt_vram_gb,
      tts_vram_gb,
      speech_vram_gb,
      overhead_vram_gb,
      stt_ram_gb,
      tts_ram_gb,
      llm_ram_gb,
      llm_tflops_req
    },
    precision_bytes
  };
}

// ============================================================
// 2. Latency Simulator
// ============================================================
export function calculateLatency(inputs: CalculatorInputs): LatencyResult {
  const { stt_rtf, tts_rtf, network_latency_ms, output_tokens, user_tps_required, enabled_components } = inputs;
  const BUDGET_MS = 1500;

  const stt_ms = enabled_components.stt ? (stt_rtf * 3000) : 0;
  const ttft_ms = enabled_components.llm ? (50 + (inputs.context_length / 1000) * 5) : 0;
  const tpot_ms = enabled_components.llm ? ((1000 / user_tps_required) * output_tokens) : 0;
  const tts_ms = enabled_components.tts ? (tts_rtf * 2500) : 0;
  const speech_ms = enabled_components.speech_processing ? 200 : 0;

  const total_ms = network_latency_ms + stt_ms + ttft_ms + tpot_ms + tts_ms + speech_ms;
  const within_budget = total_ms <= BUDGET_MS;

  return {
    network_ms: network_latency_ms,
    stt_ms: Math.round(stt_ms),
    ttft_ms: Math.round(ttft_ms),
    tpot_ms: Math.round(tpot_ms),
    tts_ms: Math.round(tts_ms),
    speech_ms,
    total_ms: Math.round(total_ms),
    within_budget,
    budget_ms: BUDGET_MS,
    breakdown_pct: {
      network: (network_latency_ms / total_ms) * 100 || 0,
      stt: (stt_ms / total_ms) * 100 || 0,
      llm_ttft: (ttft_ms / total_ms) * 100 || 0,
      llm_tpot: (tpot_ms / total_ms) * 100 || 0,
      tts: (tts_ms / total_ms) * 100 || 0,
      speech: (speech_ms / total_ms) * 100 || 0,
    }
  };
}

// ============================================================
// 3. CCU & ROI
// ============================================================
export function runFullCalculation(inputs: CalculatorInputs, gpuSpecs: GpuSpec[]) {
  const resources = calculateResources(inputs);
  const latency = calculateLatency(inputs);

  const gpu_matches: GpuMatch[] = gpuSpecs.map(gpu => {
    const fits = resources.gpu_vram_gb <= gpu.vram_gb;
    const vram_utilization_pct = (resources.gpu_vram_gb / gpu.vram_gb) * 100;

    const p = gpu.pricing[inputs.cloud_provider];

    const stt_ccu = inputs.enabled_components.stt ? Math.floor(1 / (inputs.stt_rtf * (1 - inputs.silence_ratio))) : 999;
    const llm_ccu = inputs.enabled_components.llm ? Math.floor(gpu.fp16_tflops * 1.5 / inputs.user_tps_required) : 999;
    const effective_per_gpu = Math.min(stt_ccu, llm_ccu);
    const instances = Math.ceil(inputs.target_ccu / Math.max(1, effective_per_gpu));

    const on_demand_monthly_total = p.monthly_on_demand ? (instances * p.monthly_on_demand) : (instances * p.on_demand_hourly * 730);
    const spot_monthly_total = p.monthly_spot ? (instances * p.monthly_spot) : (instances * p.spot_hourly * 730);

    const on_prem_capex = inputs.cloud_provider === 'on_prem' ? (instances * ((p.unit_cost_usd || 0) + (p.setup_cost_usd || 0))) : undefined;
    const on_prem_opex_monthly = inputs.cloud_provider === 'on_prem' ? (instances * (p.monthly_ops_usd || 0)) : undefined;

    return {
      gpu,
      fits,
      vram_utilization_pct,
      instances_needed: instances,
      on_demand_monthly_total,
      spot_monthly_total,
      on_prem_capex,
      on_prem_opex_monthly,
      cost_per_ccu_spot: spot_monthly_total / inputs.target_ccu,
      compute_utilization_pct: (inputs.target_ccu / (instances * Math.max(1, effective_per_gpu))) * 100,
      effective_per_gpu,
      recommended: false,
      reason: fits ? (vram_utilization_pct > 85 ? 'Tight VRAM' : 'Good fit') : 'Not enough VRAM'
    };
  });

  const eligible = gpu_matches.filter(m => m.fits);
  if (eligible.length > 0) {
    const best = eligible.reduce((prev, curr) => prev.cost_per_ccu_spot < curr.cost_per_ccu_spot ? prev : curr);
    best.recommended = true;
  }

  const best_match = gpu_matches.find(m => m.recommended) || null;
  const best_gpu = best_match?.gpu || null;

  const monthly_on_demand = best_match?.on_demand_monthly_total || 0;
  const monthly_spot = best_match?.spot_monthly_total || 0;

  const verdict = generateVerdict(inputs, resources, best_match);

  let on_prem_comparison;
  if (inputs.cloud_provider === 'on_prem' && best_match) {
    const capex = best_match.on_prem_capex || 0;
    const opex = best_match.on_prem_opex_monthly || 0;
    const gcp_p = best_match.gpu.pricing.gcp;
    const gcp_monthly = best_match.instances_needed * gcp_p.monthly_on_demand;
    const monthly_savings = Math.max(1, gcp_monthly - opex);
    on_prem_comparison = {
      total_capex: capex,
      monthly_opex: opex,
      payback_months_vs_cloud: capex / monthly_savings
    };
  }

  return {
    vram: resources, // Rename to vram for UI compatibility or update UI
    resources,
    latency,
    finops: {
      gpu_matches,
      best_gpu,
      monthly_on_demand,
      monthly_spot,
      monthly_savings_spot: monthly_on_demand - monthly_spot,
      savings_pct: monthly_on_demand > 0 ? ((monthly_on_demand - monthly_spot) / monthly_on_demand) * 100 : 0,
      annual_on_demand: monthly_on_demand * 12,
      annual_spot: monthly_spot * 12,
      cost_per_ccu_spot: monthly_spot / inputs.target_ccu,
      hpa_config: generateHpaConfig(inputs, best_match),
      verdict,
      on_prem_comparison
    }
  };
}

function generateVerdict(inputs: CalculatorInputs, resources: ResourceResult, match: GpuMatch | null): SolutionVerdict | null {
  if (!match) return null;

  let category = "Internal Tools / SPU / Startups";
  let platform = "";
  let advice = "";
  let fixed_infra = 0;

  // 1. Determine Category based on scale
  if (match.instances_needed > 1 && match.instances_needed <= 6) {
    category = "SME Customer Service";
    advice = "Resilient small cluster. Recommend managed Kubernetes with Spot VMs for high ROI.";
  } else if (match.instances_needed > 6) {
    category = "Enterprise / Mass Scale";
    advice = "Large-scale orchestrated mesh. The Gold Standard: Kubernetes + Spot VMs + Queue-depth HPA.";
  } else {
    advice = "Single-node specialized instance. Good for R&D and internal teams.";
  }

  // 2. Holistic Provider-Specific Mapping
  switch (inputs.cloud_provider) {
    case 'gcp':
      platform = match.gpu.name.includes("L4") ? "GKE + G2-standard-4 (L4)" : `GKE + ${match.gpu.name}`;
      fixed_infra = 91; // $73 GKE + $18 LB
      break;
    case 'aws':
      platform = match.gpu.name.includes("A10G") ? "EKS + g5.xlarge (A10G)" : `EKS + ${match.gpu.name}`;
      fixed_infra = 88; // $72 EKS + $16 ALB
      break;
    case 'azure':
      platform = match.gpu.name.includes("A100") ? "AKS + NCads_H_v4 (A100)" : `AKS + ${match.gpu.name}`;
      fixed_infra = 93; // $75 AKS + $18 App Gateway
      break;
    case 'on_prem':
      platform = resources.gpu_vram_gb < 24 ? "Enterprise L4 Server build" : "RTX 6000 Ada Server build";
      advice += " Ensure high-bandwidth NVLink for multi-GPU coordination.";
      fixed_infra = 0;
      break;
  }

  // 3. Solution Pattern Advice
  if (match.instances_needed === 1) {
    advice = "The 'Conversational AI Pod' pattern: Host all components on a single specialized node for ultra-low internal latency.";
  }

  // CPU Trap check
  const is_cpu_stt = inputs.enabled_components.stt && inputs.component_devices.stt === 'cpu';
  if (is_cpu_stt && inputs.target_ccu > 20) {
    advice += " ⚠️ Warning: You're in the 'CPU Trap'. Scaling STT on vCPU is less efficient than L4/A10G GPUs at this CCU.";
  }

  return {
    category,
    recommended_platform: platform,
    advice,
    fixed_infra_monthly: fixed_infra,
    total_monthly_with_infra: match.spot_monthly_total + fixed_infra
  };
}

function generateHpaConfig(inputs: CalculatorInputs, match: GpuMatch | null): string {
  if (!match) return "# No GPU fits this configuration";

  const targetPerPod = Math.max(1, Math.floor(match.effective_per_gpu * 0.8)); // 80% target load
  const maxReplicas = Math.ceil(match.instances_needed * 1.25); // 25% headroom

  return `# ${inputs.cloud_provider.toUpperCase()} Scaling Blueprint
# Recommended GPU: ${match.gpu.name}
# Per-Pod Capacity: ${match.effective_per_gpu} CCU
# Scaling Metric: Queue Depth (target: ${targetPerPod})
# Strategy: Pre-warm instances for high-burst conversational traffic
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: conversational-ai-hpa
spec:
  maxReplicas: ${maxReplicas}
  minReplicas: ${Math.max(1, Math.floor(match.instances_needed * 0.5))}
  metrics:
  - type: External
    external:
      metric: { name: queue_depth }
      target: { type: AverageValue, averageValue: "${targetPerPod}" }`;
}

export function formatGb(gb: number): string {
  return gb < 1 ? `${(gb * 1024).toFixed(0)} MB` : `${gb.toFixed(1)} GB`;
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export function formatUsd(usd: number): string {
  return usd >= 1000 ? `$${(usd / 1000).toFixed(1)}K` : `$${usd.toFixed(0)}`;
}
