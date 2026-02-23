import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './common/request-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const http = app.getHttpAdapter().getInstance();
  http.use(
    express.json({
      verify: (req, res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  http.use(requestContextMiddleware);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Demo mode: dashboard and API are served from different origins (Runpod proxy ports).
  app.enableCors({ origin: true });
  app.setGlobalPrefix('api', { exclude: ['healthz'] });

  const config = new DocumentBuilder()
    .setTitle('TTS SaaS API')
    .setDescription('API v1 cho dịch vụ TTS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
