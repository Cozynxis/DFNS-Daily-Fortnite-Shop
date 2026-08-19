import fs from "node:fs";

const input = process.argv[2] || "/tmp/registry.json";
const output = process.argv[3] || "data/cosmetic-history.json";
const source = JSON.parse(fs.readFileSync(input, "utf8"));

const containers = [];
if (source && typeof source === "object") containers.push(source);
for (const key of ["items", "cosmetics", "data", "registry"]) {
  if (source?.[key] && typeof source[key] === "object") containers.push(source[key]);
}

const records = {};
const add = (key, record) => {
  if (!record || typeof record !== "object") return;
  const id = String(record.id ?? record.item_id ?? record.itemId ?? key ?? "").trim();
  if (!id) return;

  const raw = record.shop_appearances ?? record.shopAppearances ?? record.appearances ?? [];
  const appearances = Array.isArray(raw) ? raw.map(entry => {
    if (typeof entry === "string" || typeof entry === "number") return { date: entry, price: null };
    return {
      date: entry?.date ?? entry?.timestamp ?? entry?.appearance ?? entry?.shop_date ?? null,
      price: entry?.price ?? entry?.final_price ?? entry?.finalPrice ?? entry?.regular_price ?? entry?.regularPrice ?? null
    };
  }).filter(x => x.date != null) : [];

  appearances.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const firstSeen = record.first_seen ?? record.firstSeen ?? record.first_appearance ?? record.firstAppearance ?? appearances[0]?.date ?? null;
  const lastSeen = appearances.at(-1)?.date ?? record.last_seen ?? record.lastSeen ?? null;
  const priced = [...appearances].reverse().find(x => Number.isFinite(Number(x.price)));

  records[id] = {
    firstSeen,
    lastSeen,
    price: priced ? Number(priced.price) : null,
    appearances
  };
};

for (const container of containers) {
  if (Array.isArray(container)) {
    for (const record of container) add(record?.id, record);
  } else {
    for (const [key, record] of Object.entries(container)) add(key, record);
  }
}

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(output, JSON.stringify(records));
console.log(`Built ${Object.keys(records).length} cosmetic history records.`);
