import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseSeederService } from '../src/database/seeds/database-seeder.service';

describe('UserOrganizationRoles (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: number;
  let organizationId: number;
  let roleId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Seed the database
    const seeder = moduleFixture.get<DatabaseSeederService>(
      DatabaseSeederService,
    );
    await seeder.seedAll();

    // Register and login a test user
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'roleuser',
      email: 'roleuser@example.com',
      password: 'password123',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'roleuser',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
    userId = loginResponse.body.userId || 1;

    // Create a test organization
    const orgResponse = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Organization',
        description: 'For role testing',
      });

    organizationId = orgResponse.body.id;

    // Create a test role
    const roleResponse = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Role',
        permissions: {
          canEdit: true,
          canDelete: false,
        },
      });

    roleId = roleResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/user-organization-roles/assign (POST)', () => {
    it('should assign a role to a user in an organization', () => {
      return request(app.getHttpServer())
        .post('/user-organization-roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          organizationId,
          roleId,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.userId).toBe(userId);
          expect(response.body.organizationId).toBe(organizationId);
          expect(response.body.roleId).toBe(roleId);
        });
    });

    it('should fail to assign duplicate role', () => {
      return request(app.getHttpServer())
        .post('/user-organization-roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          organizationId,
          roleId,
        })
        .expect(409);
    });

    it('should fail with invalid user', () => {
      return request(app.getHttpServer())
        .post('/user-organization-roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 99999,
          organizationId,
          roleId,
        })
        .expect(404);
    });
  });

  describe('/user-organization-roles/assign-multiple (POST)', () => {
    it('should assign multiple roles to a user', async () => {
      // Create additional roles
      const role2Response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Developer Role',
          permissions: { canDeploy: true },
        });

      const role3Response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Viewer Role',
          permissions: { canView: true },
        });

      return request(app.getHttpServer())
        .post('/user-organization-roles/assign-multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          organizationId,
          roleIds: [role2Response.body.id, role3Response.body.id],
        })
        .expect(201)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(2);
        });
    });
  });

  describe('/user-organization-roles/user/:userId/organization/:organizationId (GET)', () => {
    it('should get user roles in an organization', () => {
      return request(app.getHttpServer())
        .get(
          `/user-organization-roles/user/${userId}/organization/${organizationId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('role');
        });
    });
  });

  describe('/user-organization-roles/user/:userId/organizations (GET)', () => {
    it('should get all organizations for a user', () => {
      return request(app.getHttpServer())
        .get(`/user-organization-roles/user/${userId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('organization');
          expect(response.body[0]).toHaveProperty('role');
        });
    });
  });

  describe('/user-organization-roles/organization/:organizationId/members (GET)', () => {
    it('should get all members of an organization', () => {
      return request(app.getHttpServer())
        .get(`/user-organization-roles/organization/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('user');
          expect(response.body[0]).toHaveProperty('role');
        });
    });
  });

  describe('/user-organization-roles/organization/:organizationId/role/:roleId/users (GET)', () => {
    it('should get users with a specific role in an organization', () => {
      return request(app.getHttpServer())
        .get(
          `/user-organization-roles/organization/${organizationId}/role/${roleId}/users`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('user');
        });
    });
  });

  describe('/user-organization-roles/user/:userId/organization/:organizationId/role/:roleId (DELETE)', () => {
    it('should remove a role from a user', () => {
      return request(app.getHttpServer())
        .delete(
          `/user-organization-roles/user/${userId}/organization/${organizationId}/role/${roleId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when removing non-existent assignment', () => {
      return request(app.getHttpServer())
        .delete(
          `/user-organization-roles/user/${userId}/organization/${organizationId}/role/99999`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/permissions/user/:userId/organization/:organizationId (GET)', () => {
    it('should get aggregated permissions for a user', async () => {
      // First assign a role
      await request(app.getHttpServer())
        .post('/user-organization-roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          organizationId,
          roleId,
        });

      return request(app.getHttpServer())
        .get(`/permissions/user/${userId}/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('permissions');
          expect(Array.isArray(response.body.permissions)).toBe(true);
        });
    });
  });
});
