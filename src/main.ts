import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Ensure upload directories exist
  const uploadDirs = [
    './uploads',
    './uploads/resumes',
    './uploads/offers',
    './uploads/documents',
    './uploads/cnv-documents',
    './uploads/rent-receipts',
    './uploads/onboarding',
  ];
  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'https://admin-demo.yourdomain.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
    ],
  });

  // Serve uploads statically
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const port = Number(process.env.PORT) || 5000;

  await app.listen(port, '0.0.0.0');

  console.log(`Admin API is running at http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Admin API:', error);
  process.exit(1);
});