export const WEBHOOK_URL =
  (import.meta.env.VITE_WEBHOOK_URL as string) ||
  `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/whatsapp-webhook`;

export const SUPPORTED_UPLOAD_TYPES =
  'image/jpeg,image/png,image/gif,video/mp4,application/pdf,audio/mpeg,audio/ogg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const FILTERS = ['all', 'unread', 'active', 'archived'] as const;
export type FilterKey = (typeof FILTERS)[number];

export const TEMPLATE_CATEGORIES = ['marketing', 'utility', 'authentication'] as const;
