import { webpageTemplate }     from './templates/webpage.js';
import { marketplaceTemplate } from './templates/marketplace.js';
import { messageTemplate }     from './templates/message.js';
import { phoneTemplate }       from './templates/phone.js';

const MARKETPLACE_PLATFORMS = new Set(['olx', 'ebay', 'facebook']);

export function classifyAndGetTemplate(contentType, platform = 'unknown') {
  if (contentType === 'phone') {
    return phoneTemplate;
  }

  if (
    contentType === 'marketplace' ||
    (contentType === 'page' && MARKETPLACE_PLATFORMS.has(platform))
  ) {
    return marketplaceTemplate;
  }

  if (
    contentType === 'email' ||
    contentType === 'message' ||
    platform === 'gmail' ||
    platform === 'whatsapp'
  ) {
    return messageTemplate;
  }

  return webpageTemplate;
}