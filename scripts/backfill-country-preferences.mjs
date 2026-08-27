import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");

const PRIMARY_LANGUAGE_OVERRIDES = {
  AE: "ar", BH: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar",
  KW: "ar", LB: "ar", LY: "ar", MA: "ar", MR: "ar", OM: "ar",
  PS: "ar", QA: "ar", SA: "ar", SD: "ar", SO: "ar", SY: "ar",
  TN: "ar", YE: "ar",
  BE: "nl", CA: "en", CH: "de", CY: "el", FI: "fi", IE: "en",
  IL: "he", IN: "hi", LU: "lb", MT: "mt", NZ: "en", SG: "en",
  ZA: "en",
};

const LANGUAGE_NAME_ALIASES = {
  "modern standard arabic": "ar",
  "standard arabic": "ar",
  "mandarin chinese": "zh",
  "chinese": "zh",
  "persian (farsi)": "fa",
  "farsi": "fa",
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+languages?$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickCurrencyCode(country) {
  const codes = Object.keys(country.currencies ?? {});
  return codes.length ? codes[0].toUpperCase() : null;
}

function pickLanguage(country, languagesByCode, languagesByName) {
  const countryCode = country.cca2?.toUpperCase();
  const overrideCode = PRIMARY_LANGUAGE_OVERRIDES[countryCode];
  if (overrideCode && languagesByCode.has(overrideCode)) {
    return languagesByCode.get(overrideCode);
  }

  for (const languageName of Object.values(country.languages ?? {})) {
    const normalizedName = normalize(languageName);
    const aliasCode = LANGUAGE_NAME_ALIASES[normalizedName];
    if (aliasCode && languagesByCode.has(aliasCode)) {
      return languagesByCode.get(aliasCode);
    }
    if (languagesByName.has(normalizedName)) {
      return languagesByName.get(normalizedName);
    }
  }

  return null;
}

const connection = await mysql.createConnection({
  host: requiredEnv("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 3306),
  user: requiredEnv("DB_USERNAME"),
  password: process.env.DB_PASSWORD ?? "",
  database: requiredEnv("DB_NAME"),
});

try {
  const response = await fetch(
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  );
  if (!response.ok) {
    throw new Error(`Country metadata request failed (${response.status})`);
  }

  const metadata = await response.json();
  if (!Array.isArray(metadata)) {
    const detail =
      metadata && typeof metadata === "object"
        ? JSON.stringify(metadata).slice(0, 300)
        : String(metadata);
    throw new Error(`Country metadata response was not an array: ${detail}`);
  }
  const metadataByCode = new Map(
    metadata.map((country) => [country.cca2?.toUpperCase(), country]),
  );

  const [countries] = await connection.query(
    "SELECT id, name, alpha2Code, currencyId, languageId FROM countries",
  );
  const [currencies] = await connection.query(
    "SELECT id, code, name FROM currencies WHERE isActive = 1",
  );
  const [languages] = await connection.query(
    "SELECT id, code, name FROM languages",
  );

  const currenciesByCode = new Map(
    currencies.map((currency) => [currency.code.toUpperCase(), currency]),
  );
  const languagesByCode = new Map(
    languages.map((language) => [language.code.toLowerCase(), language]),
  );
  const languagesByName = new Map(
    languages.map((language) => [normalize(language.name), language]),
  );

  const updates = [];
  const unmatched = [];

  for (const country of countries) {
    const code = country.alpha2Code?.toUpperCase();
    const countryMetadata = metadataByCode.get(code);
    if (!countryMetadata) {
      unmatched.push(`${country.name} (${code}): country metadata not found`);
      continue;
    }

    const currencyCode = pickCurrencyCode(countryMetadata);
    const currency = currencyCode ? currenciesByCode.get(currencyCode) : null;
    const language = pickLanguage(
      countryMetadata,
      languagesByCode,
      languagesByName,
    );

    if (!currency || !language) {
      const problems = [];
      if (!currency) problems.push(`currency ${currencyCode ?? "unknown"}`);
      if (!language) {
        problems.push(
          `language ${Object.values(countryMetadata.languages ?? {}).join("/") || "unknown"}`,
        );
      }
      unmatched.push(`${country.name} (${code}): missing ${problems.join(" and ")}`);
      continue;
    }

    updates.push({ country, currency, language });
  }

  console.log(`${APPLY ? "Applying" : "Would apply"} ${updates.length} country preference updates:`);
  for (const { country, currency, language } of updates) {
    console.log(
      `  ${country.name} (${country.alpha2Code}) -> ${currency.code}, ${language.name} (${language.code})`,
    );
  }

  if (unmatched.length) {
    console.warn(`\nSkipped ${unmatched.length} unmatched countries:`);
    for (const item of unmatched) console.warn(`  ${item}`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to update the database.");
    process.exitCode = unmatched.length ? 2 : 0;
  } else {
    await connection.beginTransaction();
    try {
      for (const { country, currency, language } of updates) {
        await connection.execute(
          "UPDATE countries SET currencyId = ?, languageId = ? WHERE id = ?",
          [currency.id, language.id, country.id],
        );
      }
      await connection.commit();
      console.log(`\nUpdated ${updates.length} countries successfully.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
