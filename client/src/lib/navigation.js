export function loginDestination(location) {
  const stored = location.state?.from;
  const requested = new URLSearchParams(location.search || (location.hash?.startsWith('#/?') ? location.hash.slice(2) : '')).get('redirect') || (stored ? `${stored.pathname}${stored.search || ''}${stored.hash || ''}` : '');
  return /^\/(?:dashboard|create-interview|interview\/[^/?#]+|feedback(?:\/[^/?#]+)?)(?:[?#].*)?$/.test(requested) ? requested : '/dashboard';
}
