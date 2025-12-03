import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { seedSystemUser } from './helpers/seed-system-user';

describe('Roles (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdRoleId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Seed system user for E2E tests
    const dataSource = moduleFixture.get<DataSource>(DataSource);
    await seedSystemUser(dataSource);

    // Register and login a test user to get JWT token
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/roles (POST)', () => {
    it('should create a new role', () => {
      return request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Admin',
          description: 'Test administrator role',
          permissions: {
            canEditUsers: true,
            canDeleteUsers: true,
          },
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe('Test Admin');
          expect(response.body.description).toBe('Test administrator role');
          expect(response.body.permissions).toEqual({
            canEditUsers: true,
            canDeleteUsers: true,
          });
          createdRoleId = response.body.id;
        });
    });

    it('should fail to create role with duplicate name', () => {
      return request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Admin',
          description: 'Duplicate role',
        })
        .expect(409);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/roles')
        .send({
          name: 'Unauthorized Role',
        })
        .expect(401);
    });
  });

  describe('/roles (GET)', () => {
    it('should return all roles', () => {
      return request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/roles/:id (GET)', () => {
    it('should return a specific role', () => {
      return request(app.getHttpServer())
        .get(`/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdRoleId);
          expect(response.body.name).toBe('Test Admin');
        });
    });

    it('should return 404 for non-existent role', () => {
      return request(app.getHttpServer())
        .get('/roles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/roles/:id (PUT)', () => {
    it('should update a role', () => {
      return request(app.getHttpServer())
        .put(`/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description',
          permissions: {
            canEditUsers: true,
            canDeleteUsers: false,
            canViewReports: true,
          },
        })
        .expect(200)
        .then((response) => {
          expect(response.body.description).toBe('Updated description');
          expect(response.body.permissions.canViewReports).toBe(true);
        });
    });
  });

  describe('/roles/:id (DELETE)', () => {
    it('should delete a role', () => {
      return request(app.getHttpServer())
        .delete(`/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when deleting non-existent role', () => {
      return request(app.getHttpServer())
        .delete('/roles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
