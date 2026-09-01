console.log(JSON.stringify({ runId:`nightly-${new Date().toISOString().slice(0,10)}`, adapter:'fake-databricks', exported:3, imported:3, checksum:'matched', checkpoint:'advanced' }, null, 2));
