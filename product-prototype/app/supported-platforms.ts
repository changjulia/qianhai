export const SUPPORTED_PLATFORMS = [
  'Facebook',
  'Instagram',
  'TikTok',
  'LinkedIn',
  'YouTube',
  'WhatsApp',
  'Telegram',
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];
