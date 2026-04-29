// Industry-wide theme catalogue. Each theme is a regex matched against job
// titles in the AI-relevant roster; counts roll up across companies for the
// /themes/ panorama view. Keep regexes specific — broad terms ("engineer")
// would dominate every theme.
//
// Used by:
//   - src/pages/themes/index.astro          (overview list)
//   - src/pages/themes/[theme].astro        (per-theme detail)

export interface Theme {
  slug: string;
  name: string;
  blurb: string;          // one-line definition
  matters: string;        // "why this matters for AI" — for the technical reader
  regex: RegExp;
  glyph: string;          // single-char spine ornament for this theme's pages
  glyphRationale: string; // why this glyph — load-bearing decoration, not ornament
  equation: string;       // background-watermark equation, drawn faintly behind content
}

export const THEMES: Theme[] = [
  {
    slug: 'agents',
    name: 'Agents',
    blurb: 'Agentic systems, orchestration, tool use, autonomous reasoning loops.',
    matters: 'When labs treat agents as their shipped product surface (not a research demo), the field is moving from chat-style assistance toward autonomous task completion. The hiring shape predicts which labs commit to that move structurally vs. as a research thread.',
    regex: /(\bagent\b|\bagents\b|agentic|orchestration|tool[- ]use|reasoning model|autonomous workflow)/i,
    glyph: '∂',
    glyphRationale: "Partial derivative. An agent's action is a function of its state; ∂a/∂s is the agent abstraction compressed into one symbol.",
    equation: 'V*(s) = max [ r + γ V*(s′) ]',
  },
  {
    slug: 'silicon',
    name: 'Silicon',
    blurb: 'Chip design, verification, hardware engineering, custom AI ASICs.',
    matters: 'Most AI compute is GPUs today; the long-run shape is heterogeneous (custom ASICs for inference, networking, robotics, AV). Where labs and chip companies hire silicon designers tells you which AI workloads will get dedicated hardware first.',
    regex: /(\basic\b|\bsilicon\b|chip design|\brtl\b|risc-?v|\bfpga\b|hardware engineer|hardware design|verification engineer|physical design|post[- ]silicon)/i,
    glyph: 'Ω',
    glyphRationale: 'Ohm — the unit of electrical resistance, and the bottom of the AI stack where compute meets the laws of physics.',
    equation: 'n(t) = n₀ · 2^(t/T)',
  },
  {
    slug: 'inference',
    name: 'Inference',
    blurb: 'Model serving, runtime, TRT / Triton / Ray Serve, inference reliability.',
    matters: 'Inference is where AI meets users. Cost-per-token, latency, and reliability come from this layer. Hiring concentration in inference signals the company is operating at meaningful production scale.',
    regex: /(inference|model serving|tensorrt|\btrt-?llm\b|triton(?!ous)|ray serve|serving infrastructure|inference (?:platform|infrastructure|runtime|engine))/i,
    glyph: 'σ',
    glyphRationale: 'The squashing function at the end of every forward pass. σ is what turns logits into a decision; inference is the layer that runs it.',
    equation: 'softmax(zᵢ) = exp(zᵢ) / Σⱼ exp(zⱼ)',
  },
  {
    slug: 'safety',
    name: 'Safety & Alignment',
    blurb: 'Alignment research, red-teaming, policy, trust & safety engineering.',
    matters: "Safety hiring share within an AI lab is the most readable signal of whether that lab's register has shifted from research-first to product-first. Cross-lab comparison reveals where the alignment effort actually lives.",
    regex: /(alignment|red[- ]?team|trust and safety|safeguards|safety systems?|safety eng|policy (?:analyst|researcher|engineer)|harm(?:ful)? content)/i,
    glyph: '∴',
    glyphRationale: 'Therefore — the inference step in a logical proof. Safety is the conclusion the field is forced to draw from its own growing capabilities.',
    equation: 'min L + λ · D_KL(π ‖ π_ref)',
  },
  {
    slug: 'multimodal',
    name: 'Multimodal',
    blurb: 'Audio, video, vision, image, 3D — beyond text-only models.',
    matters: 'Text-only frontier capability is increasingly saturated. Where the next quality jumps come from is multimodal: audio + video + vision integrated. Hiring exposure to these axes predicts which labs ship the next generation of capability.',
    regex: /(multimodal|\bvoice\b|\baudio\b|\bspeech\b|\bvideo\b|\bvision\b|\bimage\b|\b3d\b|\btext-to-image\b|text-to-video|\bdiffusion\b)/i,
    glyph: '⊕',
    glyphRationale: 'Direct sum. Text ⊕ vision ⊕ audio is the operator that composes separate modality spaces into one.',
    equation: 'Att(Q,K,V) = softmax(QKᵀ / √dₖ) V',
  },
  {
    slug: 'compute',
    name: 'Compute Infrastructure',
    blurb: 'Datacenter, colocation, capacity planning, capex, networking fabric.',
    matters: 'Frontier compute is bounded by physical infrastructure. Labs that hire datacenter engineers, capex accountants, and colocation counsel are signalling they will own (not rent) significant capacity — a structural change in how AI is built.',
    regex: /(datacenter|data centre|colocation|capacity (?:planning|engineer|delivery)|capex|infiniband|nvlink|switch fabric|frontier cluster|compute (?:engineer|infrastructure|capacity))/i,
    glyph: '∫',
    glyphRationale: 'Integral. Total FLOPs is the integral over time of compute throughput; compute infrastructure exists to maximise that integral.',
    equation: 'FLOPs ≈ 6 · N · D',
  },
  {
    slug: 'applied',
    name: 'Applied / Forward Deployed',
    blurb: 'Forward-deployed engineering, applied AI, customer-side engineers.',
    matters: 'A lab hiring "Forward Deployed Engineers" or "Applied AI Engineers" at multi-region scale is staffing the Palantir-shape of enterprise software vendor. The presence of this role pattern predicts a research-to-revenue pivot is structurally underway.',
    regex: /(forward[- ]deployed|applied (?:ai|engineer|engineering)|deployed engineer|customer engineer|solutions engineer.*\b(?:ai|ml)\b)/i,
    glyph: '∇',
    glyphRationale: 'Nabla — the gradient operator, the descent direction. Applied AI is research descended from the training cluster into customer production.',
    equation: 'value ≈ ∫ context · model dt',
  },
  {
    slug: 'training',
    name: 'Training',
    blurb: 'Pretraining, post-training, fine-tuning, data quality, RLHF.',
    matters: 'How a lab structures its training stack — pretraining vs post-training vs data-quality vs RLHF vs distillation — reveals where it believes the next quality gains will come from. Sub-discipline weights matter more than total counts.',
    regex: /(pre[- ]?training|post[- ]?training|fine[- ]?tun(?:e|ing)|distillation|\brlhf\b|reinforcement learning|training (?:infra|infrastructure|performance|data))/i,
    glyph: 'δ',
    glyphRationale: 'Delta — the small change at each training step. θ ← θ + δ is the whole stack: pretraining, post-training, fine-tuning, distillation.',
    equation: 'θ ← θ − η ∇L(θ)',
  },
];

export const THEMES_BY_SLUG: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.slug, t])
);
