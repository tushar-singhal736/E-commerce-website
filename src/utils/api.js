const DEFAULT_API_PORT = 5005;
const isDev = process.env.NODE_ENV === 'development';

const cleanUrl = (url) => String(url || '').replace(/\/+$/, '');

const getRuntimeApiUrl = () => {
  if (typeof window === 'undefined') {
    return cleanUrl(process.env.REACT_APP_API_URL || `http://localhost:${DEFAULT_API_PORT}`);
  }
  return cleanUrl(window.location.origin);
};

// Dev: CRA proxy forwards /api/* (same-origin, no CORS). Prod: talk to API on same host unless REACT_APP_API_URL is set.
const API_BASE_URL = isDev ? '' : cleanUrl(process.env.REACT_APP_API_URL || '');
const API_FALLBACK_URL = getRuntimeApiUrl();

const formatNetworkError = () => (
  isDev
    ? 'Backend server nahi chal raha. Terminal mein "cd backend" phir "npm start" run karein.'
    : 'Server se connect nahi ho pa raha. Kuch der baad dubara try karein.'
);

const isNetworkFailure = (error) => (
  error instanceof TypeError
  || error?.message === 'Failed to fetch'
  || error?.message?.includes('NetworkError')
);

const formatHttpError = (res, json) => {
  if (json?.error) return json.error;
  if (json?.message) return json.message;
  if (res.status === 401) return 'Invalid email or password.';
  if (res.status === 429) return 'Bahut saari requests ho gayi. Thodi der baad try karein.';
  if (res.status >= 500) return 'Server error. Backend restart karein (cd backend && npm start).';
  return `Request failed (${res.status}). Dubara try karein.`;
};

export const parseApiResponse = async (res) => {
  const contentType = String(res.headers.get('content-type') || '');
  const isJson = contentType.includes('application/json');
  const json = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    const errorMessage = formatHttpError(res, json);
    const error = new Error(errorMessage);
    error.info = json;
    error.status = res.status;
    throw error;
  }

  if (!isJson) {
    throw new Error('Server ne galat response bheja. Backend check karein.');
  }

  return json.data ?? json;
};

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token') || null;
};

export const getAdminHeaders = (extra = {}) => {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getStoredAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const apiFetch = async (pathOrUrl, options = {}) => {
  const raw = String(pathOrUrl || '');
  const isAbsolute = /^https?:\/\//i.test(raw);
  const url = isAbsolute ? raw : `${API_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
  const token = getStoredAuthToken();
  const headers = { ...options.headers };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fetchOptions = { ...options, headers };

  try {
    return await fetch(url, fetchOptions);
  } catch (primaryError) {
    if (!isDev && API_FALLBACK_URL && API_FALLBACK_URL !== API_BASE_URL) {
      try {
        const fallbackPath = isAbsolute
          ? new URL(raw).pathname + new URL(raw).search
          : raw;
        const fallbackUrl = `${API_FALLBACK_URL}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
        return await fetch(fallbackUrl, fetchOptions);
      } catch {
        // fall through
      }
    }

    if (isNetworkFailure(primaryError)) {
      throw new Error(formatNetworkError());
    }
    throw primaryError;
  }
};

export default API_BASE_URL;
