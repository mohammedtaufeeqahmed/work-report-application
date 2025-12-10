import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://developmentTeam:%40Shravan%40H00@172.31.7.209:5432/workreport',
  },
  verbose: true,
  strict: true,
});

