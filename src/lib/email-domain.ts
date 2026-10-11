// Checks for the part of an email address after "@": format, likely typos of
// common providers, and (via /api/email-domain) whether it can receive mail.
// Pure functions only, shared by the browser, the route handler and tests.

/** Domains people commonly use here. Known to receive mail, so no DNS lookup is needed. */
export const COMMON_DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "nate.com",
  "icloud.com",
  "me.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "proton.me",
  "ajou.ac.kr",
] as const;

const COMMON = new Set<string>(COMMON_DOMAINS);

// Frequent top-level-domain slips, e.g. naver.con → naver.com.
const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cmo: "com",
  ocm: "com",
  comm: "com",
  vom: "com",
  xom: "com",
  nte: "net",
  ent: "net",
  met: "net",
};

/** The domain part of an email, lowercased and converted to ASCII (punycode). */
export function emailDomain(email: string): string {
  const at = email.trim().lastIndexOf("@");
  if (at < 0) return "";
  return toAsciiDomain(email.trim().slice(at + 1));
}

/** Lowercases and converts international domains (e.g. 한글.com) to punycode. */
export function toAsciiDomain(domain: string | null | undefined): string {
  const value = (domain ?? "").trim().toLowerCase();
  if (!value || /[\s/?#@:\\]/.test(value)) return value;
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return value;
  }
}

/**
 * Domain name rules: 2+ labels, each 1–63 letters/digits/hyphens without a
 * leading or trailing hyphen, at most 253 characters, and a top-level domain
 * of 2+ letters (or punycode). IP addresses are not accepted.
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  const label = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
  if (!labels.every((l) => label.test(l))) return false;
  const tld = labels[labels.length - 1];
  return /^[a-z]{2,63}$/.test(tld) || /^xn--[a-z0-9-]{2,59}$/.test(tld);
}

export function isCommonDomain(domain: string): boolean {
  return COMMON.has(domain);
}

/** Optimal string alignment distance (Levenshtein + adjacent swaps). */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Suggests a correction when the domain looks like a typo of a common one
 * (gmial.com → gmail.com, naver.con → naver.com). Returns null when it is
 * already a common domain or nothing is close enough.
 */
export function suggestDomain(domain: string): string | null {
  if (!domain || isCommonDomain(domain)) return null;

  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  const fixedTld = TLD_TYPOS[tld];
  if (fixedTld && labels.length > 1) {
    const fixed = [...labels.slice(0, -1), fixedTld].join(".");
    if (isCommonDomain(fixed)) return fixed;
  }

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  // Short domains need a closer match so that real domains (e.g. ne.com vs
  // me.com) aren't "corrected".
  const limit = domain.length <= 6 ? 0 : domain.length <= 9 ? 1 : 2;
  if (fixedTld && best && bestDistance <= limit) return best;
  return best && bestDistance > 0 && bestDistance <= limit ? best : null;
}

/** The email with its domain replaced, keeping the part before "@" as typed. */
export function withDomain(email: string, domain: string): string {
  const trimmed = email.trim();
  return `${trimmed.slice(0, trimmed.lastIndexOf("@") + 1)}${domain}`;
}

// ---------------------------------------------------------------------------
// Mail server lookup (used by the route handler with Node's DNS resolver)
// ---------------------------------------------------------------------------

export interface MailDnsResolver {
  resolveMx(domain: string): Promise<{ exchange: string; priority: number }[]>;
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
}

/** true: can receive mail, false: cannot, null: unknown (lookup failed — do not block). */
export type Deliverability = boolean | null;

const NO_RECORD = new Set(["ENODATA", "ENOTFOUND", "ENONAME", "NXDOMAIN"]);

function code(error: unknown): string {
  return (error as { code?: string })?.code ?? "";
}

/**
 * Decides whether a domain accepts mail: MX records (RFC 5321), a "null MX"
 * meaning "no mail" (RFC 7505), or — with no MX — an A/AAAA record, which
 * mail servers fall back to. DNS failures other than "no such record" — and
 * "not found" answers from a resolver that can't find gmail.com either —
 * return null so a broken resolver never blocks sign-up.
 */
export async function checkMailDomain(
  domain: string,
  dns: MailDnsResolver,
): Promise<Deliverability> {
  if (!isValidDomain(domain)) return false;
  if (isCommonDomain(domain)) return true;
  const result = await lookupMailDomain(domain, dns);
  if (result !== false) return result;
  // A broken resolver answers "not found" for everything. Only trust "no" if a
  // domain that certainly exists still resolves.
  try {
    return (await dns.resolveMx(RESOLVER_CANARY)).length > 0 ? false : null;
  } catch {
    return null;
  }
}

const RESOLVER_CANARY = "gmail.com";

async function lookupMailDomain(domain: string, dns: MailDnsResolver): Promise<Deliverability> {
  try {
    const mx = await dns.resolveMx(domain);
    const usable = mx.filter((r) => r.exchange && r.exchange !== ".");
    if (usable.length > 0) return true;
    if (mx.length > 0) return false; // null MX: the domain says it takes no mail
  } catch (error) {
    if (!NO_RECORD.has(code(error))) return null;
    if (code(error) === "ENOTFOUND" || code(error) === "NXDOMAIN") return false;
  }
  for (const lookup of [dns.resolve4, dns.resolve6]) {
    try {
      if ((await lookup.call(dns, domain)).length > 0) return true;
    } catch (error) {
      if (!NO_RECORD.has(code(error))) return null;
    }
  }
  return false;
}
