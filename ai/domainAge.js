let dnsBootstrapCache = null;

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
  if (dnsBootstrapCache) {
    return dnsBootstrapCache;
  }

  const response = await fetch('https://data.iana.org/rdap/dns.json', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load IANA RDAP bootstrap: ${response.status}`);
  }

  dnsBootstrapCache = await response.json();
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

    const response = await fetch(rdapUrl, {
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