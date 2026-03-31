const crypto = require('crypto');
const fs = require('fs');

const instructions = [
  "initialize_vault",
  "create_grid",
  "place_bet",
  "resolve_grid",
  "expire_grid",
  "claim_reward",
  "collect_revenue"
];

let output = "";
instructions.forEach(name => {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  output += `${name}: [${Array.from(hash.slice(0, 8)).join(", ")}]\n`;
});

fs.writeFileSync('discriminators.txt', output);
console.log("Done");
