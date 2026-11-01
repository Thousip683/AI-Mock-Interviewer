import { randomBytes } from 'node:crypto';

// Single-process session ownership. See README for multi-instance deployment.
const tickets = new Map();
const busy = new Set();
export const isLiveBusy = (id) => busy.has(String(id));
export function reserveLive(id) {
  const key = String(id);
  if (busy.has(key)) throw Object.assign(new Error('This interview already has an active voice session or feedback request'), { status: 409 });
  busy.add(key);
  return () => busy.delete(key);
}
export function issueLiveTicket(userId, interviewId, now = Date.now()) {
  for (const [key, entry] of tickets) {
    if (entry.expiresAt <= now || entry.userId === userId) tickets.delete(key);
  }
  if (tickets.size >= 10000) throw Object.assign(new Error('Voice sessions are busy. Please try again.'), { status: 503 });
  const ticket = randomBytes(32).toString('base64url');
  tickets.set(ticket, { userId, interviewId, expiresAt: now + 60000 });
  return ticket;
}
export function consumeLiveTicket(ticket, now = Date.now()) {
  const entry = tickets.get(ticket);
  tickets.delete(ticket);
  return entry && entry.expiresAt > now ? entry : null;
}
