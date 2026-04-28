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
  blurb: string;        // one-line definition
  matters: string;      // "why this matters for AI" — for the technical reader
  regex: RegExp;
}

export const THEMES: Theme[] = [
  {
    slug: 'agents',
    name: 'Agents',
    blurb: 'Agentic systems, orchestration, tool use, autonomous reasoning loops.',
    matters: 'When labs treat agents as their shipped product surface (not a research demo), the field is moving from chat-style assistance toward autonomous task completion. The hiring shape predicts which labs commit to that move structurally vs. as a research thread.',
    regex: /(\bagent\b|\bagents\b|agentic|orchestration|tool[- ]use|reasoning model|autonomous workflow)/i,
  },
  {
    slug: 'silicon',
    name: 'Silicon',
    blurb: 'Chip design, verification, hardware engineering, custom AI ASICs.',
    matters: 'Most AI compute is GPUs today; the long-run shape is heterogeneous (custom ASICs for inference, networking, robotics, AV). Where labs and chip companies hire silicon designers tells you which AI workloads will get dedicated hardware first.',
    regex: /(\basic\b|\bsilicon\b|chip design|\brtl\b|risc-?v|\bfpga\b|hardware engineer|hardware design|verification engineer|physical design|post[- ]silicon)/i,
  },
  {
    slug: 'inference',
    name: 'Inference',
    blurb: 'Model serving, runtime, TRT / Triton / Ray Serve, inference reliability.',
    matters: 'Inference is where AI meets users. Cost-per-token, latency, and reliability come from this layer. Hiring concentration in inference signals the company is operating at meaningful production scale.',
    regex: /(inference|model serving|tensorrt|\btrt-?llm\b|triton(?!ous)|ray serve|serving infrastructure|inference (?:platform|infrastructure|runtime|engine))/i,
  },
  {
    slug: 'safety',
    name: 'Safety & Alignment',
    blurb: 'Alignment research, red-teaming, policy, trust & safety engineering.',
    matters: 'Safety hiring share within an AI lab is the most readable signal of whether that lab\'s register has shifted from research-first to product-first. Cross-lab comparison reveals where the alignment effort actually lives.',
    regex: /(alignment|red[- ]?team|trust and safety|safeguards|safety systems?|safety eng|policy (?:analyst|researcher|engineer)|harm(?:ful)? content)/i,
  },
  {
    slug: 'multimodal',
    name: 'Multimodal',
    blurb: 'Audio, video, vision, image, 3D — beyond text-only models.',
    matters: 'Text-only frontier capability is increasingly saturated. Where the next quality jumps come from is multimodal: audio + video + vision integrated. Hiring exposure to these axes predicts which labs ship the next generation of capability.',
    regex: /(multimodal|\bvoice\b|\baudio\b|\bspeech\b|\bvideo\b|\bvision\b|\bimage\b|\b3d\b|\btext-to-image\b|text-to-video|\bdiffusion\b)/i,
  },
  {
    slug: 'compute',
    name: 'Compute Infrastructure',
    blurb: 'Datacenter, colocation, capacity planning, capex, networking fabric.',
    matters: 'Frontier compute is bounded by physical infrastructure. Labs that hire datacenter engineers, capex accountants, and colocation counsel are signalling they will own (not rent) significant capacity — a structural change in how AI is built.',
    regex: /(datacenter|data centre|colocation|capacity (?:planning|engineer|delivery)|capex|infiniband|nvlink|switch fabric|frontier cluster|compute (?:engineer|infrastructure|capacity))/i,
  },
  {
    slug: 'applied',
    name: 'Applied / Forward Deployed',
    blurb: 'Forward-deployed engineering, applied AI, customer-side engineers.',
    matters: 'A lab hiring "Forward Deployed Engineers" or "Applied AI Engineers" at multi-region scale is staffing the Palantir-shape of enterprise software vendor. The presence of this role pattern predicts a research-to-revenue pivot is structurally underway.',
    regex: /(forward[- ]deployed|applied (?:ai|engineer|engineering)|deployed engineer|customer engineer|solutions engineer.*\b(?:ai|ml)\b)/i,
  },
  {
    slug: 'training',
    name: 'Training',
    blurb: 'Pretraining, post-training, fine-tuning, data quality, RLHF.',
    matters: 'How a lab structures its training stack — pretraining vs post-training vs data-quality vs RLHF vs distillation — reveals where it believes the next quality gains will come from. Sub-discipline weights matter more than total counts.',
    regex: /(pre[- ]?training|post[- ]?training|fine[- ]?tun(?:e|ing)|distillation|\brlhf\b|reinforcement learning|training (?:infra|infrastructure|performance|data))/i,
  },
];

export const THEMES_BY_SLUG: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.slug, t])
);
