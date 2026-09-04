// import 'dotenv/config';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import * as express from 'express';
// import { join } from 'path';
// import * as fs from 'fs';

// async function bootstrap() {
//   // Ensure upload directories exist
//   if (!fs.existsSync('./uploads/resumes')) {
//     fs.mkdirSync('./uploads/resumes', { recursive: true });
//   }
//   if (!fs.existsSync('./uploads/offers')) {
//     fs.mkdirSync('./uploads/offers', { recursive: true });
//   }
//   if (!fs.existsSync('./uploads/documents')) {
//     fs.mkdirSync('./uploads/documents', { recursive: true });
//   }

//   const app = await NestFactory.create(AppModule);
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//     }),
//   );
//   app.enableCors({
//     origin: true,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
//     allowedHeaders: [
//       'Content-Type',
//       'Accept',
//       'Authorization',
//       'X-Requested-With',
//     ],
//   });

//   // Serve uploads statically
//   app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

//   const port = process.env.PORT || 5000;
//   await app.listen(port, '0.0.0.0');
//   console.log(`Application is running on: http://localhost:${port}`);
// }
// bootstrap();
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'https://admin-demo.yourdomain.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT) || 5001;

  await app.listen(port, '127.0.0.1');

  console.log(`Admin API is running at http://127.0.0.1:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Admin API:', error);
  process.exit(1);
});