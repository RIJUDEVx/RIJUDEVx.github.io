// Every fact on the site comes from ../../../profile/career-facts.md.
// Don't add claims here that aren't in that file.

export const profile = {
  name: 'Riju Dev Purkayastha',
  handle: 'RIJUDEVx',
  short: 'Riju',
  monogram: 'rd.',
  title: 'Senior Software Engineer',
  tagline: 'I build the backend that products run on, and lead the team that ships it.',
  company: { name: 'Selegic India', url: 'https://selegic.com' },
  city: 'Kolkata, India',
  timezone: 'Asia/Kolkata',
  email: 'rijudev12@gmail.com',
  availability: 'Open to team lead roles',
  workModes: 'Kolkata or Bengaluru · on-site, hybrid or remote',
};

export type Link = { label: string; href: string; icon: string; brand?: string };
export const links: Link[] = [
  { label: 'GitHub', href: 'https://github.com/RIJUDEVx', icon: 'github', brand: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rijudevpurkayastha', icon: 'linkedin', brand: 'linkedin' },
  { label: 'X', href: 'https://x.com/RIJUDEVx', icon: 'x', brand: 'x' },
  { label: 'Resume', href: '/resume.pdf', icon: 'file' },
];

export const education = {
  school: 'Maulana Abul Kalam Azad University of Technology',
  degree: 'B.Tech, Computer Science',
  years: '2018 – 2022',
  cgpa: '8.45',
};

// Icons are thesvg.org brand logos in src/assets/brands/.
export const stackIcons = [
  { label: 'TypeScript', icon: 'typescript' },
  { label: 'Node.js', icon: 'nodedotjs' },
  { label: 'Hono', icon: 'hono' },
  { label: 'PostgreSQL', icon: 'postgresql' },
  { label: 'Neon', icon: 'neon' },
  { label: 'Cloudflare Workers', icon: 'cloudflare-workers' },
  { label: 'Prisma', icon: 'prisma' },
  { label: 'React', icon: 'react' },
  { label: 'TanStack', icon: 'tanstack' },
  { label: 'Docker', icon: 'docker' },
  { label: 'GitHub Actions', icon: 'github-actions' },
  { label: 'Swift', icon: 'swift' },
  { label: 'Salesforce', icon: 'salesforce' },
];

// "Before you hire me" chips. Only questions with confirmed answers.
export const questions = [
  {
    q: 'What do you actually lead?',
    a: 'The Selegic CRM team. I set the architecture and priorities, break work into deliverables, review code and mentor the engineers on it.',
  },
  {
    q: 'Why backend?',
    a: 'I like the parts users never see but always feel: access control, data that stays correct, releases that don’t break. I still build the frontend when it’s needed.',
  },
  {
    q: 'What have you shipped?',
    a: 'Selegic CRM, which I took to v1.0.0 on my own in five months and is now in pilot with industry users; Migrata, on Salesforce AppExchange; and the time-tracking platform Selegic runs on.',
  },
  {
    q: 'Where can you work?',
    a: 'Kolkata or Bengaluru. On-site, hybrid or remote all work for me.',
  },
  {
    q: 'Can you still write code?',
    a: 'Yes, most days. I wrote 323 of the 483 commits in Selegic CRM’s current codebase.',
  },
];

export type Status = 'pilot' | 'released' | 'withdrawn' | 'appexchange';
export const statusLabel: Record<Status, { text: string; tone: 'ok' | 'pilot' | 'past' }> = {
  pilot: { text: 'In pilot', tone: 'pilot' },
  released: { text: 'Released', tone: 'ok' },
  appexchange: { text: 'On AppExchange', tone: 'ok' },
  withdrawn: { text: 'Released, later withdrawn', tone: 'past' },
};

// Inline mentions in the About paragraph that open a preview card.
export const previews = {
  crm: { title: 'Selegic CRM', line: 'Multi-tenant CRM platform. Designed it, built v1 alone, now lead the team.', href: '/work/selegic-crm', status: 'pilot' as Status },
  migrata: { title: 'Migrata', line: 'Automated multi-org Salesforce data migration that replaced manual CPQ deployments.', href: '/work/migrata', status: 'appexchange' as Status },
  internal: { title: 'Selegic Internal', line: 'The company’s time-tracking and project platform, built end to end.', href: '/work/selegic-internal', status: 'released' as Status },
};

export const experience = {
  company: 'Selegic India',
  role: 'Senior Software Engineer',
  dates: 'Jan 2022 – Present',
  tldr: 'Lead the engineering team behind Selegic CRM, a platform I designed and took to its first release on my own in five months. Also built Migrata, now on Salesforce AppExchange, and the company’s time-tracking platform.',
  long: [
    'Lead the Selegic CRM team: set architecture and priorities, break work into deliverables, review code and mentor engineers.',
    'Set up how the team ships: one shared codebase, a preview of every change, automated tests that gate each release, and staged rollouts. 236 changes shipped this way since Jul 2026.',
    'Made new customer workspaces ready about 3× faster with a pool of pre-warmed tenant schemas.',
    'Opened the CRM to outside developers with a public extension SDK and CLI.',
    'Gave every engineer an isolated environment per branch, with its own ports and database, so the team works in parallel without clashes.',
    'Before the CRM: native iOS apps (top contributor on AttentaFit) and Salesforce tools in Angular and Node.js.',
  ],
};

export const stack = ['TypeScript', 'Node.js', 'Hono', 'PostgreSQL', 'Cloudflare Workers', 'React', 'TanStack', 'Prisma', 'Docker', 'GitHub Actions', 'Swift', 'Salesforce'];
