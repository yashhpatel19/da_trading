export { default } from 'next-auth/middleware'

export const config = {
  // Protect all routes except login and API auth
  matcher: ['/dashboard', '/deals/:path*', '/parties/:path*', '/payments/:path*', '/reports', '/risk'],
}
