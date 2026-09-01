const scenario = process.argv[2] || 'happy-path';
const allowed = ['happy-path','pending-profile','contractor-limited-catalog','stale-dataset'];
if (!allowed.includes(scenario)) { console.error(`Unknown scenario: ${scenario}`); process.exit(1); }
console.log(`Selected deterministic seed scenario: ${scenario}`);
