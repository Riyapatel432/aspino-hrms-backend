import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Ensure upload directories exist
  if (!fs.existsSync('./uploads/resumes')) {
    fs.mkdirSync('./uploads/resumes', { recursive: true });
  }
  if (!fs.existsSync('./uploads/offers')) {
    fs.mkdirSync('./uploads/offers', { recursive: true });
  }
  if (!fs.existsSync('./uploads/documents')) {
    fs.mkdirSync('./uploads/documents', { recursive: true });
  }

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableCors();

  // Serve uploads statically
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

