type SourceName = "X" | "Reddit" | "Quora" | "Forum" | string;

function enc(value: string) {
  return encodeURIComponent(value.trim().replace(/\s+/g, " "));
}

export function sourceSearchUrl(source: SourceName, terms: string[]) {
  const uniqueTerms = Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)));
  const query = enc(uniqueTerms.join(" "));
  if (!query) return null;

  switch (source) {
    case "X":
      return `https://x.com/search?q=${query}&src=typed_query&f=live`;
    case "Reddit":
      return `https://www.reddit.com/search/?q=${query}&sort=new`;
    case "Quora":
      return `https://www.quora.com/search?q=${query}`;
    case "Forum":
      return `https://www.drugs.com/search.php?searchterm=${query}`;
    default:
      return `https://www.google.com/search?q=${query}`;
  }
}

export function sourceLabel(source: SourceName) {
  switch (source) {
    case "X":
      return "Open X search";
    case "Reddit":
      return "Open Reddit search";
    case "Quora":
      return "Open Quora search";
    case "Forum":
      return "Open forum search";
    default:
      return "Open source";
  }
}
