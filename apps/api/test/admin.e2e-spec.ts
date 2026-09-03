import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const ADMIN_ROUTES: { method: 'get' | 'post' | 'patch'; path: string }[] = [
  { method: 'get', path: '/admin/companies' },
  { method: 'get', path: '/admin/reputation' },
  { method: 'get', path: '/admin/aws-health' },
];

describe('Admin routes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  let companyId: string;
  let userEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    userEmail = `admin-e2e-${randomUUID()}@example.com`;
    const password = 'testpass123';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ companyName: 'Admin E2E Co', email: userEmail, password });
    companyId = registerRes.body.companyId;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password });
    cookie = loginRes.headers['set-cookie'][0].split(';')[0];

    // isPlatformAdmin is false at this point — deliberately not flipped yet,
    // so the tests below prove a normal user is rejected *before* the
    // "grants platform admin" step later flips the same account and reuses
    // this same cookie/session to prove PlatformAdminGuard re-checks the DB
    // fresh rather than trusting anything cached from login.
  });

  afterAll(async () => {
    const campaigns = await prisma.campaign.findMany({
      where: { companyId },
      select: { id: true },
    });
    const campaignIds = campaigns.map((c) => c.id);
    await prisma.recipient.deleteMany({
      where: { campaignId: { in: campaignIds } },
    });
    await prisma.campaign.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await app.close();
  });

  it.each(ADMIN_ROUTES)(
    'rejects a normal company user with 403 on $method $path',
    async ({ method, path }) => {
      await request(app.getHttpServer())
        [method](path)
        .set('Cookie', cookie)
        .expect(403);
    },
  );

  it('rejects requests with no auth cookie at all', async () => {
    await request(app.getHttpServer()).get('/admin/companies').expect(401);
  });

  it('grants platform admin via a direct DB update (no self-serve UI/endpoint)', async () => {
    await prisma.user.update({
      where: { email: userEmail },
      data: { isPlatformAdmin: true },
    });
  });

  it('the *same* cookie now passes — guard re-checks the DB, not a cached JWT claim', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/companies')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: { id: string }) => c.id === companyId)).toBe(true);
  });

  it('suspend/unsuspend blocks and restores sending', async () => {
    await request(app.getHttpServer())
      .post(`/admin/companies/${companyId}/suspend`)
      .set('Cookie', cookie)
      .expect(201);

    const campaignRes = await request(app.getHttpServer())
      .post('/campaigns')
      .set('Cookie', cookie)
      .send({
        subject: 'Test',
        bodyHtml: '<p>hi</p>',
        fromAddress: 'test@example.com',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/campaigns/${campaignRes.body.id}/send`)
      .set('Cookie', cookie)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/admin/companies/${companyId}/unsuspend`)
      .set('Cookie', cookie)
      .expect(201);

    // No approved senders/recipients yet, so this now fails for a different
    // (non-suspension) reason — proves the suspended check is no longer the
    // one blocking it.
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${campaignRes.body.id}/send`)
      .set('Cookie', cookie)
      .expect(400);

    expect(res.body.message).not.toMatch(/suspended/i);
  });
});
