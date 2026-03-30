'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  runFullCalculation,
  type CalculatorInputs,
  type GpuSpec,
  type ModelPreset,
  type EnabledComponents,
  type ResourceResult,
  formatGb,
  formatMs,
  formatUsd,
} from '@/lib/calculators'

// ---- Default inputs ----
const DEFAULT_INPUTS: Omit<CalculatorInputs, 'model'> = {
  quantization: 'fp16',
  context_length: 4096,
  target_ccu: 50,
  cloud_provider: 'gcp',
  deployment_strategy: 'distributed',
  enabled_components: {
    stt: true,
    llm: true,
    tts: true,
    speech_processing: true,
  },
  component_devices: {
    stt: 'cpu',
    llm: 'gpu',
    tts: 'gpu',
    speech_processing: 'cpu',
  },
  stt_rtf: 0.07,
  silence_ratio: 0.5,
  user_tps_required: 20,
  output_tokens: 100,
  tts_rtf: 0.08,
  network_latency_ms: 150,
  use_paged_attention: true,
  use_gqa: true,
  overhead_multiplier: 1.15,
  custom_params: {
    use_custom_llm: false,
    use_custom_stt: false,
    use_custom_tts: false,
    llm_params_b: 7,
    stt_params_b: 1.5,
    tts_params_b: 1.0,
  },
}

const TABS = [
  { id: 'config',   label: '⚙️ Pipeline Config' },
  { id: 'resources', label: '💾 Resource Allocation' },
  { id: 'latency',  label: '⏱️ Latency Simulator' },
  { id: 'hardware', label: '🖥️ Hardware Matchmaker' },
  { id: 'finops',   label: '💰 FinOps Blueprint' },
]

const QUANT_OPTIONS = [
  { value: 'fp32',  label: 'FP32 (full)',      bytes: 4, color: '#ff5252' },
  { value: 'fp16',  label: 'FP16 (half)',      bytes: 2, color: '#ffca28' },
  { value: 'fp8',   label: 'FP8',              bytes: 1, color: '#ff7043' },
  { value: 'int8',  label: 'INT8',             bytes: 1, color: '#2a9fff' },
  { value: 'int4',  label: 'INT4 (GPTQ/AWQ)',  bytes: 0.5, color: '#00e676' },
]

const COLORS = ['#2a9fff', '#00d4ff', '#b388ff', '#00e676', '#ffca28', '#ff7043']

// ---- Custom tooltip ----
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(5,13,26,0.95)', border: '1px solid rgba(42,159,255,0.3)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
        <p style={{ color: '#7da8d0', marginBottom: 4 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.fill || '#2a9fff' }}>{p.name}: <strong>{typeof p.value === 'number' ? (p.value > 100 ? Math.round(p.value) : p.value.toFixed(2)) : p.value}</strong></p>
        ))}
      </div>
    )
  }
  return null
}

