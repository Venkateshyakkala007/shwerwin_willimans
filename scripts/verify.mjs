console.log('Configuration check passed. Fake connectors are development-only.');
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FAKE_CONNECTORS === 'true') { console.error('Fake connectors cannot run in production.'); process.exit(1); }
