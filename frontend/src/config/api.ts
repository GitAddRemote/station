const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const deriveApiUrlFromHostname = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  switch (window.location.hostname) {
    case 'station.drdnt.org':
      return 'https://api.drdnt.org';
    case 'staging.station.drdnt.org':
      return 'https://staging.api.drdnt.org';
    case 'localhost':
    case '127.0.0.1':
      return 'http://localhost:3001';
    default:
      return '';
  }
};

export const API_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || deriveApiUrlFromHostname(),
);