export default function CalculatorPage() {
  const [models, setModels] = useState<ModelPreset[]>([])
  const [gpuSpecs, setGpuSpecs] = useState<GpuSpec[]>([])
  const [activeTab, setActiveTab] = useState('config')
  const [selectedModelId, setSelectedModelId] = useState('llama3_8b')
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [results, setResults] = useState<ReturnType<typeof runFullCalculation> | null>(null)

  const basePath = process.env.NODE_ENV === 'production' ? '/FinOps-Estimator' : ''

  // Load data
  useEffect(() => {
    fetch(`${basePath}/data/model_presets.json`)
      .then(r => r.json())
      .then(data => {
        setModels(data.llm || [])
      })
    fetch(`${basePath}/data/gpu_specs.json`).then(r => r.json()).then(setGpuSpecs)
  }, [basePath])

  // Recalculate whenever inputs change
  const calculate = useCallback(() => {
    if (!models.length || !gpuSpecs.length) return
    const model = models.find(m => m.id === selectedModelId) || models[0]
    const fullInputs: CalculatorInputs = { ...inputs, model }
    setResults(runFullCalculation(fullInputs, gpuSpecs))
  }, [models, gpuSpecs, selectedModelId, inputs])

  useEffect(() => { calculate() }, [calculate])

  const model = models.find(m => m.id === selectedModelId)

  const setInput = (key: keyof typeof inputs, value: unknown) =>
    setInputs(prev => ({ ...prev, [key]: value }))

  const toggleComponent = (key: keyof EnabledComponents) => {
    setInputs(prev => ({
      ...prev,
      enabled_components: {
        ...prev.enabled_components,
        [key]: !prev.enabled_components[key]
      }
    }))
  }

  // ---- Slider component ----
  const Slider = ({ label, field, min, max, step = 1, format = (v: number) => String(v), helpText = '' }: {
    label: string; field: keyof typeof inputs; min: number; max: number; step?: number; format?: (v: number) => string; helpText?: string
  }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2a9fff' }} className="animated-value">
          {format(inputs[field] as number)}
        </span>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step}
        value={inputs[field] as number}
        onChange={e => setInput(field, parseFloat(e.target.value))} />
      {helpText && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{helpText}</p>}
    </div>
  )

  if (!models.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
          <div>Loading calculator data...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0.6rem 1.5rem',
        background: 'rgba(5,13,26,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          ← Back
        </Link>
        <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
        <span style={{ fontSize: '1.2rem' }}>🧮</span>
        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>FinOps Estimator Pro</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: 6 }}>
          All calculations run in your browser — no data leaves your machine
        </span>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>
        {/* KPI strip */}
        {results && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'GPU VRAM', value: formatGb(results.resources.gpu_vram_gb), icon: '💾', color: results.resources.gpu_vram_gb > 80 ? '#ff5252' : results.resources.gpu_vram_gb > 40 ? '#ffca28' : '#00e676' },
              { label: 'System RAM', value: formatGb(results.resources.system_ram_gb), icon: '🧠', color: '#b388ff' },
              { label: 'CPU Cores', value: results.resources.cpu_cores.toString(), icon: '🏎️', color: '#2a9fff' },
              { label: 'Required Compute', value: `${results.resources.total_tflops_req.toFixed(1)} TFLOPS`, icon: '⚡', color: '#ffca28' },
              { label: 'End-to-End Latency', value: formatMs(results.latency.total_ms), icon: '⏱️', color: results.latency.within_budget ? '#00e676' : '#ff5252' },
              { label: 'Best GPU Match', value: results.finops.best_gpu?.name || 'None Fits', icon: '🖥️', color: results.finops.best_gpu ? '#2a9fff' : '#ff5252' },
              { label: 'Estimated Spot Cost', value: results.finops.monthly_spot > 0 ? formatUsd(results.finops.monthly_spot) : 'N/A', icon: '💸', color: '#00e676' },
            ].map(kpi => (
              <div key={kpi.label} className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.icon} {kpi.label}</div>
                <div className="animated-value" style={{ fontSize: '1.4rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === (t.id === 'resources' ? 'vram' : t.id) ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id === 'resources' ? 'vram' : t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="animated-value">

          {/* ======== CONFIG TAB ======== */}
          {activeTab === 'config' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* LLM Configuration */}
                {inputs.enabled_components.llm && (
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>🤖 LLM Config</h2>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                        <input type="checkbox" checked={inputs.custom_params.use_custom_llm}
                          onChange={(e) => setInput('custom_params', { ...inputs.custom_params, use_custom_llm: e.target.checked })}
                          style={{ accentColor: '#ffca28' }} />
                        <span style={{ color: inputs.custom_params.use_custom_llm ? '#ffca28' : 'var(--text-muted)' }}>Custom</span>
                      </label>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Target Model</label>
                      <select className="styled-select" value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)} disabled={inputs.custom_params.use_custom_llm}>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name} — {m.params_b}B{m.is_moe ? ` (${m.active_params_b}B active)` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {!inputs.custom_params.use_custom_llm && model && (
                      <div style={{ background: 'rgba(42,159,255,0.05)', border: '1px solid rgba(42,159,255,0.15)', borderRadius: 8, padding: '0.875rem', fontSize: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          {[
                            ['Params', `${model.params_b}B`],
                            ['Layers', model.layers],
                            ['Attention', model.attention_type],
                            ['KV Heads', model.num_kv_heads],
                            ['Context Limit', `${(model.max_context_tokens / 1000).toFixed(0)}K tokens`],
                            ['Type', model.is_moe ? `MoE` : 'Dense'],
                          ].map(([k, v]) => (
                            <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {inputs.custom_params.use_custom_llm && (
                      <div style={{ background: 'rgba(255,202,40,0.05)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: 8, padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.7rem' }}>
                           <span style={{ color: 'var(--text-muted)' }}>LLM Parameters (B)</span>
                           <span style={{ color: 'white', fontWeight: 700 }}>{inputs.custom_params.llm_params_b}B</span>
                        </div>
                        <input type="range" min="1" max="200" step="1" 
                           value={inputs.custom_params.llm_params_b}
                           onChange={(e) => setInput('custom_params', { ...inputs.custom_params, llm_params_b: parseFloat(e.target.value) })}
                           style={{ width: '100%', accentColor: '#ffca28' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* STT Configuration */}
                {inputs.enabled_components.stt && (
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>🎙️ STT Config</h2>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                        <input type="checkbox" checked={inputs.custom_params.use_custom_stt}
                          onChange={(e) => setInput('custom_params', { ...inputs.custom_params, use_custom_stt: e.target.checked })}
                          style={{ accentColor: '#ffca28' }} />
                        <span style={{ color: inputs.custom_params.use_custom_stt ? '#ffca28' : 'var(--text-muted)' }}>Custom</span>
                      </label>
                    </div>
                    {inputs.custom_params.use_custom_stt ? (
                      <div style={{ background: 'rgba(255,202,40,0.05)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: 8, padding: '1rem' }}>
                         <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>STT Params (M)</div>
                         <input type="number" step="100" 
                            value={inputs.custom_params.stt_params_b * 1000}
                            onChange={(e) => setInput('custom_params', { ...inputs.custom_params, stt_params_b: parseFloat(e.target.value) / 1000 })}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.75rem', padding: '0.25rem' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8 }}>
                         Using Production Preset: <strong>Whisper Large-v3</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* TTS Configuration */}
                {inputs.enabled_components.tts && (
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>🗣️ TTS Config</h2>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                        <input type="checkbox" checked={inputs.custom_params.use_custom_tts}
                          onChange={(e) => setInput('custom_params', { ...inputs.custom_params, use_custom_tts: e.target.checked })}
                          style={{ accentColor: '#ffca28' }} />
                        <span style={{ color: inputs.custom_params.use_custom_tts ? '#ffca28' : 'var(--text-muted)' }}>Custom</span>
                      </label>
                    </div>
                    {inputs.custom_params.use_custom_tts ? (
                      <div style={{ background: 'rgba(255,202,40,0.05)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: 8, padding: '1rem' }}>
                         <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>TTS Params (M)</div>
                         <input type="number" step="100" 
                            value={inputs.custom_params.tts_params_b * 1000}
                            onChange={(e) => setInput('custom_params', { ...inputs.custom_params, tts_params_b: parseFloat(e.target.value) / 1000 })}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.75rem', padding: '0.25rem' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8 }}>
                         Using Production Preset: <strong>XTTS-v2</strong>
                      </div>
                    )}
                  </div>
                )}
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>🏗️ Architecture Strategy</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {[
                      { id: 'monolithic', label: 'Monolithic', desc: 'Single-Instance AIO' },
                      { id: 'distributed', label: 'Distributed', desc: 'Microservices Mesh' },
                    ].map(strat => (
                      <button key={strat.id}
                        onClick={() => setInput('deployment_strategy', strat.id)}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: 10, textAlign: 'left',
                          border: `1px solid ${inputs.deployment_strategy === strat.id ? '#b388ff' : 'var(--border)'}`,
                          background: inputs.deployment_strategy === strat.id ? `#b388ff11` : 'transparent',
                          transition: 'all 0.15s', cursor: 'pointer'
                        }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: inputs.deployment_strategy === strat.id ? '#b388ff' : 'white' }}>{strat.label}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{strat.desc}</div>
                      </button>
                    ))}
                  </div>

                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>🎙️ Enabled Services & Execution Device</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { id: 'stt', label: 'STT (Whisper/Chirp)' },
                      { id: 'llm', label: 'LLM Reasoning' },
                      { id: 'tts', label: 'TTS Real-time' },
                      { id: 'speech_processing', label: 'VAD / Speech Utils' },
                    ].map(comp => (
                      <div key={comp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1 }}>
                          <input type="checkbox" checked={inputs.enabled_components[comp.id as keyof EnabledComponents]}
                            onChange={() => toggleComponent(comp.id as keyof EnabledComponents)}
                            style={{ accentColor: '#2a9fff', width: 16, height: 16 }} />
                          <span style={{ fontSize: '0.8rem', color: inputs.enabled_components[comp.id as keyof EnabledComponents] ? 'white' : 'var(--text-muted)' }}>{comp.label}</span>
                        </label>
                        {inputs.enabled_components[comp.id as keyof EnabledComponents] && (
                           <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {['GPU', 'CPU'].map(dev => (
                              <button key={dev}
                                onClick={() => {
                                  const newDevices = { ...inputs.component_devices, [comp.id]: dev.toLowerCase() };
                                  setInput('component_devices', newDevices);
                                }}
                                style={{
                                  fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 4, cursor: 'pointer',
                                  background: inputs.component_devices[comp.id as keyof EnabledComponents] === dev.toLowerCase() ? '#2a9fff' : 'rgba(255,255,255,0.05)',
                                  color: inputs.component_devices[comp.id as keyof EnabledComponents] === dev.toLowerCase() ? 'white' : 'var(--text-muted)',
                                  border: 'none'
                                }}>{dev}</button>
                            ))}
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>🎛️ Optimization</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {QUANT_OPTIONS.map(q => (
                      <button key={q.value}
                        onClick={() => setInput('quantization', q.value as CalculatorInputs['quantization'])}
                        style={{
                          padding: '0.4rem 0.875rem', borderRadius: 8, border: `1px solid ${inputs.quantization === q.value ? q.color : 'var(--border)'}`,
                          background: inputs.quantization === q.value ? `${q.color}22` : 'transparent',
                          color: inputs.quantization === q.value ? q.color : 'var(--text-secondary)',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>📊 Capacity & Workload</h2>
                  <Slider label="Target Concurrency (CCU)" field="target_ccu" min={1} max={500} helpText="Simultaneous active calls/sessions" />
                  <Slider label="Context Window (Used)" field="context_length" min={512} max={128000} step={512} format={v => `${(v/1000).toFixed(1)}k`} helpText="Avg. prompt + history tokens" />
                  <Slider label="Response Speed Target" field="user_tps_required" min={5} max={100} format={v => `${v} TPS`} helpText="Tokens per second per user" />
                  <Slider label="Avg. Response Length" field="output_tokens" min={20} max={1000} step={20} format={v => `${v} tokens`} />
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>⚡ Real-time Performance</h2>
                  <Slider label="STT Processing (RTF)" field="stt_rtf" min={0.01} max={0.5} step={0.01} format={v => v.toFixed(2)} helpText="Time to transcribe / Audio length (lower = better)" />
                  <Slider label="Silence Logic (VAD)" field="silence_ratio" min={0.1} max={0.9} step={0.05} format={v => `${(v*100).toFixed(0)}%`} helpText="% of time skipping processing due to silence" />
                  <Slider label="TTS Real-time Factor" field="tts_rtf" min={0.01} max={0.5} step={0.01} format={v => v.toFixed(2)} />
                  <Slider label="Network Hop Latency" field="network_latency_ms" min={20} max={600} step={10} format={v => `${v}ms`} />
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>☁️ Cloud Provider</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'gcp', label: 'GCP' },
                      { id: 'aws', label: 'AWS' },
                      { id: 'azure', label: 'Azure' },
                      { id: 'on_prem', label: 'On-Prem' },
                    ].map(cp => (
                      <button key={cp.id}
                        onClick={() => setInput('cloud_provider', cp.id)}
                        style={{
                          padding: '0.4rem 1.25rem', borderRadius: 8, border: `1px solid ${inputs.cloud_provider === cp.id ? '#2a9fff' : 'var(--border)'}`,
                          background: inputs.cloud_provider === cp.id ? `#2a9fff22` : 'transparent',
                          color: inputs.cloud_provider === cp.id ? '#2a9fff' : 'var(--text-secondary)',
                          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                        }}>{cp.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======== RESOURCES TAB ======== */}
          {activeTab === 'vram' && results && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#2a9fff' }}>💾 GPU VRAM Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'LLM Weights', value: results.resources.breakdown.weights_vram_gb, color: '#2a9fff' },
                    { label: 'LLM KV Cache', value: results.resources.breakdown.kv_cache_vram_gb, color: '#00d4ff' },
                    { label: 'STT (In-GPU)', value: results.resources.breakdown.stt_vram_gb, color: '#b388ff' },
                    { label: 'TTS (In-GPU)', value: results.resources.breakdown.tts_vram_gb, color: '#00e676' },
                    { label: 'Speech Utils', value: results.resources.breakdown.speech_vram_gb, color: '#ffca28' },
                    { label: 'Framework Overhead', value: results.resources.breakdown.overhead_vram_gb, color: '#ff7043' },
                  ].filter(r => r.value > 0).map(row => (
                    <div key={row.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: 'white' }}>{formatGb(row.value)}</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(row.value / results.resources.gpu_vram_gb) * 100}%`, background: row.color, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Total GPU VRAM Required</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: results.resources.gpu_vram_gb > 24 ? '#ffca28' : '#00e676' }}>{formatGb(results.resources.gpu_vram_gb)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                   <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#b388ff' }}>🧠 System Memory (Host RAM)</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {[
                        { label: 'LLM Host Runtime', value: results.resources.breakdown.llm_ram_gb, color: '#2a9fff' },
                        { label: 'STT Audio Engine', value: results.resources.breakdown.stt_ram_gb, color: '#b388ff' },
                        { label: 'TTS Frame Buffer', value: results.resources.breakdown.tts_ram_gb, color: '#00e676' },
                      ].filter(r => r.value > 0).map(row => (
                        <div key={row.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                            <span style={{ fontWeight: 700, color: 'white' }}>{formatGb(row.value)}</span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(row.value / results.resources.system_ram_gb) * 100}%`, background: row.color }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: 700 }}>Total RAM</span>
                         <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b388ff' }}>{formatGb(results.resources.system_ram_gb)}</span>
                      </div>
                   </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                   <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffca28' }}>🏎️ Compute & CPU Resources</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,202,40,0.05)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,202,40,0.1)' }}>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Required Compute</div>
                           <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffca28' }}>{results.resources.total_tflops_req.toFixed(1)} TFLOPS</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ref: H100 (1,979 TFLOPS)</div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ref: L4 (242 TFLOPS)</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{results.resources.cpu_cores} vCPU</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dedicated cores recommended for production stability</div>
                         </div>
                         <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Pattern:<br/><strong style={{ color: '#ffca28' }}>{inputs.deployment_strategy.toUpperCase()}</strong>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* ======== LATENCY TAB ======== */}
          {activeTab === 'latency' && results && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', background: results.latency.within_budget ? 'rgba(0,230,118,0.03)' : 'rgba(255,82,82,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2rem', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>End-to-End Latency</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: results.latency.within_budget ? '#00e676' : '#ff5252' }}>{formatMs(results.latency.total_ms)}</div>
                    </div>
                    <div>
                        <div style={{ height: 32, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
                           {[
                              { label: 'Net', val: results.latency.network_ms, color: '#b388ff' },
                              { label: 'STT', val: results.latency.stt_ms, color: '#2a9fff' },
                              { label: 'TTFT', val: results.latency.ttft_ms, color: '#00d4ff' },
                              { label: 'TPOT', val: results.latency.tpot_ms, color: '#ff7043' },
                              { label: 'TTS', val: results.latency.tts_ms, color: '#00e676' },
                           ].filter(s => s.val > 0).map(s => (
                              <div key={s.label} style={{ width: `${(s.val/results.latency.total_ms)*100}%`, background: s.color }} title={`${s.label}: ${formatMs(s.val)}`} />
                           ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                           {[
                              { label: 'Network', color: '#b388ff' }, { label: 'STT', color: '#2a9fff' }, { label: 'LLM TTFT', color: '#00d4ff' }, { label: 'LLM Decode', color: '#ff7043' }, { label: 'TTS', color: '#00e676' }
                           ].map(l => (
                              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                                 <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                                 <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                              </div>
                           ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '1.25rem', fontWeight: 700, color: results.latency.within_budget ? '#00e676' : '#ff5252' }}>
                          {results.latency.within_budget ? 'Budget OK' : 'Over Budget'}
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 1500ms</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                   <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>Latency Distribution</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={[
                          { name: 'Network', ms: results.latency.network_ms },
                          { name: 'STT', ms: results.latency.stt_ms },
                          { name: 'LLM (TTFT)', ms: results.latency.ttft_ms },
                          { name: 'LLM (Decode)', ms: results.latency.tpot_ms },
                          { name: 'TTS', ms: results.latency.tts_ms },
                        ].filter(d => d.ms > 0)}>
                           <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7da8d0' }} />
                           <YAxis unit="ms" tick={{ fontSize: 10, fill: '#7da8d0' }} />
                           <Tooltip content={<CustomTooltip />} />
                           <Bar dataKey="ms" fill="#2a9fff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>Conversation Dynamics</h3>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>User Latency Perception</span>
                            <span style={{ fontWeight: 700, color: results.latency.total_ms < 1000 ? '#00e676' : '#ffca28' }}>{results.latency.total_ms < 800 ? 'Ultra-Responsive' : results.latency.total_ms < 1500 ? 'Natural' : 'Delayed'}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Throughput Cap per CCU</span>
                            <span style={{ fontWeight: 700 }}>{inputs.user_tps_required} tok/s</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Audio Chunks (Hop)</span>
                            <span style={{ fontWeight: 700 }}>~{inputs.network_latency_ms}ms</span>
                         </div>
                      </div>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#2a9fff11', border: '1px solid #2a9fff33', borderRadius: 8, fontSize: '0.75rem', color: '#2a9fff' }}>
                        💡 Tip: Reduce `network_latency_ms` by deploying in the same GCP/AWS region as your core user base.
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* ======== HARDWARE TAB ======== */}
          {activeTab === 'hardware' && results && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
               <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'white' }}>🖥️ GPU Matchmaking</h2>
               <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Recommended: <strong style={{ color: '#2a9fff' }}>{results.finops.best_gpu?.name || 'N/A'}</strong> · VRAM Req: <strong>{formatGb(results.resources.gpu_vram_gb)}</strong></p>
               <div className="responsive-table">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                       <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Instance/GPU</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>VRAM Util</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Throughput Util</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Capacity Needed</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Spot Cost/mo</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Fit</th>
                       </tr>
                    </thead>
                    <tbody>
                       {results.finops.gpu_matches.map(m => (
                         <tr key={m.gpu.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: m.recommended ? 'rgba(42,159,255,0.05)' : 'transparent' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                               <div style={{ fontWeight: 700, color: m.recommended ? '#2a9fff' : 'white' }}>{m.recommended && '⭐ '}{m.gpu.name}</div>
                               <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.gpu.bandwidth_gbps} GB/s · {m.gpu.vram_gb}GB</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ flex: 1, minWidth: 60, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                     <div style={{ height: '100%', width: `${Math.min(100, (results.resources.gpu_vram_gb/m.gpu.vram_gb)*100)}%`, background: (results.resources.gpu_vram_gb/m.gpu.vram_gb) > 0.9 ? '#ff5252' : '#00e676' }} />
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{((results.resources.gpu_vram_gb/m.gpu.vram_gb)*100).toFixed(0)}%</span>
                               </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ flex: 1, minWidth: 60, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                     <div style={{ height: '100%', width: `${Math.min(100, m.compute_utilization_pct)}%`, background: '#2a9fff' }} />
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.compute_utilization_pct.toFixed(0)}%</span>
                               </div>
                            </td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.instances_needed} Pods</td>
                            <td style={{ padding: '0.75rem', color: '#00e676', fontWeight: 700 }}>{formatUsd(m.spot_monthly_total)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                               {m.fits ? <span style={{ color: '#00e676' }}>✓</span> : <span style={{ color: '#ff5252' }}>✗</span>}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* ======== FINOPS TAB ======== */}
          {activeTab === 'finops' && results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               {/* Verdict Banner */}
               {results.finops.verdict && (
                 <div className="glass-card" style={{ 
                   padding: '1.5rem', 
                   border: '2px solid #2a9fff44', 
                   background: 'linear-gradient(135deg, rgba(42,159,255,0.1), transparent)',
                   position: 'relative',
                   overflow: 'hidden'
                 }}>
                   <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.05 }}>🏆</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                         <div style={{ fontSize: '0.7rem', color: '#2a9fff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Solution Architect Verdict</div>
                         <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>{results.finops.verdict.category}</h3>
                         <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#2a9fff22', padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid #2a9fff44' }}>
                           <span style={{ fontSize: '1rem' }}>☁️</span>
                           <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2a9fff' }}>{results.finops.verdict.recommended_platform}</span>
                         </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total OpEx (Incl. Infra)</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00e676' }}>{formatUsd(results.finops.verdict.total_monthly_with_infra)}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mo</span></div>
                      </div>
                   </div>
                   <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '80%' }}>
                      {results.finops.verdict.advice}
                   </p>
                 </div>
               )}

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div className="metric-card" style={{ background: 'rgba(0,230,118,0.05)', borderColor: 'rgba(0,230,118,0.2)' }}>
                     <div style={{ color: '#00e676', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>ESTIMATED MONTHLY (SPOT)</div>
                     <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{formatUsd(results.finops.monthly_spot)}</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>${(results.finops.monthly_spot / inputs.target_ccu).toFixed(2)} / CCU month</div>
                  </div>
                  <div className="metric-card">
                     <div style={{ color: '#2a9fff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>MONTHLY FIXED INFRA</div>
                     <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{formatUsd(results.finops.verdict?.fixed_infra_monthly || 0)}</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {inputs.cloud_provider === 'gcp' && "GKE Control Plane + Load Balancer"}
                        {inputs.cloud_provider === 'aws' && "EKS Control Plane + ALB"}
                        {inputs.cloud_provider === 'azure' && "AKS Control Plane + App Gateway"}
                        {inputs.cloud_provider === 'on_prem' && "Self-Hosted Cluster Overhead"}
                     </div>
                  </div>
                  <div className="metric-card">
                     <div style={{ color: '#b388ff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>SPOT SAVINGS VS ON-DEMAND</div>
                     <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#00e676' }}>{results.finops.savings_pct.toFixed(0)}%</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatUsd(results.finops.monthly_savings_spot)} saved every month</div>
                  </div>
               </div>

               <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>🚀 Architectural Blueprint ({inputs.deployment_strategy === 'monolithic' ? 'Single Pod' : 'Distributed Mesh'})</h3>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                       Scale containers using <strong style={{ color: '#2a9fff' }}>Queue Depth</strong> metrics instead of CPU/GPU utilization for optimal conversational stability.
                    </div>
                    <div className="code-block" style={{ fontSize: '0.75rem' }}>
                      {results.finops.hpa_config}
                    </div>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>FinOps Tips</h3>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', lineHeight: 2 }}>
                       <li>Use <strong style={{ color: '#2a9fff' }}>GKE Spot VMs</strong> with stateless pods for 60% savings.</li>
                       <li>Enable <strong style={{ color: '#00e676' }}>Automatic Prefix Caching</strong> in vLLM for multi-turn sessions.</li>
                       <li>Offload <strong style={{ color: '#ffca28' }}>STT/TTS to CPU-only nodes</strong> if GPU VRAM is constrained.</li>
                       <li>Deploy closer to the user to reduce <strong style={{ color: '#b388ff' }}>Egress Latency</strong> and cost.</li>
                    </ul>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(42,159,255,0.2)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2a9fff' }}>Monthly OpEx Trend</h3>
                    <ResponsiveContainer width="100%" height={150}>
                       <BarChart data={results.finops.gpu_matches.filter(m => m.fits).slice(0, 4).map(m => ({ name: m.gpu.name, cost: m.spot_monthly_total }))}>
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="cost" fill="#2a9fff" radius={[4, 4, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>Compare top 4 GPU candidates by cost</div>
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        FinOps Estimator Pro · Built for AI Architects · Prices updated March 2026
      </footer>
    </div>
  )
}
