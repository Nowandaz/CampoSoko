// Single source of truth for branding. Change APP_NAME here and it updates everywhere.
export const APP_NAME = "CampoSoko";
export const APP_TAGLINE = "Your Campus. Your Soko.";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
export const RECEIPT_PREFIX = "SC";
export const LISTING_LIFETIME_DAYS = 30;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const DAILY_LISTING_LIMIT = 10;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
