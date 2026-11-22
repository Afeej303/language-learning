// Select a client IP only from a proxy header explicitly trusted by the operator.
export function clientIp(req, trustedHeader = process.env.TRUSTED_PROXY_HEADER) {
  const direct = req.socket?.remoteAddress || 'unknown';
  if (!trustedHeader) return direct;
  const value = req.headers?.[trustedHeader.toLowerCase()];
  if (typeof value !== 'string' || !value.trim()) return direct;
  return value.split(',')[0].trim() || direct;
}

export function throttleKey(username, ip) {
  return `${String(username).trim().toLowerCase()}\u0000${ip}`;
}
