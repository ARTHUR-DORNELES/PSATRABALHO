// Detalhe do flow principal 1751174289: estrutura do branch de qualificacao
// (action 45) e o que cada saida conecta; e a arvore de set-value (actions 28-39).
import fs from "node:fs";
const flows = JSON.parse(fs.readFileSync("_flowHits.json", "utf8"));
const def = flows.find(f => String(f.id) === "1751174289").def;
const acts = def.actions || [];

// mapa actionId -> indice e tipo, pra traduzir conexoes
const byActionId = {};
acts.forEach((a, i) => { byActionId[a.actionId] = { i, type: a.type, a }; });

function nm(actionId) {
  const x = byActionId[actionId];
  if (!x) return `(actionId ${actionId} ?)`;
  let extra = "";
  if (x.a.fields?.property_name) extra = ` set ${x.a.fields.property_name}=${JSON.stringify(x.a.fields.value?.staticValue ?? x.a.fields.value)}`;
  if (x.type === "LIST_BRANCH") extra = " [BRANCH]";
  return `#${x.i}(id${actionId}) ${x.type}${extra}`;
}

console.log("===== Lista resumida de TODAS as actions =====");
acts.forEach((a, i) => {
  const conn = a.connection?.nextActionId ?? a.defaultBranchConnection?.nextActionId ?? "-";
  console.log(`  #${i} id=${a.actionId} ${a.type}` +
    (a.fields?.property_name ? ` setProp=${a.fields.property_name}` : "") +
    `  ->next=${conn}`);
});

console.log("\n===== BRANCH action 45 (qualificacao/desqualificacao) =====");
const b = acts[44];
console.log("actionId:", b.actionId, "type:", b.type);
(b.listBranches || []).forEach((lb, i) => {
  const conn = lb.connection?.nextActionId;
  console.log(`\n  >> listBranch[${i}] -> ${conn ? nm(conn) : "(sem next / fim)"}`);
  const fb = lb.filterBranch;
  const collect = (node, ind="       ") => {
    (node.filterBranches||[]).forEach(sb => {
      (sb.filters||[]).forEach(fl => {
        const op = fl.operation?.operator||fl.operator;
        const vals = fl.operation?.values||fl.values;
        console.log(`${ind}- ${fl.property} ${op} ${vals?JSON.stringify(vals):""}`);
      });
      collect(sb, ind);
    });
    (node.filters||[]).forEach(fl => {
      const op = fl.operation?.operator||fl.operator;
      const vals = fl.operation?.values||fl.values;
      console.log(`${ind}- ${fl.property} ${op} ${vals?JSON.stringify(vals):""}`);
    });
  };
  collect(fb);
  console.log(`     (logica entre filterBranches = OU; dentro de cada = E)`);
});
const dbc = b.defaultBranchConnection;
console.log(`\n  >> DEFAULT (nenhuma condicao acima) -> ${dbc?.nextActionId ? nm(dbc.nextActionId) : JSON.stringify(dbc)}`);

// O que faz a saida de desqualificacao vs default? Segue 2 passos.
console.log("\n===== Seguindo cadeia da saida de cada branch (2 niveis) =====");
function follow(actionId, depth=0, seen=new Set()) {
  if (actionId==null || seen.has(actionId) || depth>4) return;
  seen.add(actionId);
  const x = byActionId[actionId];
  if (!x) { console.log("  ".repeat(depth)+`-> (?) ${actionId}`); return; }
  console.log("  ".repeat(depth)+`-> ${nm(actionId)}`);
  const next = x.a.connection?.nextActionId ?? x.a.defaultBranchConnection?.nextActionId;
  follow(next, depth+1, seen);
}
(b.listBranches||[]).forEach((lb,i)=>{
  console.log(`\n cadeia da listBranch[${i}] (desqualifica?):`);
  follow(lb.connection?.nextActionId,1);
});
console.log(`\n cadeia do DEFAULT (qualifica?):`);
follow(dbc?.nextActionId,1);
