export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Search topic is required." });
  }

  if (query.length > 200) {
    return res.status(400).json({ error: "Search topic is too long." });
  }

  try {
    const encoded = encodeURIComponent(query);

    const [crossrefResponse, pubmedResponse] = await Promise.all([
      fetch(
        `https://api.crossref.org/works?query=${encoded}&rows=15&select=title,author,published,DOI,URL,abstract,container-title`
      ),
      fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=15&retmode=json`
      )
    ]);

    if (!crossrefResponse.ok) {
      throw new Error("Crossref search is temporarily unavailable.");
    }

    const crossrefData = await crossrefResponse.json();
    const items = crossrefData.message?.items || [];

    const papers = items.map((item, index) => ({
      id: item.DOI || `crossref-${index}`,
      title: item.title?.[0] || "Untitled paper",
      authors: (item.author || [])
        .slice(0, 5)
        .map(a => [a.given, a.family].filter(Boolean).join(" ")),
      year: item.published?.["date-parts"]?.[0]?.[0] || "Unknown",
      journal: item["container-title"]?.[0] || "Journal not listed",
      doi: item.DOI || "",
      url: item.URL || "",
      abstract: item.abstract || "",
      source: "Crossref"
    }));

    let pubmedIds = [];

    if (pubmedResponse.ok) {
      const pubmedData = await pubmedResponse.json();
      pubmedIds = pubmedData.esearchresult?.idlist || [];
    }

    return res.status(200).json({
      query,
      papers,
      pubmedIds,
      total: papers.length,
      sources: ["Crossref", "PubMed"]
    });
  } catch (error) {
    return res.status(500).json({
      error: "Research search failed.",
      details: error.message
    });
  }
}
