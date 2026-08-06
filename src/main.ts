import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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