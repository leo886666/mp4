export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
}

const C = "VESPER Media Ltd.";
const CONTACT = "legal@vesper.app";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    updated: "September 9, 2026",
    intro:
      "These Terms govern your use of VESPER — our apps, website and services. By creating an account or using VESPER you agree to them.",
    sections: [
      {
        h: "1. Eligibility & accounts",
        p: [
          "You must be at least 13 years old (or the digital-age of consent in your country, if higher) to use VESPER.",
          "You are responsible for your account, your credentials and all activity under your account. One person or entity may hold one account.",
        ],
      },
      {
        h: "2. The service",
        p: [
          "VESPER provides short-form vertical drama series. Content availability varies by region and may change without notice.",
          "Free tier: limited episodes per series, with ads. VIP subscription: full catalog, ad-free, subject to these Terms and the Subscription Terms below.",
        ],
      },
      {
        h: "3. Acceptable use",
        p: [
          "Do not copy, scrape, record, resell, redistribute or publicly perform any part of the catalog. Do not circumvent access controls, region checks or payment systems.",
          "Do not upload unlawful, infringing, or harmful content if you use creator features. We may remove content and suspend accounts that violate these rules.",
        ],
      },
      {
        h: "4. Intellectual property",
        p: [
          `The VESPER service, brand and software are owned by ${C} and its licensors. Series, artwork and trailers are owned by their respective creators and studios.`,
          "You receive a limited, non-exclusive, non-transferable, revocable license to access the catalog for personal, non-commercial viewing while your account is in good standing.",
        ],
      },
      {
        h: "5. Disclaimers & liability",
        p: [
          "The service is provided “as is” without warranties of any kind, to the maximum extent permitted by law. We do not guarantee uninterrupted or error-free service.",
          "To the extent permitted by law, our aggregate liability to you is limited to the greater of (a) amounts you paid us in the 12 months before the claim, or (b) USD 100.",
        ],
      },
      {
        h: "6. Termination, changes & law",
        p: [
          `You may stop using VESPER and delete your account at any time. We may suspend or terminate accounts for material breach. Questions: ${CONTACT}.`,
          "These Terms are governed by the laws of the service's operating entity in your region, without regard to conflict-of-law rules. Mandatory consumer protections of your country of residence always apply.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    updated: "September 9, 2026",
    intro:
      "This policy explains what data VESPER collects, why, and the controls you have. We collect the minimum needed to run the service.",
    sections: [
      {
        h: "1. Data we collect",
        p: [
          "Account data: email or provider identifier, display name. Payment data is handled by Apple, Google or our payment processor — we never store full card numbers.",
          "Usage data: watching history, favorites, device model, OS, approximate region (country-level), crash logs. Advertising identifiers are only collected in the free, ad-supported tier.",
        ],
      },
      {
        h: "2. Why we process it",
        p: [
          "To operate your account and sync your library (contract); to recommend series and improve the product (legitimate interest); to serve ads in the free tier (consent, where required); to comply with law.",
          "We do not sell personal data. We share data only with processors that help us run the service (hosting, payments, analytics, customer support) under data-processing agreements.",
        ],
      },
      {
        h: "3. Retention & security",
        p: [
          "Account data is kept while your account is active and up to 90 days after deletion for safety and legal reasons. Watching history is kept until you clear it.",
          "Data is encrypted in transit (TLS) and at rest. Access is limited by role and audited.",
        ],
      },
      {
        h: "4. Your rights",
        p: [
          "Depending on your region (GDPR, UK GDPR, CCPA/CPRA, PDPA and others) you may request access, correction, deletion, portability, restriction, or object to processing, and withdraw consent at any time.",
          `To exercise any right, email ${CONTACT} or use Settings → Privacy. We respond within 30 days. You may also lodge a complaint with your local supervisory authority.`,
        ],
      },
      {
        h: "5. Children & international transfers",
        p: [
          "VESPER is not directed at children under 13, and we do not knowingly collect their data. Parents may contact us to delete a child's account.",
          `Data may be processed in countries other than yours. Where required, transfers rely on adequacy decisions or standard contractual clauses. Contact: ${CONTACT}.`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie & Tracking Policy",
    updated: "September 9, 2026",
    intro:
      "We use a small number of cookies and similar technologies. You can control them below and in your browser.",
    sections: [
      {
        h: "1. What we use",
        p: [
          "Strictly necessary: session and sign-in cookies, playback position, security tokens. These cannot be disabled because the service will not work without them.",
          "Analytics: privacy-friendly, aggregated usage metrics (pages, player events). Optional. Advertising: only in the free tier, where consent is required — used for frequency capping and measurement, not for profiling outside VESPER.",
        ],
      },
      {
        h: "2. Local storage",
        p: [
          "In the web app we use browser local storage for your watch progress, favorites and theme preference on this device. Clearing site data removes them.",
        ],
      },
      {
        h: "3. Managing your choices",
        p: [
          `Change your consent at any time via Settings → Privacy, or the “Cookie preferences” link in the footer. Questions: ${CONTACT}.`,
        ],
      },
    ],
  },
  {
    slug: "subscription",
    title: "Subscription Terms",
    updated: "September 9, 2026",
    intro:
      "These terms apply to VESPER VIP subscriptions in addition to the Terms of Service and the rules of Apple, Google or the payment processor you use.",
    sections: [
      {
        h: "1. Plans & billing",
        p: [
          "VIP plans: Weekly $6.99 · Monthly $19.90 · Quarterly $49.90 (≈ $16.63/mo) · Annual $99.90 (≈ $8.33/mo). Prices include applicable taxes where required; otherwise taxes are added at checkout.",
          "Your plan renews automatically at the end of each period (auto-renewal) unless you cancel at least 24 hours before the renewal date. Renewal is charged to your original payment method.",
        ],
      },
      {
        h: "2. Cancelling",
        p: [
          "Cancel anytime in Settings → Membership, or via your App Store / Google Play / payment-provider subscription settings. Access continues until the end of the paid period. No cancellation fees.",
          "Deleting the app does not cancel the subscription.",
        ],
      },
      {
        h: "3. Refunds",
        p: [
          "Purchases made through Apple or Google are refunded at their discretion — request via Report a Problem in the store. Purchases made by card directly may be refunded within 14 days if less than 10% of the period was used, by contacting support.",
          "Statutory withdrawal rights in your country are not affected by this policy.",
        ],
      },
      {
        h: "4. Free trials & offer changes",
        p: [
          "If a free trial is offered, it converts to a paid plan unless cancelled 24 hours before it ends. One trial per account per offer.",
          "We may change prices with at least 30 days' notice before the next renewal; you may cancel before the change takes effect.",
        ],
      },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright & DMCA",
    updated: "September 9, 2026",
    intro:
      "VESPER respects intellectual property. We respond to valid notices of claimed infringement and repeat infringers lose access.",
    sections: [
      {
        h: "1. Filing a notice (DMCA §512 / equivalent)",
        p: [
          `Send to ${CONTACT} with: (a) identification of the copyrighted work; (b) the URL or in-app location of the infringing material; (c) your contact details; (d) a good-faith statement of unauthorized use; (e) a statement, under penalty of perjury, that the information is accurate and you are authorized to act; (f) your physical or electronic signature.`,
          "Valid notices are actioned within 2 business days; we notify the affected uploader.",
        ],
      },
      {
        h: "2. Counter-notice",
        p: [
          "If your content was removed by mistake or misidentification, you may send a counter-notice with the same formalities. We may restore the content 10–14 business days after forwarding the counter-notice, unless the complainant files a court action.",
        ],
      },
      {
        h: "3. Repeat infringers",
        p: [
          "Accounts that repeatedly upload infringing material are permanently banned, and their payouts may be withheld pending resolution of claims.",
        ],
      },
    ],
  },
  {
    slug: "community",
    title: "Community & Content Guidelines",
    updated: "September 9, 2026",
    intro:
      "What is allowed on VESPER — for series, covers, comments and profiles. Breaking these rules leads to removal and possible account termination.",
    sections: [
      {
        h: "1. Content standards",
        p: [
          "Fictional drama is welcome — including intense themes handled with craft. We do not allow: sexual content involving minors (zero tolerance), non-consensual sexual scenarios presented approvingly, explicit sexual content, instructions for real-world violence, terrorism, self-harm promotion, or illegal trade.",
          "Real people: do not impersonate others; depict identifiable real people only with their consent or in a clearly lawful newsworthy context.",
        ],
      },
      {
        h: "2. Metadata & covers",
        p: [
          "Titles, covers and synopses must not be misleading, sexually explicit, or infringe third-party rights. Clickbait thumbnails with no story relevance are removed.",
        ],
      },
      {
        h: "3. Enforcement",
        p: [
          `Level 1: edit or removal request · Level 2: episode or series removal · Level 3: payout hold or account suspension · Level 4: permanent ban. Appeals: ${CONTACT} within 30 days.`,
          "Report content in-app via the ⋯ menu on any series page. We review reports within 48 hours.",
        ],
      },
    ],
  },
];

export const legalBySlug = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
