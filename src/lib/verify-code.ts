/**
 * The "put this code in your LeetCode About me" proof.
 *
 * The code is stored only as a hash. To check it we pull every CPCLUB-XXXXXX
 * token out of the About me text, hash each one, and compare. We never search
 * by code (it sits in a public profile) and never reveal it again.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** No 0/O, 1/I/L: people retype these. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Case-insensitive on purpose: people retype or paste in lower case.
const CODE_IN_TEXT = /CPCLUB-[A-Za-z0-9]{6}/gi;

export function makeCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `CPCLUB-${s}`;
}

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

/** A random, unguessable token for cookies, challenge ids and claims. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function aboutMeHasCode(aboutMe: string, codeHash: string): boolean {
  const want = Buffer.from(codeHash, 'hex');
  for (const match of aboutMe.match(CODE_IN_TEXT) ?? []) {
    const got = Buffer.from(hashToken(match.toUpperCase()), 'hex');
    if (got.length === want.length && timingSafeEqual(got, want)) return true;
  }
  return false;
}
