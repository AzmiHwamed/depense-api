import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Nginx is the only trusted reverse proxy in production. This makes request
  // throttling use the visitor IP from X-Forwarded-For instead of grouping all
  // traffic under the proxy's 127.0.0.1 address.
  app.set('trust proxy', 'loopback');

  const config = new DocumentBuilder()
    .setTitle('Translate App API')
    .setDescription('Auth (Firebase) + SQL-backed user API')
    .setVersion('1.0')
    .addBearerAuth() // enables the "Authorize" button for Bearer tokens
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
