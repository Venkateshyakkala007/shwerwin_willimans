import { courses, currentUser } from '../../../../packages/test-data/src/scenarios';
export async function GET() { return Response.json({ data: courses.filter((course) => course.eligibleFor.includes(currentUser.employmentType)), meta: { total: courses.length, source: 'fake-learning' } }); }
