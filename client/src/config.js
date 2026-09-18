const isProd = import.meta.env.PROD
const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'TechTactics Portal',
  backendApiBaseUrl:
    import.meta.env.VITE_BACKEND_API_BASE_URL || (isProd ? '' : 'http://localhost:4000/api'),
  zoho: {
    redirectUri:
      import.meta.env.VITE_ZOHO_REDIRECT_URI || `${browserOrigin}${isProd ? '/#/login' : '/login'}`,
  },
}
