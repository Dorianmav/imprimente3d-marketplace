import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
  });

  describe('POST /auth/signup', () => {
    it('should create a new user with default typeCompte', () => {
      const signupDto = {
        email: 'signup-test@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe(signupDto.email);
          expect(res.body.user.nom).toBe(signupDto.nom);
          expect(res.body.user.prenom).toBe(signupDto.prenom);
          expect(res.body.user.typeCompte).toBe('particulier');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should allow specifying typeCompte', () => {
      const signupDto = {
        email: 'signup-pro@example.com',
        password: 'password123',
        nom: 'Smith',
        prenom: 'Jane',
        typeCompte: 'pro',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.user.typeCompte).toBe('pro');
        });
    });

    it('should return 409 if email already exists', () => {
      const signupDto = {
        email: 'duplicate@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201)
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/signup')
            .send(signupDto)
            .expect(409),
        );
    });

    it('should reject invalid email format', () => {
      const signupDto = {
        email: 'invalid-email',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);
    });

    it('should reject short password', () => {
      const signupDto = {
        email: 'short-pass@example.com',
        password: 'short',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      const credentials = {
        email: 'login-test@example.com',
        password: 'password123',
      };

      // First create user
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: credentials.email,
          password: credentials.password,
          nom: 'Doe',
          prenom: 'John',
        })
        .expect(201)
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send(credentials)
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty('user');
              expect(res.body.user.email).toBe(credentials.email);
              expect(res.body).toHaveProperty('accessToken');
              expect(res.body).toHaveProperty('refreshToken');
            }),
        );
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'wrong-pass@example.com',
          password: 'correctPassword123',
          nom: 'Doe',
          prenom: 'John',
        })
        .expect(201)
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'wrong-pass@example.com',
              password: 'wrongPassword456',
            })
            .expect(401),
        );
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should reject missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send()
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return user profile with authentication', () => {
      const credentials = {
        email: 'profile-test@example.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: credentials.email,
          password: credentials.password,
          nom: credentials.nom,
          prenom: credentials.prenom,
        })
        .then((signupRes) =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: credentials.email,
              password: credentials.password,
            })
            .then((loginRes) =>
              request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
                .expect(200)
                .expect((res) => {
                  expect(res.body).toHaveProperty('id');
                  expect(res.body.email).toBe(credentials.email);
                  expect(res.body.prenom).toBe(credentials.prenom);
                  expect(res.body).toHaveProperty('imprimeurProfil');
                }),
            ),
        );
    });
  });

  describe('PATCH /auth/me', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch('/auth/me')
        .send({ nom: 'Updated' })
        .expect(401);
    });

    it('should update user profile', () => {
      const credentials = {
        email: 'update-test@example.com',
        password: 'password123',
        nom: 'Original',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: credentials.email,
          password: credentials.password,
          nom: credentials.nom,
          prenom: credentials.prenom,
        })
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: credentials.email,
              password: credentials.password,
            })
            .then((res) =>
              request(app.getHttpServer())
                .patch('/auth/me')
                .set('Authorization', `Bearer ${res.body.accessToken}`)
                .send({ nom: 'Updated', prenom: 'UpdatedFirst' })
                .expect(200)
                .expect((updateRes) => {
                  expect(updateRes.body.nom).toBe('Updated');
                  expect(updateRes.body.prenom).toBe('UpdatedFirst');
                }),
            ),
        );
    });
  });

  describe('POST /auth/change-password', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'new' })
        .expect(401);
    });

    it('should change password with correct current password', () => {
      const credentials = {
        email: 'pw-change@example.com',
        password: 'oldPassword123',
        nom: 'Doe',
        prenom: 'John',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: credentials.email,
          password: credentials.password,
          nom: credentials.nom,
          prenom: credentials.prenom,
        })
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: credentials.email,
              password: credentials.password,
            })
            .then((res) =>
              request(app.getHttpServer())
                .post('/auth/change-password')
                .set('Authorization', `Bearer ${res.body.accessToken}`)
                .send({
                  currentPassword: 'oldPassword123',
                  newPassword: 'newPassword456',
                })
                .expect(200)
                .then(() =>
                  request(app.getHttpServer())
                    .post('/auth/login')
                    .send({
                      email: credentials.email,
                      password: 'newPassword456',
                    })
                    .expect(200),
                ),
            ),
        );
    });

    it('should reject wrong current password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'wrong-pw@example.com',
          password: 'correctPassword123',
          nom: 'Doe',
          prenom: 'John',
        })
        .then(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'wrong-pw@example.com',
              password: 'correctPassword123',
            })
            .then((res) =>
              request(app.getHttpServer())
                .post('/auth/change-password')
                .set('Authorization', `Bearer ${res.body.accessToken}`)
                .send({
                  currentPassword: 'wrongOldPassword',
                  newPassword: 'newPassword456',
                })
                .expect(401),
            ),
        );
    });
  });

  describe('POST /auth/logout', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});
