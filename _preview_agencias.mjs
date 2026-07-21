import fs from "node:fs/promises";
const data = JSON.parse(await fs.readFile("agencias_candidatas.json", "utf8"));

console.log(`Total: ${data.count} empresas\n`);

console.log("=== TOP 30 (por nome) ===");
data.companies.slice(0, 30).forEach((c, i) => {
  const p = c.properties || {};
  console.log(`${(i + 1).toString().padStart(3)}. ${p.name || "(sem nome)"}  —  ${p.domain || "(sem domínio)"}  [contatos: ${p.num_associated_contacts}; ${p.lifecyclestage || "—"}]`);
});

console.log("\n=== 30 ALEATÓRIAS (amostra para validar qualidade) ===");
const shuffled = [...data.companies].sort(() => Math.random() - 0.5).slice(0, 30);
shuffled.forEach((c, i) => {
  const p = c.properties || {};
  console.log(`${(i + 1).toString().padStart(3)}. ${p.name || "(sem nome)"}  —  ${p.domain || ""}  [src: ${c.sources.join(",")}]`);
});

console.log("\n=== JÁ CLIENTES (lifecyclestage=customer) ===");
const customers = data.companies.filter(c => c.properties?.lifecyclestage === "customer");
customers.forEach((c, i) => {
  console.log(`${(i + 1).toString().padStart(3)}. ${c.properties.name}  —  ${c.properties.domain || ""}`);
});
