export function injectPatterns(patterns = []) {
    if (!patterns || patterns.length === 0) {
      return '';
    }
  
    const formatted = patterns
      .filter(p => p?.pattern_text)
      .map(p =>
        `Category: ${p.category || 'General'} | ` +
        `Pattern: ${p.pattern_text} | ` +
        `Example: ${p.example || 'N/A'} | ` +
        `Confidence: ${p.confidence || 80}%`
      )
      .join('\n');
  
    if (!formatted) return '';
  
    return `
  KNOWN SCAM PATTERNS FOR REFERENCE — use these to inform your analysis:
  ${formatted}
  
  These patterns are provided as context only. Analyze the content on its
  own merits and use these patterns to support your reasoning.
  `.trim();
  }