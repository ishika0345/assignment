import { PrismaClient, Role, TaskStatus, Priority, ActivityType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const day = (offset) => new Date(Date.now() + offset * 86400000);
async function main() {
    await prisma.activity.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    const passwordHash = await bcrypt.hash('atelier-demo', 10);
    const admin = await prisma.user.create({ data: { email: 'alex@atelier.test', name: 'Alex Kim', passwordHash, role: Role.ADMIN } });
    const pms = await Promise.all(['Sam Okafor', 'Priya Shah'].map((name, i) => prisma.user.create({ data: { email: `pm${i + 1}@atelier.test`, name, passwordHash, role: Role.PM } })));
    const devs = await Promise.all(['Ravi Patel', 'Maya Chen', 'Jordan Lee', 'Noah Williams'].map((name, i) => prisma.user.create({ data: { email: `dev${i + 1}@atelier.test`, name, passwordHash, role: Role.DEVELOPER } })));
    const projects = await Promise.all(['Northstar Rebrand', 'Cedar & Co. Commerce', 'Atlas Health Portal'].map(async (name, i) => { const client = await prisma.client.create({ data: { name: `${name} Client` } }); return prisma.project.create({ data: { name, ownerId: pms[i % 2].id, clientId: client.id } }); }));
    const statuses = [TaskStatus.IN_REVIEW, TaskStatus.IN_PROGRESS, TaskStatus.TODO, TaskStatus.DONE, TaskStatus.OVERDUE];
    for (const [projectIndex, project] of projects.entries())
        for (let i = 0; i < 5; i++) {
            const task = await prisma.task.create({ data: { title: ['Checkout performance audit', 'Mobile navigation states', 'Analytics event mapping', 'QA accessibility sweep', 'Content migration'][i], description: 'Seeded project task', projectId: project.id, developerId: devs[(i + projectIndex) % devs.length].id, status: statuses[i], priority: i === 0 ? Priority.CRITICAL : i === 1 ? Priority.HIGH : Priority.MEDIUM, dueDate: i === 4 ? day(-3) : day(i + 1) } });
            await prisma.activity.create({ data: { type: ActivityType.STATUS_CHANGED, message: `Task #${task.id} seeded as ${task.status}`, userId: admin.id, projectId: project.id, taskId: task.id, toStatus: task.status } });
        }
}
main().finally(() => prisma.$disconnect());
