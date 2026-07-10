/**
 * Thin, mechanical clients for the free-tier stock-footage providers.
 * Normalizes each provider's response into a common candidate shape so
 * scripts/footage_search_cli.mjs can apply the duration/resolution hard
 * filters identically regardless of source. No judgment here (which
 * candidate is the *right* one) - that's factforge-footage-retrieval's job.
 */
import { getApiKey } from "./env.mjs";

const today = () => new Date().toISOString().slice(0, 10);

/** Pexels Video API: https://www.pexels.com/api/documentation/#videos-search */
export async function searchPexels(query, { perPage = 5 } = {}) {
  const key = await getApiKey("PEXELS_API_KEY");
  if (!key) return { provider: "pexels", available: false, candidates: [] };

  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: key } });
  } catch (err) {
    return { provider: "pexels", available: true, error: err.message, candidates: [] };
  }
  if (!res.ok) return { provider: "pexels", available: true, error: `HTTP ${res.status}`, candidates: [] };

  const data = await res.json();
  const candidates = (data.videos || []).map((v) => {
    const files = [...(v.video_files || [])].sort((a, b) => (b.height || 0) - (a.height || 0));
    const best = files[0] || null;
    return {
      source: "pexels",
      selected_url: best ? best.link : null,
      page_url: v.url,
      native_duration_sec: v.duration ?? null,
      native_resolution: best ? { width: best.width, height: best.height } : null,
      license: "Pexels License",
      license_verified_date: today(),
      attribution_required: false,
      attribution_text: null,
    };
  });
  return { provider: "pexels", available: true, candidates };
}

/** Pixabay Video API: https://pixabay.com/api/docs/#api_search_videos */
export async function searchPixabay(query, { perPage = 5 } = {}) {
  const key = await getApiKey("PIXABAY_API_KEY");
  if (!key) return { provider: "pixabay", available: false, candidates: [] };

  const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=${Math.max(perPage, 3)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    return { provider: "pixabay", available: true, error: err.message, candidates: [] };
  }
  if (!res.ok) return { provider: "pixabay", available: true, error: `HTTP ${res.status}`, candidates: [] };

  const data = await res.json();
  const candidates = (data.hits || []).map((h) => {
    const variants = h.videos || {};
    const best = ["large", "medium", "small", "tiny"].map((k) => variants[k]).find((v) => v && v.url);
    return {
      source: "pixabay",
      selected_url: best ? best.url : null,
      page_url: h.pageURL,
      native_duration_sec: h.duration ?? null,
      native_resolution: best ? { width: best.width, height: best.height } : null,
      license: "Pixabay License",
      license_verified_date: today(),
      attribution_required: false,
      attribution_text: null,
    };
  });
  return { provider: "pixabay", available: true, candidates };
}

/**
 * Coverr API (api.coverr.co). Supplementary only - Coverr's own pages
 * disagree on whether attribution is required for API-sourced content, so
 * every candidate is marked attribution_required: true by default (per the
 * migration plan's confirmed decision). Treated defensively: a failed or
 * unexpected response shape degrades to zero candidates rather than
 * crashing the search, since this provider is never load-bearing.
 */
export async function searchCoverr(query, { perPage = 5 } = {}) {
  const key = await getApiKey("COVERR_API_KEY");
  if (!key) return { provider: "coverr", available: false, candidates: [] };

  try {
    const url = `https://api.coverr.co/videos?query=${encodeURIComponent(query)}&page_size=${perPage}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return { provider: "coverr", available: true, error: `HTTP ${res.status}`, candidates: [] };
    const data = await res.json();
    const hits = data.hits || data.videos || data.results || [];
    const candidates = hits.map((v) => {
      const downloadUrl = v.urls?.mp4_download || v.download_url || v.url || null;
      const maxSize = v.max_size || v.size || null;
      return {
        source: "coverr",
        selected_url: downloadUrl,
        page_url: v.urls?.page || v.page_url || null,
        native_duration_sec: v.duration ?? null,
        native_resolution: maxSize ? { width: maxSize.width, height: maxSize.height } : null,
        license: "Coverr License",
        license_verified_date: today(),
        attribution_required: true,
        attribution_text: v.title ? `Video by ${v.title} via Coverr` : "Video via Coverr",
      };
    });
    return { provider: "coverr", available: true, candidates };
  } catch (err) {
    return { provider: "coverr", available: true, error: err.message, candidates: [] };
  }
}
