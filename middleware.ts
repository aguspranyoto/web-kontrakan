export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/((?!login|signup|api/auth|api/signup|api/health|_next|favicon.ico|.*\\..*).*)"],
};
