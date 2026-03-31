import crypto from 'crypto';

function getDiscriminator(name) {
  const hash = crypto.createHash('sha256');
  hash.update(`global:${name}`);
  return hash.digest().slice(0, 8).toString('hex');
}

const methods = [
  'initialize_vault',
  'create_grid',
  'place_bet',
  'resolve_grid',
  'claim_reward',
  'collect_revenue'
];

methods.forEach(m => {
  console.log(`${m}: ${getDiscriminator(m)}`);
});
