let dnsBootstrapCache = null;
let dnsBootstrapCacheTime = 0;
const BOOTSTRAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function normalizeDomain(domain = '') {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

function getTld(domain = '') {
  const parts = domain.split('.').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  return parts[parts.length - 1];
}

async function getDnsBootstrap() {
  if (dnsBootstrapCache && Date.now() - dnsBootstrapCacheTime < BOOTSTRAP_CACHE_TTL_MS) {
    return dnsBootstrapCache;
  }

  const response = await fetchWithTimeout('https://data.iana.org/rdap/dns.json', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load IANA RDAP bootstrap: ${response.status}`);
  }

  dnsBootstrapCache = await response.json();
  dnsBootstrapCacheTime = Date.now();
  return dnsBootstrapCache;
}

function getRdapBaseUrl(bootstrapData, tld) {
  if (!bootstrapData?.services || !tld) {
    return null;
  }

  for (const service of bootstrapData.services) {
    const [tlds, baseUrls] = service;

    if (Array.isArray(tlds) && tlds.includes(tld) && Array.isArray(baseUrls) && baseUrls.length > 0) {
      return baseUrls[0].replace(/\/+$/, '');
    }
  }

  return null;
}

function extractRegistrationDate(rdapData) {
  const events = Array.isArray(rdapData?.events) ? rdapData.events : [];

  const registrationEvent = events.find((event) => {
    return event?.eventAction === 'registration' && event?.eventDate;
  });

  if (!registrationEvent) {
    return null;
  }

  return registrationEvent.eventDate;
}

export async function getDomainAge(domain) {
  if (!domain) {
    return null;
  }

  try {
    const normalizedDomain = normalizeDomain(domain);
    const tld = getTld(normalizedDomain);

    if (!normalizedDomain || !tld) {
      return null;
    }

    const bootstrapData = await getDnsBootstrap();
    const rdapBaseUrl = getRdapBaseUrl(bootstrapData, tld);

    if (!rdapBaseUrl) {
      return null;
    }

    const rdapUrl = `${rdapBaseUrl}/domain/${encodeURIComponent(normalizedDomain)}`;

    const response = await fetchWithTimeout(rdapUrl, {
      headers: {
        Accept: 'application/rdap+json, application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const rdapData = await response.json();
    const registrationDate = extractRegistrationDate(rdapData);

    if (!registrationDate) {
      return null;
    }

    const registrationTime = new Date(registrationDate).getTime();

    if (Number.isNaN(registrationTime)) {
      return null;
    }

    const ageDays = Math.floor((Date.now() - registrationTime) / (1000 * 60 * 60 * 24));

    return ageDays >= 0 ? ageDays : null;
  } catch {
    return null;
  }
}