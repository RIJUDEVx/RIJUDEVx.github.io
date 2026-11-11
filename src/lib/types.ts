import type { Status } from '../data/site';

export interface Stat {
  value: string;
  label: string;
}

export interface WorkMeta {
  slug: string;
  title: string;
  summary: string;
  status: Status;
  role: string;
  years: string;
  live?: string;
  stack: string[];
  stats: Stat[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface VideoMeta {
  url: string;
  type: string;
  width: number;
  height: number;
}
