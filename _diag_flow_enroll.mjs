// Inspeciona enrollment + branches-chave dos flows ATIVOS relevantes.
import fs from "node:fs";
const flows = JSON.parse(fs.readFileSync("_flowHits.json", "utf8"));
const byId = Object.fromEntries(flows.map(f => [String(f.id), f.def]));

function summFilter(f) {
  const op = f.operation?.operator || f.operator;
  const prop = f.property || f.propertyName;
  const vals = f.operation?.values || f.values || f.operation?.value || f.value;
  const inc = f.operation?.includeObjectsWithNoValueSet;
  return `${prop} ${op} ${vals?JSON.stringify(vals):""}${inc!==undefined?` [incNoVal=${inc}]`:""}`;
}
function summBranch(fb, indent="      ") {
  const out = [];
  (fb?.filterBranches || []).forEach((b, i) => {
    (b.filters || []).forEach(fl => out.push(`${indent}- ${summFilter(fl)}`));
    if (b.filterBranches) out.push(...summBranch(b, indent+"  "));
  });
  (fb?.filters || []).forEach(fl => out.push(`${indent}- ${summFilter(fl)}`));
  return out;
}

function dumpEnrollment(def) {
  const ec = def.enrollmentCriteria;
  if (!ec) { console.log("    (sem enrollmentCriteria explicito)"); return; }
  console.log(`    tipo: ${ec.type}  reEnrollment: ${!!ec.reEnrollmentTriggersFilterBranches?.length}`);
  const lines = summBranch(ec.listFilterBranch);
  if (lines.length) { console.log("    GATILHO (listFilterBranch):"); lines.forEach(l=>console.log(l)); }
  // alguns flows usam eventos (form submission) como gatilho
  if (ec.eventFilterBranches?.length) {
    console.log("    GATILHO por EVENTO:");
    ec.eventFilterBranches.forEach(e => console.log("      " + JSON.stringify(e).slice(0,300)));
  }
}

const FOCUS = ["1751174289","1717726261","1652646795","1654405420","1743612472","1820907852","1745625188","1753359123"];
for (const id of FOCUS) {
  const def = byId[id];
  if (!def) { console.log(`\n### ${id} nao encontrado`); continue; }
  console.log(`\n################### ${id} — ${def.name}  [${def.isEnabled?"ATIVO":"inativo"}]`);
  console.log("  >> ENROLLMENT:");
  dumpEnrollment(def);
}

// Detalhe especial: branch de qualificacao do flow principal 1751174289 (action 44)
console.log("\n\n=========== DETALHE: 1751174289 action[44] (branch de qualificacao) ===========");
const main = byId["1751174289"];
const a44 = main.actions?.find((a,i)=>i===44) || main.actions?.[44];
console.log("actionId:", a44?.actionId, "type:", a44?.type);
(a44?.listBranches || []).forEach((lb, i) => {
  console.log(`\n  listBranch[${i}] connection->`, JSON.stringify(lb.connection));
  summBranch(lb.filterBranch).forEach(l=>console.log("    "+l));
});
console.log("  defaultBranch connection ->", JSON.stringify(a44?.defaultBranchConnection || a44?.defaultBranch));

// Mostra os "property_name" actions (set property) do 1751174289 que escrevem quantos_colabores
console.log("\n=========== 1751174289: acoes que ESCREVEM em props (resumo) ===========");
(main.actions||[]).forEach((a,i)=>{
  const pn = a.fields?.property_name;
  if (pn && /cargo__oficial_|quantos_colabores_tem_na_empresa_/.test(pn)) {
    console.log(`  action[${i}] type=${a.type} property_name=${pn} value=${JSON.stringify(a.fields?.value).slice(0,80)}`);
  }
});
