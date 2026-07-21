// Analisa _flowHits.json: para cada flow, classifica ONDE cada campo alvo é usado
// (gatilho de inscrição / branch-filtro / ação set-property / comunicação).
import fs from "node:fs";
const flows = JSON.parse(fs.readFileSync("_flowHits.json", "utf8"));
const TARGETS = ["cargo__oficial_", "quantos_colabores_tem_na_empresa_"];

// walk recursivo: retorna lista de {path, node} onde node referencia um alvo via
// campo "property" / "propertyName" igual a um alvo.
function findUsages(obj, target, path = "$", out = []) {
  if (obj == null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => findUsages(v, target, `${path}[${i}]`, out));
    return out;
  }
  // detecta filtro que referencia a propriedade
  const propVal = obj.property ?? obj.propertyName ?? obj.propertyNameToCheck;
  if (propVal === target) out.push({ path, node: obj });
  // detecta set-property action (valor escrito ou lido)
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v === target && k !== "property" && k !== "propertyName") {
      out.push({ path: `${path}.${k}`, node: obj, viaKey: k });
    }
    findUsages(v, target, `${path}.${k}`, out);
  }
  return out;
}

function classify(path) {
  if (/enrollmentCriteria/i.test(path)) return "GATILHO DE INSCRICAO (enrollment)";
  if (/reEnrollment/i.test(path)) return "RE-INSCRICAO";
  if (/listFilterBranch|filterBranch|filters/i.test(path) && /actions/i.test(path)) return "BRANCH / IF-THEN (filtro dentro de acao)";
  if (/actions/i.test(path)) return "ACAO (set-property / comunicacao)";
  if (/listFilterBranch|filterBranch|filters/i.test(path)) return "FILTRO";
  return "outro";
}

function shortNode(n) {
  // resume operador/valores do filtro
  const op = n.operation?.operator || n.operator || n.filterType || "";
  const vals = n.operation?.values || n.values || n.value || n.operation?.value || "";
  const incl = n.operation?.includeObjectsWithNoValueSet;
  return `op=${op} vals=${JSON.stringify(vals)}${incl!==undefined?` incNoValue=${incl}`:""}`;
}

for (const f of flows) {
  console.log(`\n############ [${f.enabled ? "ATIVO" : "inativo"}] ${f.id} — ${f.name}`);
  for (const t of TARGETS) {
    const us = findUsages(f.def, t);
    if (!us.length) continue;
    console.log(`  campo: ${t}  (${us.length} ocorrência(s))`);
    for (const u of us) {
      console.log(`    • ${classify(u.path)}`);
      console.log(`        path: ${u.path}`);
      if (u.viaKey) console.log(`        usado como VALOR no campo "${u.viaKey}" (provável set-property / copy)`);
      else console.log(`        ${shortNode(u.node)}`);
    }
  }
}
