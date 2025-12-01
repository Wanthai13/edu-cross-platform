const fs = require('fs');
const path = require('path');

function parseDotenv(filePath) {
  try {
    const src = fs.readFileSync(filePath, { encoding: 'utf8' });
    const lines = src.split(/\r?\n/);
    const out = {};
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch (e) {
    return {};
  }
}

module.exports = ({ config }) => {
  // Try to read .env from project root
  const envPath = path.resolve(process.cwd(), '.env');
  const env = parseDotenv(envPath);

  const apiBase = env.API_BASE_URL || process.env.API_BASE_URL || (config.extra && config.extra.API_BASE_URL) || 'http://localhost:3000/api';
  const genAiKey = env.GENAI_API_KEY || process.env.GENAI_API_KEY || (config.extra && config.extra.GENAI_API_KEY) || '';

  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    console.log('[app.config] API_BASE_URL ->', apiBase ? apiBase : '<none>');
  }

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      API_BASE_URL: apiBase,
      GENAI_API_KEY: genAiKey,
    },
  };
};
