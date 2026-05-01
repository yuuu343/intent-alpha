// Shared topic taxonomy + match helpers for cross-reference.mjs and
// validate-mapping.mjs. The 12 topics are the mapping axis used by the Intent
// Lattice / Compute Shadow surface — keep this file the single source of truth.

// Default (jobs) regex set — matches against short job titles where bare
// keywords like "inference" or "multimodal" are clean signals (they appear in
// team/role names, not incidental wording).
export const TOPICS = {
  post_training:     /(post[- ]?training|preference modeling|\brlhf\b|\brlaif\b|\bdpo\b|\bgrpo\b|\bsft\b|\bppo\b)/i,
  pre_training:      /(pre[- ]?training|pretrain(?:ed|ing)|scaling law|tokenizer (?:training|design))/i,
  interpretability:  /(interpretab|mech(?:anistic)? interp|circuit analysis|sparse autoencoder|\bsae\b|representation engineering)/i,
  alignment_safety:  /(alignment|safeguard|constitutional ai|harm reduction|red[- ]?team|trust and safety)/i,
  agents:            /(\bagent\b|agentic|tool use|orchestration|autonomous workflow|computer use)/i,
  inference_serving: /(inference|model serving|tensorrt|\btrt-?llm\b|ray serve|\bvllm\b|serving infrastructure)/i,
  multimodal:        /(multimodal|vision-?language|\bvlm\b|audio model|video model|speech model|image model)/i,
  evaluation:        /(\beval(?:uation)?\b|benchmark|model assessment)/i,
  compute_infra:     /(datacenter|colocation|\bgpu cluster\b|infiniband|nvlink|capex|capacity planning)/i,
  data_quality:      /(data quality|data curation|dataset construction|filtering pipeline)/i,
  security_eng:      /(security engineer|security research|threat model|incident response|vulnerab)/i,
  // applied_fde: tightened from bare "applied ai/ml/engineer" — matched
  // pre-sales "Applied AI Architect" roles. Require explicit engineer/researcher.
  applied_fde:       /(forward[- ]deployed|deployment engineer|customer engineer|solutions engineer|applied (?:ai|ml) engineer|applied (?:ai|ml) researcher)/i,
};

// arxiv-specific overrides — paper abstracts contain bare keywords ("inference",
// "evaluation", "multimodal") in non-substantive contexts. These tighter
// regexes require domain-specific context to suppress those false positives.
// Topics not listed here fall back to TOPICS.
export const TOPICS_ARXIV = {
  // pre_training: in arxiv abstracts "pretrained model" appears as casual
  // background in many papers (misalignment, evaluation, etc). Require the
  // hyphenated/spaced form (semantic noun phrase, indicates substance).
  pre_training:      /(pre[- ]training|scaling law|tokenizer (?:training|design)|distillation pre-training|continued pre[- ]training|large-scale pre-training)/i,
  inference_serving: /(model serving|serving infrastructure|tensorrt|\btrt-?llm\b|ray serve|\bvllm\b|speculative decoding|kv cache|\bpagedattention\b|continuous batching|inference (?:engine|server|stack|infrastructure|optimization|kernel|latency|throughput|routing))/i,
  multimodal:        /(multimodal (?:llm|model|learning|encoder|reasoning|fusion|representation|pre-?training|fine-?tuning|alignment)|multimodal large language|vision-?language|\bvlm\b|\bmllm\b|audio (?:llm|model)|video (?:llm|model)|speech (?:llm|model))/i,
  evaluation:        /(\bbenchmark(?:ing|s)?\b|leaderboard|model assessment|evaluation (?:framework|protocol|methodology|harness|suite|dataset|benchmark)|llm[- ]as[- ](?:a[- ])?judge)/i,
};

// Resolve the right regex for a (topic, source) cell.
export function topicRegex(topic, source) {
  if (source === 'arxiv' && TOPICS_ARXIV[topic]) return TOPICS_ARXIV[topic];
  return TOPICS[topic];
}

// Per-source text projector. Jobs match on title only (current behavior of
// cross-reference.mjs); papers on title+summary; repos on name+description+
// recent commit messages.
export function projectText(item, source) {
  if (source === 'jobs')   return item.title ?? '';
  if (source === 'arxiv')  return `${item.title ?? ''} ${item.summary ?? ''}`;
  if (source === 'github') return `${item.name ?? ''} ${item.description ?? ''} ${(item.recentCommits ?? []).map((c) => c.message).join(' ')}`;
  return '';
}

export function matchTopic(text, topic, source = 'jobs') {
  return topicRegex(topic, source).test(text);
}

export function topicNames() {
  return Object.keys(TOPICS);
}

// Role classifier — does this job title indicate research/engineering substance?
//
// Background: the topic regexes (e.g. compute_infra matching "datacenter")
// also match department/keyword references in non-technical roles
// ("Commercial Counsel, Datacenters", "Support Operations Specialist, AI Agent
// Management"). For the Intent Lattice / Compute Shadow surface we want
// research-substance counts, not all-jobs-mentioning-keyword counts.
//
// Apply this filter BEFORE the topic regex when computing the Matrix.
// cross-reference.mjs intentionally does NOT apply it (existing dispatches
// reference its looser counts); new surfaces should opt in.
const POSITIVE_ROLE = /\b(research|researcher|engineer|engineering|scientist|architect|developer|\bml\b|machine learning|data scientist|\bsre\b|tech ?lead|technical lead|founding (?:engineer|scientist|researcher))\b/i;
const NEGATIVE_ROLE = /\b(counsel|paralegal|sales|account (?:executive|manager)|partner success|marketing|recruiter|recruiting|\bhr\b|people ops|finance|accounting|customer success|administrative assistant|executive assistant|chief of staff|business development|support (?:operations|specialist|representative))\b/i;
// Department-level exclusion: even technical-sounding titles like "Applied AI
// Architect, Sales" should be filtered out when the department itself is
// non-technical (pre-sales / GTM / customer-facing).
const NEGATIVE_DEPT = /^(sales|marketing|customer success|partner success|business development|legal|finance|recruiting|people|operations management)\b/i;

export function isResearchRole(title, department = null) {
  if (!title) return false;
  if (NEGATIVE_ROLE.test(title)) return false;
  if (department && NEGATIVE_DEPT.test(department.trim())) return false;
  return POSITIVE_ROLE.test(title);
}
