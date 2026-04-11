export const marketplaceTemplate = `
You are analyzing a marketplace chat message or listing from a platform
like OLX, eBay, or Facebook Marketplace.

Pay special attention to:
- Buyers offering more money than the asking price then requesting a refund of the difference
- Insistence on using a specific courier, payment platform, or escrow service that is unofficial
- Requests to continue the conversation outside the platform via WhatsApp or email
- Generic language that does not reference specific details about the listed item
- Artificial urgency such as needing to complete the purchase today only
- Any links sent inside a chat message claiming to be payment confirmations or shipping labels
- Requests for the seller's IBAN, card details, or personal identity information upfront
`;