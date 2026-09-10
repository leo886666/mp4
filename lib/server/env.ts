import path from "node:path";

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}
function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

const dataDir = path.resolve(process.cwd(), str("VESPER_DATA_DIR", "./storage"));

export const env = {
  dataDir,
  dbFile: path.join(dataDir, "vesper.db"),
  mediaDir: path.join(dataDir, "media"),
  uploadDir: path.join(dataDir, "uploads"),

  secret: str("VESPER_SECRET", "vesper-dev-secret-do-not-use-in-production"),
  siteUrl: str("NEXT_PUBLIC_SITE_URL", "http://localhost:3300"),

  storageDriver: str("VESPER_STORAGE_DRIVER", "local") as "local" | "s3",
  cdnBase: str("VESPER_CDN_BASE", ""),
  s3: {
    bucket: str("VESPER_S3_BUCKET", ""),
    region: str("VESPER_S3_REGION", ""),
    endpoint: str("VESPER_S3_ENDPOINT", ""),
    accessKey: str("VESPER_S3_ACCESS_KEY", ""),
    secretKey: str("VESPER_S3_SECRET_KEY", ""),
  },

  ffmpeg: str("VESPER_FFMPEG", "ffmpeg"),
  ffprobe: str("VESPER_FFPROBE", "ffprobe"),
  ladder: str("VESPER_HLS_LADDER", "360,540,720")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter(Boolean),

  /**
   * Passwordless email sign-in.
   *  instant — the address is enough (default: demos, internal builds)
   *  link    — issue a signed 15-minute link and mail it before any session exists
   */
  emailSignin: str("VESPER_EMAIL_SIGNIN", "instant") as "instant" | "link",
  mailFrom: str("VESPER_MAIL_FROM", "VESPER <no-reply@vesper.app>"),

  gateway: str("VESPER_PAYMENT_GATEWAY", "mock"),
  stripe: {
    secretKey: str("STRIPE_SECRET_KEY", ""),
    webhookSecret: str("STRIPE_WEBHOOK_SECRET", ""),
  },

  seed: bool("VESPER_SEED", true),
  seedMedia: bool("VESPER_SEED_MEDIA", true),

  // token lifetimes
  sessionDays: 30,
  playTokenSeconds: 60 * 60 * 4,
  emailLinkSeconds: 60 * 15,
};

export const isProd = process.env.NODE_ENV === "production";
