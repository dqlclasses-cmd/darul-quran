/**
 * Normalize notification link URLs for in-app React Router navigation.
 * Fixes legacy links that pointed at APP_URL (portal root → dashboard)
 * or bare "/support-tickets" paths that do not match role routes.
 */
export function resolveNotificationUrl(rawUrl, role = "student", notification = null) {
  if (!role) role = "student";

  let path = typeof rawUrl === "string" ? rawUrl.trim() : "";

  try {
    if (path && /^https?:\/\//i.test(path)) {
      const parsed = new URL(path);
      path = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    // keep original
  }

  if (path) {
    path = path.replace(/ROLE/g, role);
  }

  const relatedId = notification?.relatedId ?? notification?.related_id ?? null;
  const type = notification?.type;

  // Bare root / empty → try to recover from type + relatedId (legacy APP_URL links)
  if (!path || path === "/") {
    if (type === "ticket" || type === "support_ticket") {
      if (role === "admin") {
        return relatedId ? `/admin/tickets?ticketId=${relatedId}` : "/admin/tickets";
      }
      return relatedId
        ? `/${role}/support-tickets?ticketId=${relatedId}`
        : `/${role}/support-tickets`;
    }
    if (type === "reschedule_request" || type === "new_reschedule_requests") {
      return relatedId
        ? `/${role}/reschedule-requests?requestId=${relatedId}`
        : `/${role}/reschedule-requests`;
    }
    return null;
  }

  // Legacy support ticket paths
  if (
    path === "/support-tickets" ||
    path.startsWith("/support-tickets?") ||
    path === "/tickets" ||
    path.startsWith("/tickets?")
  ) {
    const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    const withId = !query && relatedId ? `?ticketId=${relatedId}` : query;
    if (role === "admin") return `/admin/tickets${withId}`;
    return `/${role}/support-tickets${withId}`;
  }

  // Ensure admin tickets path
  if (
    role === "admin" &&
    (path === "/admin/support-tickets" || path.startsWith("/admin/support-tickets?"))
  ) {
    return path.replace("/admin/support-tickets", "/admin/tickets");
  }

  return path;
}
