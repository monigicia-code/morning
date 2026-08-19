declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_IDENTITY_VERIFICATION_PROVIDER?: string;
      EXPO_PUBLIC_IDENTITY_VERIFICATION_API_KEY?: string;
      EXPO_PUBLIC_AI_MODERATION_API_KEY?: string;
    }
  }
}

export {};
