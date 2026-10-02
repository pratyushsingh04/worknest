import { z } from 'zod';
import type { Company } from '@prisma/client';

const tags = (max: number) =>
  z
    .array(z.string().trim().min(2).max(60))
    .max(max)
    .transform((list) => [...new Set(list)]);

/** The public profile a company fills in. Every field is optional on its own; listing needs them all. */
export const profileSchema = z.object({
  tagline: z.string().trim().max(140).nullable(),
  about: z.string().trim().max(3000).nullable(),
  industry: z.string().trim().max(80).nullable(),
  specialities: tags(12),
  offerings: tags(20),
  website: z
    .string()
    .trim()
    .max(200)
    .regex(/^https?:\/\/\S+\.\S+$/i, 'must start with http:// or https://')
    .nullable()
    .or(z.literal('').transform(() => null)),
  city: z.string().trim().max(80).nullable(),
  country: z.string().trim().max(80).nullable(),
  foundedYear: z.number().int().min(1800).max(2100).nullable(),
  sizeRange: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).nullable(),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

type ProfileFields = Pick<Company, 'tagline' | 'about' | 'industry' | 'specialities' | 'offerings' | 'city' | 'country'>;

export const ABOUT_MIN = 80;

/** What is still missing before a company can appear in the client directory. */
export function missingProfileFields(c: ProfileFields): string[] {
  const missing: string[] = [];
  if (!c.tagline || c.tagline.length < 10) missing.push('A one-line tagline');
  if (!c.about || c.about.length < ABOUT_MIN) missing.push(`An "about" of at least ${ABOUT_MIN} characters`);
  if (!c.industry) missing.push('Your industry');
  if (!c.specialities.length) missing.push('At least one speciality');
  if (!c.offerings.length) missing.push('At least one thing clients can hire you for');
  if (!c.city || !c.country) missing.push('Your city and country');
  return missing;
}

export const isProfileComplete = (c: ProfileFields) => missingProfileFields(c).length === 0;

/** The profile fields clients are allowed to read. */
export const publicCompanySelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  about: true,
  industry: true,
  specialities: true,
  offerings: true,
  website: true,
  city: true,
  country: true,
  foundedYear: true,
  sizeRange: true,
  contactEmail: true,
  createdAt: true,
} as const;
