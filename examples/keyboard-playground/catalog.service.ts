import { Injectable } from '@nestjs/common';

import type { CatalogItem } from './catalog.types';

/**
 * The demo dataset for the linked picker: a handful of categories, each with
 * enough tags to make both lists paginate. Stands in for whatever a real bot
 * would pull from a database or an API.
 */
@Injectable()
export class CatalogService {
  private static readonly TAGS: Record<string, CatalogItem[]> = {
    frontend: CatalogService.items(
      'React',
      'Vue',
      'Svelte',
      'Angular',
      'Solid',
      'Qwik',
      'Astro',
      'Remix',
      'Next.js',
      'Nuxt',
    ),
    backend: CatalogService.items(
      'NestJS',
      'Express',
      'Fastify',
      'Koa',
      'Hapi',
      'AdonisJS',
      'tRPC',
      'GraphQL',
      'Prisma',
      'TypeORM',
    ),
    devops: CatalogService.items(
      'Docker',
      'Kubernetes',
      'Terraform',
      'Ansible',
      'Helm',
      'ArgoCD',
      'Pulumi',
      'Vault',
      'Consul',
      'Nomad',
    ),
    mobile: CatalogService.items(
      'Swift',
      'Kotlin',
      'Flutter',
      'React Native',
      'Expo',
      'Ionic',
      'SwiftUI',
      'Compose',
      'Capacitor',
      'NativeScript',
    ),
    data: CatalogService.items(
      'Postgres',
      'MySQL',
      'MongoDB',
      'Redis',
      'Kafka',
      'Spark',
      'Airflow',
      'DuckDB',
      'ClickHouse',
      'Snowflake',
    ),
    design: CatalogService.items(
      'Figma',
      'Sketch',
      'Framer',
      'Penpot',
      'Tailwind',
      'Radix',
      'ShadCN',
      'Chakra',
      'MUI',
      'Mantine',
    ),
    security: CatalogService.items(
      'OAuth',
      'JWT',
      'OWASP',
      'Snyk',
      'mTLS',
      'SAST',
      'DAST',
      'Burp',
      'ZAP',
      'Trivy',
    ),
    cloud: CatalogService.items(
      'AWS',
      'GCP',
      'Azure',
      'Vercel',
      'Netlify',
      'Fly.io',
      'Railway',
      'Render',
      'Cloudflare',
      'DigitalOcean',
    ),
    testing: CatalogService.items(
      'Jest',
      'Vitest',
      'Playwright',
      'Cypress',
      'Mocha',
      'Jasmine',
      'Testing Library',
      'Supertest',
      'k6',
      'Pact',
    ),
  };

  private static readonly CATEGORIES: CatalogItem[] = CatalogService.items(
    'Frontend',
    'Backend',
    'DevOps',
    'Mobile',
    'Data',
    'Design',
    'Security',
    'Cloud',
    'Testing',
  );

  /** Every category — the radio group's options. */
  categories(): CatalogItem[] {
    return CatalogService.CATEGORIES;
  }

  /** The tags under one category id (empty if none chosen yet). */
  byCategory(id: string | undefined): CatalogItem[] {
    return id ? CatalogService.TAGS[id] ?? [] : [];
  }

  /** Build items from labels, slugifying each label into a stable id. */
  private static items(...labels: string[]): CatalogItem[] {
    return labels.map((label) => ({
      id: label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      label,
    }));
  }
}
