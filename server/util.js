// Turns anything (undefined, null, number, object) into a safe string.
// Also stops "NoSQL injection" such as { "phone": { "$gt": "" } }.
exports.str = (v) => (v === null || v === undefined || typeof v === 'object' ? '' : String(v));
