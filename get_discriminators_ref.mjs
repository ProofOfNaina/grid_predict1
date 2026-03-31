
import crypto from 'crypto';
import fs from 'fs';

function getDiscriminator(name) {
    const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
    return Array.from(hash.slice(0, 8));
}

const functions = [
    'initialize_vault',
    'create_grid',
    'place_bet',
    'resolve_grid',
    'expire_grid',
    'claim_reward',
    'collect_revenue'
];

let out = '';
functions.forEach(name => {
    out += `${name}: [${getDiscriminator(name).join(', ')}]\n`;
});
fs.writeFileSync('disc_ref.txt', out);
