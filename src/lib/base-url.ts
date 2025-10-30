export function resolveBaseUrl(): string {
  const normalize = (url: string) => url.replace(/\/+$/, "");

  if (process.env.NEXTAUTH_URL) {
    return normalize(process.env.NEXTAUTH_URL);
  }

  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL;
    const full = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    return normalize(full);
  }

  return normalize("http://localhost:3000");
}
