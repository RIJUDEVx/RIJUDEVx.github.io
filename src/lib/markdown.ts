import type { CollectionEntry } from 'astro:content';
import { profile, links, education, experience, questions, statusLabel, stackIcons } from '../data/site';

type Work = CollectionEntry<'work'>;

const link = (label: string) => links.find((l) => l.label === label)!.href;

export function sortWork(entries: Work[]): Work[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

// Markdown for the home page. Built from site.ts and the work collection.
export function homeMarkdown(origin: string, work: Work[]): string {
  const L: string[] = [];
  const add = (...lines: string[]) => L.push(...lines, '');

  add(`# ${profile.name}`);
  add(`> ${profile.title} at ${profile.company.name}. ${profile.tagline}`);
  add(
    `**Role:** ${profile.title} at ${profile.company.name}. Backend-focused full stack engineer. Leads the Selegic CRM team.`,
    `**Location:** Kolkata, India. Open to on-site, hybrid or remote. Looking for Senior or Lead Full Stack or Backend roles in Kolkata or Bengaluru.`,
    `**Email:** ${profile.email}`,
    `**Links:** [GitHub](${link('GitHub')}) · [LinkedIn](${link('LinkedIn')}) · [X](${link('X')}) · [Resume (PDF)](${origin}/resume.pdf)`,
  );

  add('## Before you hire me');
  for (const { q, a } of questions) add(`### ${q}`, a);

  add('## Experience');
  add(`### ${experience.role}, ${experience.company} (${experience.dates})`);
  add(experience.tldr);
  add(...experience.long.map((l) => `- **${l.when}:** ${l.text}`));

  add('## Projects');
  for (const w of sortWork(work)) {
    const d = w.data;
    add(
      `### [${d.title}](${origin}/work/${w.id})`,
      `**Status:** ${statusLabel[d.status].text} · **Role:** ${d.role} · **When:** ${d.years}`,
      d.summary,
      `Case study (markdown): ${origin}/work/${w.id}.md`,
    );
  }

  add('## Education');
  add(`### ${education.school}`, `${education.degree} · CGPA ${education.cgpa} · ${education.years}`);

  add('## Skills');
  add(stackIcons.map((s) => s.label).join(', '));

  add('## Contact');
  add(
    `- Email: ${profile.email}`,
    `- GitHub: ${link('GitHub')}`,
    `- LinkedIn: ${link('LinkedIn')}`,
    `- X: ${link('X')}`,
  );

  return L.join('\n').trimEnd() + '\n';
}

// Markdown for one case study. Frontmatter-free; the body is the entry's raw markdown.
export function workMarkdown(origin: string, entry: Work): string {
  const d = entry.data;
  const L: string[] = [];
  const add = (...lines: string[]) => L.push(...lines, '');

  add(`# ${d.title}`);
  add(`**Status:** ${statusLabel[d.status].text} · **Role:** ${d.role} · **When:** ${d.years}`);
  add(`**Stack:** ${d.stack.join(', ')}`);
  if (d.live) add(`**Live site:** ${d.live}`);
  add(`By [${profile.name}](${origin}/)`);
  add(d.summary);
  if (d.stats.length) add(...d.stats.map((s) => `- **${s.value}** ${s.label}`));
  add((entry.body ?? '').trim());

  return L.join('\n').trimEnd() + '\n';
}
