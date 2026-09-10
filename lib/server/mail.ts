import { env } from "./env";

/**
 * Outbound mail.
 *
 * There is no SMTP dependency in the box: `deliver` logs the message and hands
 * the payload back so a dev build can show the link inline. Point it at your
 * provider (Resend / SES / Postmark are all one fetch) and everything above it
 * — magic links, receipts, review notifications — starts sending for real.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  link?: string;
}

export async function deliver(mail: Mail): Promise<{ sent: boolean; preview: Mail }> {
  // TODO(production): POST to your ESP here and return sent:true.
  console.log(`[mail] → ${mail.to}  ${mail.subject}${mail.link ? `\n[mail]   ${mail.link}` : ""}`);
  return { sent: false, preview: mail };
}

export function signInMail(to: string, link: string): Mail {
  return {
    to,
    subject: "Your VESPER sign-in link",
    text: `Tap to sign in. The link works once and expires in ${Math.round(env.emailLinkSeconds / 60)} minutes.\n\n${link}`,
    link,
  };
}
