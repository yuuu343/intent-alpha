// Static JSON endpoint for /explore/. Astro pre-renders this to
// `dist/explore-data.json` at build time, so the explore page can fetch it
// on demand instead of inlining the full payload (~3MB) into the HTML.
//
// Computes the same dataset as src/pages/explore.astro's initial
// server-side render. Duplicates that computation rather than extracting
// to a shared module — the duplication is small and the dependency-free
// page is easier to reason about.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { THEMES } from '../data/themes';
import fs from 'node:fs';
import path from 'node:path';

export const GET: APIRoute = async () => {
  const allCompanies = (await getCollection('companies'))
    .filter((c) => c.data.aiRelevance !== 'non_ai')
    .sort((a, b) => a.data.name.localeCompare(b.data.name));

  const SNAPSHOTS = path.resolve(process.cwd(), 'data', 'snapshots');
  type ExploreJob = {
    id: string;
    title: string;
    companySlug: string;
    companyName: string;
    dept: string;
    location: string;
    url: string;
    date: string;
  };
  const allJobs: ExploreJob[] = [];
  const companyTotals = new Map<string, number>();

  for (const c of allCompanies) {
    const dir = path.join(SNAPSHOTS, c.id);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    if (!files.length) continue;
    const snap = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
    const jobs = (snap.jobs ?? []) as Array<{ id?: string | number; title?: string; department?: string | null; location?: string | null; url?: string | null; updated_at?: string | null }>;
    companyTotals.set(c.id, jobs.length);
    for (const j of jobs) {
      allJobs.push({
        id: String(j.id ?? ''),
        title: j.title || '',
        companySlug: c.id,
        companyName: c.data.name,
        dept: j.department || '',
        location: j.location || '',
        url: j.url || '',
        date: (j.updated_at || '').slice(0, 10),
      });
    }
  }

  const fetchedCompanies = allCompanies.filter((c) => companyTotals.has(c.id));
  fetchedCompanies.sort((a, b) => (companyTotals.get(b.id) ?? 0) - (companyTotals.get(a.id) ?? 0));

  const body = JSON.stringify({
    jobs: allJobs,
    themes: THEMES.map((t) => ({ slug: t.slug, name: t.name, regex: t.regex.source })),
    companies: fetchedCompanies.map((c) => ({ slug: c.id, name: c.data.name, total: companyTotals.get(c.id) ?? 0 })),
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
