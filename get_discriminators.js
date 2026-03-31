
const crypto = require('crypto');

function getDiscriminator(name) {
    const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
    return Array.from(hash.slice(0, 8));
}

const functions = [
    'initialize_vault',
    'create_grid',
    'place_bet',
    'resolve_grid',
    'claim_reward',
    'collect_revenue'
];

functions.forEach(name => {
    console.log(`${name}: [${getDiscriminator(name).join(', ')}]`);
});
