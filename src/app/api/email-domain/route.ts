import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import {
  checkMailDomain,
  isValidDomain,
  toAsciiDomain,
  type Deliverability,
} from "@/lib/email-domain";

const TIMEOUT_MS = 3000;

/**
 * GET /api/email-domain?domain=example.com → { deliverable: true | false | null }
 *
 * Tells the sign-up form whether a domain can receive mail. It looks up only
 * the domain (never the full address), logs nothing, and answers null when
 * DNS is slow or failing so sign-up is never blocked by the lookup itself.
 */
export async function GET(request: NextRequest) {
  const domain = toAsciiDomain(request.nextUrl.searchParams.get("domain"));
  if (!isValidDomain(domain)) {
    return NextResponse.json({ deliverable: false }, { headers: cache(3600) });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Deliverability>((resolve) => {
    timer = setTimeout(() => resolve(null), TIMEOUT_MS);
  });
  const deliverable = await Promise.race([
    checkMailDomain(domain, { resolveMx, resolve4, resolve6 }),
    timeout,
  ]).finally(() => clearTimeout(timer));

  // Cache definite answers (domains rarely change); retry unknown ones soon.
  return NextResponse.json({ deliverable }, { headers: cache(deliverable === null ? 0 : 3600) });
}

function cache(seconds: number) {
  return {
    "Cache-Control": seconds ? `public, max-age=${seconds}, s-maxage=${seconds * 24}` : "no-store",
  };
}
