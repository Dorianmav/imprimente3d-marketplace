import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Create and login a test user
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'user-test@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      });

    expect(signupRes.status).toBe(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user-test@example.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await app.close();
  });

  describe('GET /users/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('user-test@example.com');
          expect(res.body).toHaveProperty('imprimeurProfil');
        });
    });
  });

  describe('GET /users/:id', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/users/user-123')
        .expect(401);
    });

    it('should return public user profile', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .then((res) => {
          const userId = res.body.id;
          return request(app.getHttpServer())
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((publicRes) => {
              expect(publicRes.body).toHaveProperty('id');
              expect(publicRes.body).not.toHaveProperty('email');
            });
        });
    });
  });

  describe('GET /users/:id/reviews', () => {
    it('should return user reviews', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .then((res) => {
          const userId = res.body.id;
          return request(app.getHttpServer())
            .get(`/users/${userId}/reviews`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toBeInstanceOf(Array);
            });
        });
    });
  });

  describe('GET /users/:id/listings', () => {
    it('should return seller active listings', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .then((res) => {
          const userId = res.body.id;
          return request(app.getHttpServer())
            .get(`/users/${userId}/listings`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toBeInstanceOf(Array);
            });
        });
    });
  });

  describe('DELETE /users/me', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/users/me')
        .expect(401);
    });
  });
});
