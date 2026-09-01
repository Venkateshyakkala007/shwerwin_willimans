const operations = new Map<string, unknown>();
export async function PUT(request: Request) {
  const operationId = request.headers.get('x-client-operation-id');
  if (!operationId) return Response.json({ error: { code:'OPERATION_ID_REQUIRED', message:'x-client-operation-id is required', correlationId: crypto.randomUUID() } }, { status:400 });
  if (operations.has(operationId)) return Response.json({ data: operations.get(operationId), meta: { replayed:true } });
  const body = await request.json() as { courseId?: string; percentage?: number; expectedVersion?: number };
  if (!body.courseId || typeof body.percentage !== 'number' || body.percentage < 0 || body.percentage > 100) return Response.json({ error: { code:'VALIDATION_ERROR', message:'A valid courseId and percentage from 0 to 100 are required', correlationId:crypto.randomUUID() } }, { status:400 });
  if (body.expectedVersion !== 1) return Response.json({ error: { code:'VERSION_CONFLICT', message:'Progress changed since it was loaded', correlationId:crypto.randomUUID(), details:{ currentVersion:1 } } }, { status:409 });
  const record = { courseId:body.courseId, percentage:body.percentage, status:body.percentage === 100 ? 'completed':'in_progress', source:'manual', version:2, updatedAt:new Date().toISOString() };
  operations.set(operationId, record); return Response.json({ data:record }, { status:200 });
}
