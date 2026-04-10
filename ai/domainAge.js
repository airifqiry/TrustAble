export async function getDomainAge(domain) {
  const API_KEY = process.env.DOMAIN_AGE_API_KEY;

  if (!API_KEY || !domain) {
    return null;
  }
  // To add a real API later:
  // 1. add DOMAIN_AGE_API_KEY to .env
  // 2. uncomment the fetch logic below
  // 3. return the age in days

  // const response = await fetch(
  //   `https://api.whoisxmlapi.com/v1?domain=${encodeURIComponent(domain)}&apiKey=${API_KEY}`
  // );
  // const data = await response.json();
  // return data.domainAge?.days ?? null;

  return null;
}
