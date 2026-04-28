// One-shot seed script. Writes the initial company roster as JSON files.
// After the first run, this can be deleted; companies are managed by editing
// the JSON files directly. Kept under scripts/ with leading underscore so the
// fetcher's glob doesn't pick it up.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'src', 'data', 'companies');

const wd = (host, tenant, site) => ({ ats: 'workday', workday: { host, tenant, site } });
const gh = (token) => ({ ats: 'greenhouse', atsIdentifier: token });
const lev = (token) => ({ ats: 'lever', atsIdentifier: token });
const ashby = (token) => ({ ats: 'ashby', atsIdentifier: token });
const sr = (token) => ({ ats: 'smartrecruiters', atsIdentifier: token });
const customAts = (note) => ({ ats: 'custom', customNote: note });

const ROSTER = [
  // ---- M7 (5 placeholders + 2 attempted Workday) ----
  { slug: 'apple', name: 'Apple', website: 'https://www.apple.com', sector: 'Consumer Electronics / On-device AI', headquarters: 'Cupertino, CA',
    description: 'Designs and sells consumer electronics, software and services; building neural-engine silicon and on-device AI features across the device line.',
    ...customAts('jobs.apple.com — bot-protected (Akamai), requires headless browser to fetch') },
  { slug: 'microsoft', name: 'Microsoft', website: 'https://www.microsoft.com', sector: 'Cloud / AI / Software', headquarters: 'Redmond, WA',
    description: 'Cloud (Azure), productivity software (M365, GitHub), and AI (Copilot, OpenAI partnership). Largest enterprise software vendor.',
    ...customAts('gcsservices.careers.microsoft.com — TLS/SNI restrictions in serverless fetch') },
  { slug: 'alphabet', name: 'Alphabet', website: 'https://abc.xyz', sector: 'Search / Cloud / AI', headquarters: 'Mountain View, CA',
    description: 'Parent of Google: search, advertising, YouTube, Cloud, Gemini AI, Waymo autonomy, and DeepMind research.',
    ...customAts('careers.google.com — SPA-only, no public JSON API') },
  { slug: 'amazon', name: 'Amazon', website: 'https://www.amazon.com', sector: 'Retail / Cloud / Logistics', headquarters: 'Seattle, WA',
    description: 'Retail marketplace, AWS cloud (largest infra provider), Prime Video, Alexa, robotics, advertising, satellites.',
    ...customAts('amazon.jobs — bot-protected') },
  { slug: 'meta', name: 'Meta', website: 'https://about.meta.com', sector: 'Social / AR-VR / AI', headquarters: 'Menlo Park, CA',
    description: 'Facebook, Instagram, WhatsApp, Threads. Reality Labs (AR/VR/Quest) and FAIR / Llama AI research.',
    ...customAts('metacareers.com — bot-protected') },
  { slug: 'nvidia', name: 'NVIDIA', website: 'https://www.nvidia.com', sector: 'AI / Semiconductors', headquarters: 'Santa Clara, CA',
    description: 'GPUs, CUDA, AI training/inference accelerators, datacenter networking (Mellanox), Omniverse. Dominant supplier for AI compute.',
    ...wd('nvidia.wd5.myworkdayjobs.com', 'nvidia', 'NVIDIAExternalCareerSite') },
  { slug: 'tesla', name: 'Tesla', website: 'https://www.tesla.com', sector: 'EV / Autonomy / Energy', headquarters: 'Austin, TX',
    description: 'Electric vehicles, energy storage, full self-driving development, Optimus humanoid robotics, Dojo training compute.',
    ...customAts('tesla.wd1.myworkdayjobs.com — Workday endpoint exists but body schema returns HTTP 422; needs investigation') },

  // ---- Semiconductors ----
  { slug: 'amd', name: 'AMD', website: 'https://www.amd.com', sector: 'Semiconductors', headquarters: 'Santa Clara, CA',
    description: 'CPUs, GPUs, adaptive computing (Xilinx). MI-series accelerators competing in datacenter AI.',
    ...wd('amd.wd1.myworkdayjobs.com', 'amd', 'Careers_External_Site') },
  { slug: 'intel', name: 'Intel', website: 'https://www.intel.com', sector: 'Semiconductors / Foundry', headquarters: 'Santa Clara, CA',
    description: 'CPUs, foundry services (IFS), Mobileye, Habana AI accelerators. Pivoting to advanced-node external manufacturing.',
    ...wd('intel.wd1.myworkdayjobs.com', 'intel', 'External') },
  { slug: 'tsmc', name: 'TSMC', website: 'https://www.tsmc.com', sector: 'Foundry', headquarters: 'Hsinchu, Taiwan',
    description: 'World-largest pure-play semiconductor foundry; manufactures advanced-node chips for Apple, NVIDIA, AMD, Qualcomm.',
    ...customAts('career.tsmc.com — custom regional system') },
  { slug: 'broadcom', name: 'Broadcom', website: 'https://www.broadcom.com', sector: 'Semiconductors / Software', headquarters: 'Palo Alto, CA',
    description: 'Networking silicon, custom AI accelerators (Google TPU partner), VMware. Major hyperscaler ASIC supplier.',
    ...wd('broadcom.wd1.myworkdayjobs.com', 'broadcom', 'External_Careers') },
  { slug: 'qualcomm', name: 'Qualcomm', website: 'https://www.qualcomm.com', sector: 'Semiconductors / Wireless', headquarters: 'San Diego, CA',
    description: 'Mobile SoCs (Snapdragon), 5G modems, automotive compute, on-device AI silicon, IoT.',
    ...wd('qualcomm.wd5.myworkdayjobs.com', 'Qualcomm', 'External') },
  { slug: 'marvell', name: 'Marvell', website: 'https://www.marvell.com', sector: 'Semiconductors / Networking', headquarters: 'Santa Clara, CA',
    description: 'Custom silicon, networking ASICs, optical, storage. Competes with Broadcom for hyperscaler custom-ASIC business.',
    ...wd('marvell.wd1.myworkdayjobs.com', 'Marvell', 'MarvellCareers2') },
  { slug: 'micron', name: 'Micron', website: 'https://www.micron.com', sector: 'Memory', headquarters: 'Boise, ID',
    description: 'DRAM and NAND flash memory; HBM (high-bandwidth memory) for AI accelerators.',
    ...wd('micron.wd1.myworkdayjobs.com', 'micron', 'External') },
  { slug: 'texasinstruments', name: 'Texas Instruments', website: 'https://www.ti.com', sector: 'Analog Semiconductors', headquarters: 'Dallas, TX',
    description: 'Analog and embedded processing chips, broad industrial / automotive exposure.',
    ...wd('ti.wd5.myworkdayjobs.com', 'TI', 'ExternalCareerSite') },
  { slug: 'analogdevices', name: 'Analog Devices', website: 'https://www.analog.com', sector: 'Analog Semiconductors', headquarters: 'Wilmington, MA',
    description: 'High-performance analog, mixed-signal, and DSP semiconductors.',
    ...wd('analog.wd1.myworkdayjobs.com', 'analog', 'External_Careers') },
  { slug: 'appliedmaterials', name: 'Applied Materials', website: 'https://www.appliedmaterials.com', sector: 'Semicon Equipment', headquarters: 'Santa Clara, CA',
    description: 'Semiconductor manufacturing equipment — deposition, etch, CMP. Critical to leading-edge fab capacity.',
    ...wd('amat.wd1.myworkdayjobs.com', 'amat', 'External') },
  { slug: 'lamresearch', name: 'Lam Research', website: 'https://www.lamresearch.com', sector: 'Semicon Equipment', headquarters: 'Fremont, CA',
    description: 'Wafer-fabrication equipment focused on etch and deposition.',
    ...wd('lamresearch.wd1.myworkdayjobs.com', 'lamresearch', 'External') },
  { slug: 'synopsys', name: 'Synopsys', website: 'https://www.synopsys.com', sector: 'EDA Software', headquarters: 'Sunnyvale, CA',
    description: 'EDA tools for chip design, IP, software security. Critical infrastructure to every chip company.',
    ...wd('synopsys.wd1.myworkdayjobs.com', 'Synopsys', 'Careers') },
  { slug: 'cadence', name: 'Cadence', website: 'https://www.cadence.com', sector: 'EDA Software', headquarters: 'San Jose, CA',
    description: 'EDA tools, IP, system analysis. Synopsys duopoly partner.',
    ...wd('cadence.wd1.myworkdayjobs.com', 'cadence', 'External_Careers') },
  { slug: 'arm', name: 'Arm', website: 'https://www.arm.com', sector: 'Semicon IP', headquarters: 'Cambridge, UK',
    description: 'Instruction-set architecture and CPU/GPU IP licensed across mobile, automotive, datacenter.',
    ...wd('arm.wd1.myworkdayjobs.com', 'Arm', 'Externalcareers') },
  { slug: 'asml', name: 'ASML', website: 'https://www.asml.com', sector: 'Semicon Equipment', headquarters: 'Veldhoven, Netherlands',
    description: 'Sole supplier of EUV lithography systems. Bottleneck for leading-edge chip manufacturing.',
    ...wd('asml.wd3.myworkdayjobs.com', 'asml', 'ASML_Careers') },
  { slug: 'microchip', name: 'Microchip', website: 'https://www.microchip.com', sector: 'Semiconductors / MCU', headquarters: 'Chandler, AZ',
    description: 'Microcontrollers, FPGAs (Microsemi), analog. Industrial / automotive / aerospace exposure.',
    ...wd('microchip.wd5.myworkdayjobs.com', 'microchip', 'External') },
  { slug: 'nxp', name: 'NXP Semiconductors', website: 'https://www.nxp.com', sector: 'Semiconductors / Auto', headquarters: 'Eindhoven, Netherlands',
    description: 'Automotive semiconductors, secure connectivity, edge processing.',
    ...wd('nxp.wd3.myworkdayjobs.com', 'nxp', 'careers') },
  { slug: 'onsemi', name: 'ON Semiconductor', website: 'https://www.onsemi.com', sector: 'Semiconductors / Power', headquarters: 'Phoenix, AZ',
    description: 'Power semiconductors, image sensors, automotive and industrial.',
    ...wd('onsemi.wd1.myworkdayjobs.com', 'onsemi', 'External') },

  // ---- Cloud / Infra SaaS (mostly Greenhouse) ----
  { slug: 'snowflake', name: 'Snowflake', website: 'https://www.snowflake.com', sector: 'Data Cloud', headquarters: 'Bozeman, MT',
    description: 'Cloud data warehouse / data cloud platform. Multi-cloud (AWS / Azure / GCP).',
    ...gh('snowflake') },
  { slug: 'databricks', name: 'Databricks', website: 'https://www.databricks.com', sector: 'Data / AI Platform', headquarters: 'San Francisco, CA',
    description: 'Lakehouse data platform, MLOps, generative-AI tooling (Mosaic acquisition).',
    ...gh('databricks') },
  { slug: 'cloudflare', name: 'Cloudflare', website: 'https://www.cloudflare.com', sector: 'Edge Cloud / Security', headquarters: 'San Francisco, CA',
    description: 'Global edge network: CDN, security, Workers serverless, R2 storage, AI inference at edge.',
    ...gh('cloudflare') },
  { slug: 'mongodb', name: 'MongoDB', website: 'https://www.mongodb.com', sector: 'Database', headquarters: 'New York, NY',
    description: 'Document database, Atlas managed cloud, vector search for AI.',
    ...gh('mongodb') },
  { slug: 'confluent', name: 'Confluent', website: 'https://www.confluent.io', sector: 'Streaming Data', headquarters: 'Mountain View, CA',
    description: 'Apache Kafka commercial steward — streaming platform, Kafka-as-a-service.',
    ...gh('confluent') },
  { slug: 'hashicorp', name: 'HashiCorp', website: 'https://www.hashicorp.com', sector: 'Infra Tooling', headquarters: 'San Francisco, CA',
    description: 'Terraform, Vault, Consul, Nomad — infrastructure-as-code and zero-trust networking.',
    ...gh('hashicorp') },
  { slug: 'datadog', name: 'Datadog', website: 'https://www.datadoghq.com', sector: 'Observability', headquarters: 'New York, NY',
    description: 'Monitoring, APM, logs, security, cost analytics across cloud and infrastructure.',
    ...gh('datadog') },
  { slug: 'newrelic', name: 'New Relic', website: 'https://newrelic.com', sector: 'Observability', headquarters: 'San Francisco, CA',
    description: 'Application performance monitoring and observability platform.',
    ...gh('newrelic') },
  { slug: 'coinbase', name: 'Coinbase', website: 'https://www.coinbase.com', sector: 'Crypto / FinTech', headquarters: 'Remote (US)',
    description: 'Crypto exchange, custody, layer-2 (Base), payments. Largest US crypto company by listing.',
    ...gh('coinbase') },
  { slug: 'robinhood', name: 'Robinhood', website: 'https://robinhood.com', sector: 'FinTech / Brokerage', headquarters: 'Menlo Park, CA',
    description: 'Retail brokerage, crypto, retirement. Margin-trading and active retail user growth.',
    ...gh('robinhood') },
  { slug: 'reddit', name: 'Reddit', website: 'https://www.reddit.com', sector: 'Social', headquarters: 'San Francisco, CA',
    description: 'Discussion network with ad business, post-IPO public company; data licensing to AI labs.',
    ...gh('reddit') },
  { slug: 'salesforce', name: 'Salesforce', website: 'https://www.salesforce.com', sector: 'CRM / Cloud', headquarters: 'San Francisco, CA',
    description: 'CRM, Slack, Tableau, Heroku, Data Cloud; Einstein AI agents in pipeline.',
    ...wd('salesforce.wd1.myworkdayjobs.com', 'salesforce', 'External_Career_Site') },
  { slug: 'twilio', name: 'Twilio', website: 'https://www.twilio.com', sector: 'Communications API', headquarters: 'San Francisco, CA',
    description: 'Programmable communications APIs (SMS, voice, email). Adding AI agents.',
    ...gh('twilio') },
  { slug: 'gitlab', name: 'GitLab', website: 'https://about.gitlab.com', sector: 'DevSecOps', headquarters: 'Remote (US)',
    description: 'Source control, CI/CD, security, AI assistance for DevSecOps.',
    ...gh('gitlab') },
  { slug: 'digitalocean', name: 'DigitalOcean', website: 'https://www.digitalocean.com', sector: 'Cloud Infrastructure', headquarters: 'New York, NY',
    description: 'Developer-focused cloud (compute, managed databases, Kubernetes); GPU droplets for inference.',
    ...gh('digitalocean') },

  // ---- Chip-related: storage / power / specialty ----
  { slug: 'westerndigital', name: 'Western Digital', website: 'https://www.westerndigital.com', sector: 'Storage', headquarters: 'San Jose, CA',
    description: 'HDD and flash storage; spinning off flash (Sandisk).',
    ...wd('westerndigital.wd1.myworkdayjobs.com', 'westerndigital', 'External') },
  { slug: 'seagate', name: 'Seagate', website: 'https://www.seagate.com', sector: 'Storage', headquarters: 'Dublin, Ireland',
    description: 'HDD storage, hyperscaler-grade drives, enterprise data services.',
    ...wd('seagate.wd5.myworkdayjobs.com', 'seagate', 'Seagate_Careers') },
  { slug: 'wolfspeed', name: 'Wolfspeed', website: 'https://www.wolfspeed.com', sector: 'SiC Semiconductors', headquarters: 'Durham, NC',
    description: 'Silicon-carbide power semiconductors (EV traction, industrial power).',
    ...customAts('careers.wolfspeed.com — custom system, TBD') },
  { slug: 'lattice', name: 'Lattice Semiconductor', website: 'https://www.latticesemi.com', sector: 'FPGA', headquarters: 'Hillsboro, OR',
    description: 'Low-power FPGAs for edge, communications, industrial.',
    ...wd('lattice.wd5.myworkdayjobs.com', 'lattice', 'External') },
  { slug: 'maxlinear', name: 'MaxLinear', website: 'https://www.maxlinear.com', sector: 'Comms ICs', headquarters: 'Carlsbad, CA',
    description: 'Communications integrated circuits, networking infrastructure silicon.',
    ...customAts('careers.maxlinear.com — custom system, TBD') },
  { slug: 'coherent', name: 'Coherent', website: 'https://www.coherent.com', sector: 'Photonics / Lasers', headquarters: 'Saxonburg, PA',
    description: 'Photonics, lasers, optical components for datacom / AI / industrial.',
    ...wd('coherent.wd5.myworkdayjobs.com', 'coherent', 'External') },

  // ---- AI Labs (anthropic stays from existing seed; add Cohere + OpenAI) ----
  { slug: 'cohere', name: 'Cohere', website: 'https://cohere.com', sector: 'AI / Foundation Models', headquarters: 'Toronto, Canada',
    description: 'Foundation-model lab focused on enterprise deployment, RAG, and custom fine-tunes.',
    ...lev('cohere') },
  { slug: 'openai', name: 'OpenAI', website: 'https://openai.com', sector: 'AI / Foundation Models', headquarters: 'San Francisco, CA',
    description: 'Foundation model lab building GPT family and ChatGPT product. Microsoft strategic partner.',
    ...gh('openai') },
];

let written = 0;
for (const c of ROSTER) {
  fs.writeFileSync(path.join(OUT, c.slug + '.json'), JSON.stringify(c, null, 2) + '\n');
  written++;
}
console.log(`wrote ${written} company configs to ${OUT}`);
