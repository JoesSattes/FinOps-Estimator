import Link from 'next/link'

const features = [
  {
    icon: '💾',
    title: 'Precision VRAM Calculator',
    description: 'Calculates model weight memory by quantization (FP16→INT4) with MoE active-parameter support',
    color: '#2a9fff',
  },
  {
    icon: '🧩',
    title: 'Smart KV Cache Estimator',
    description: 'Models KV cache growth with GQA & PagedAttention — reducing fragmentation from ~80% to <4%',
    color: '#00d4ff',
  },
  {
    icon: '⏱️',
    title: 'End-to-End Latency Simulator',
    description: 'Breaks down STT-LLM-TTS pipeline against the 1,500ms human-conversation threshold',
    color: '#00e676',
  },
  {
    icon: '🖥️',
    title: 'Hardware Matchmaker',
    description: 'Auto-selects the most cost-efficient GPU (T4 → L4 → A100 → H100) for your VRAM & CCU target',
    color: '#b388ff',
  },
  {
    icon: '💰',
    title: 'FinOps Blueprint',
    description: 'Compares on-demand vs spot pricing and generates a Kubernetes HPA config based on queue depth',
    color: '#ffca28',
  },
  {
    icon: '📊',
    title: 'CCU Capacity Planner',
    description: 'Estimates concurrent capacity units per GPU for STT (RTF-based) and LLM (TPS-based)',
    color: '#ff7043',
  },
]

const models = ['Llama 3 8B', 'Llama 3 70B', 'Gemma 2 9B', 'Qwen 2.5 7B', 'Mixtral 8x7B', 'Mistral 7B']
const gpus = ['NVIDIA T4', 'NVIDIA L4', 'A100 40GB', 'A100 80GB', 'H100 80GB']

export default function Home() {
  const basePath = process.env.NODE_ENV === 'production' ? '/FinOps-Estimator' : ''

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Decorative orbs */}
      <div className="orb orb-blue" style={{ width: 600, height: 600, top: -200, left: -100, opacity: 0.6 }} />
      <div className="orb orb-cyan" style={{ width: 400, height: 400, top: 100, right: -100, opacity: 0.4 }} />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0.75rem 2rem',
        background: 'rgba(5,13,26,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧮</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>FinOps Estimator</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>CONVERSATIONAL AI CAPACITY PLANNING</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="https://github.com/JoesSattes/FinOps-Estimator" target="_blank" rel="noopener"
            style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', transition: 'color 0.2s' }}>
            GitHub ↗
          </a>
          <Link href="/calculator"
            style={{
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, #2a9fff, #1481f5)',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 0 16px rgba(42,159,255,0.4)',
              transition: 'box-shadow 0.2s',
            }}>
            Launch Calculator →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '5rem 2rem 4rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span className="badge badge-blue">Open Source</span>
          <span className="badge badge-green">Free on GitHub Pages</span>
          <span className="badge badge-purple">GCP First</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', color: 'white' }}>
          Stop Guessing Your{' '}
          <span className="gradient-text">AI Infrastructure</span>
          <br />
          Start Calculating It
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 680, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
          An open-source FinOps tool for Conversational AI pipelines. Mathematically calculates VRAM,
          KV Cache, end-to-end latency, and maps your STT → LLM → TTS workload to the
          most cost-effective cloud GPU — keeping you under the{' '}
          <strong style={{ color: 'var(--accent-green)' }}>1,500ms</strong> human-conversation threshold.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/calculator"
            style={{
              padding: '0.875rem 2rem',
              background: 'linear-gradient(135deg, #2a9fff, #1481f5)',
              color: 'white',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 0 24px rgba(42,159,255,0.5)',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}>
            🚀 Open Calculator
          </Link>
          <a href="https://github.com/JoesSattes/FinOps-Estimator" target="_blank" rel="noopener"
            style={{
              padding: '0.875rem 2rem',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}>
            ⭐ Star on GitHub
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap',
        }}>
          {[
            { value: `${gpus.length}`, label: 'GPUs Profiled' },
            { value: `${models.length}+`, label: 'LLM Models' },
            { value: '5', label: 'Calculator Modules' },
            { value: '< 1,500ms', label: 'Latency Target' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '3rem 2rem', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: 'white' }}>
          Five Calculators. One Tool.
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
          Each module uses math from production deployments — not guesswork.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {features.map(f => (
            <div key={f.title} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: f.color }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Models + GPUs row */}
      <section style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🤖 Supported LLM Models</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {models.map(m => <span key={m} className="badge badge-blue">{m}</span>)}
              <span className="badge badge-purple">+ more</span>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🖥️ Profiled GPUs (GCP/AWS/Azure)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {gpus.map(g => <span key={g} className="badge badge-green">{g}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ maxWidth: 640, margin: '0 auto', padding: '3rem', borderColor: 'rgba(42,159,255,0.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
            Ready to size your pipeline?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.65 }}>
            Enter your model, target CCU, and latency constraints.
            Get GPU recommendations with monthly cost estimates in seconds.
          </p>
          <Link href="/calculator"
            style={{
              padding: '0.875rem 2.5rem',
              background: 'linear-gradient(135deg, #2a9fff, #1481f5)',
              color: 'white',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(42,159,255,0.5)',
              display: 'inline-block',
            }}>
            Launch Free Calculator →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border)',
        position: 'relative', zIndex: 1,
      }}>
        <p>FinOps Estimator — Open Source under Apache 2.0 •{' '}
          <a href="https://github.com/JoesSattes/FinOps-Estimator" target="_blank" rel="noopener" style={{ color: 'var(--accent-blue)' }}>
            Contribute on GitHub
          </a>
        </p>
        <p style={{ marginTop: '0.25rem' }}>
          Pricing data is approximate. Always verify with official cloud provider pricing calculators.
        </p>
      </footer>
    </div>
  )
}
