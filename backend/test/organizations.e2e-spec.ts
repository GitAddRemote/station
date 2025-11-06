import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdOrgId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register and login a test user
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'orguser',
      email: 'org@example.com',
      password: 'password123',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'orguser',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/organizations (POST)', () => {
    it('should create a new organization', () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Corp',
          description: 'A test organization',
          isActive: true,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe('Test Corp');
          expect(response.body.description).toBe('A test organization');
          expect(response.body.isActive).toBe(true);
          createdOrgId = response.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .send({
          name: 'Unauthorized Org',
        })
        .expect(401);
    });

    it('should create organization with minimal data', () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Minimal Org',
        })
        .expect(201)
        .then((response) => {
          expect(response.body.name).toBe('Minimal Org');
          expect(response.body.isActive).toBe(true);
        });
    });
  });

  describe('/organizations (GET)', () => {
    it('should return all active organizations', () => {
      return request(app.getHttpServer())
        .get('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/organizations/:id (GET)', () => {
    it('should return a specific organization', () => {
      return request(app.getHttpServer())
        .get(`/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdOrgId);
          expect(response.body.name).toBe('Test Corp');
        });
    });

    it('should return 404 for non-existent organization', () => {
      return request(app.getHttpServer())
        .get('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/organizations/:id/members (GET)', () => {
    it('should return organization with members', () => {
      return request(app.getHttpServer())
        .get(`/organizations/${createdOrgId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('userOrganizationRoles');
          expect(Array.isArray(response.body.userOrganizationRoles)).toBe(true);
        });
    });
  });

  describe('/organizations/:id (PUT)', () => {
    it('should update an organization', () => {
      return request(app.getHttpServer())
        .put(`/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated organization description',
          isActive: true,
        })
        .expect(200)
        .then((response) => {
          expect(response.body.description).toBe(
            'Updated organization description',
          );
        });
    });

    it('should deactivate an organization', () => {
      return request(app.getHttpServer())
        .put(`/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isActive: false,
        })
        .expect(200)
        .then((response) => {
          expect(response.body.isActive).toBe(false);
        });
    });
  });

  describe('/organizations/:id (DELETE)', () => {
    it('should delete an organization', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when deleting non-existent organization', () => {
      return request(app.getHttpServer())
        .delete('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
