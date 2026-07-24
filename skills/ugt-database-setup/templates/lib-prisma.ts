// lib/prisma.ts — Prisma singleton for SQL Server via @prisma/adapter-mssql.
// Deps: @prisma/client, @prisma/adapter-mssql (mssql is a transitive dep — type-only import below).
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import type sql from 'mssql'; // type-only — NEVER a value import (breaks TS)
import { env } from '@/lib/env';

const connectionString = env.DATABASE_URL ?? '';

// Parse Prisma SQL Server URL → mssql config
// Format: sqlserver://HOST:PORT;database=DB;user=USER;password=PASS;encrypt=true;trustServerCertificate=true
function parseSqlServerUrl(url: string): sql.config {
  if (!url) return {} as sql.config; // build guard — no DB connection is made during a production build
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const [hostPort, ...params] = withoutScheme.split(';');
  const [server, portStr] = hostPort.split(':');
  const pairs = Object.fromEntries(
    params.map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx).toLowerCase(), p.slice(idx + 1)];
    })
  );
  return {
    server,
    port: portStr ? Number.parseInt(portStr, 10) : 1433,
    database: pairs['database'],
    user: pairs['user'],
    password: pairs['password'],
    options: {
      encrypt: pairs['encrypt'] === 'true',
      trustServerCertificate: pairs['trustservercertificate'] === 'true',
    },
    // Allow long-running stored procedures (EXEC usp_*) up to 5 minutes.
    // Remove or lower if the project never calls SPs (mssql default is 15s).
    requestTimeout: 5 * 60 * 1000,
  };
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const config = parseSqlServerUrl(connectionString);
  const adapter = new PrismaMssql(config);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
