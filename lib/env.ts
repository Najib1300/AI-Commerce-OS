export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

interface PublicEnvironment { [key: string]: string | undefined }

export function getSupabasePublicConfig(environment: PublicEnvironment = process.env) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new ConfigurationError("Supabase public URL and anonymous key must be configured.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  }

  if (!parsedUrl.hostname.endsWith(".supabase.co") && parsedUrl.hostname !== "localhost") {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_URL must point to a Supabase project API URL.");
  }

  return { url: parsedUrl.toString().replace(/\/$/, ""), anonKey };
}
