import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './configuars/response/filter.exception';
import { ResponseInterceptor } from './configuars/response/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);

  // Global prefix (vd: /api)
  const prefix = cfg.get<string>('globalPrefix') ?? 'api';
  app.setGlobalPrefix(prefix);
  
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        console.log('Validation errors:', JSON.stringify(errors, null, 2));
        const messages = errors
          .map((err) => Object.values(err.constraints || {}))
          .flat();
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          errors: errors,
        });
      },
    }),
  );

  // CORS
  app.enableCors();

  // 🔧 SWAGGER CONFIGURATION - ĐÃ SỬA
  const config = new DocumentBuilder()
        .setTitle('meta-auth API')
    .setDescription('meta-auth API description')
    .setVersion('1.0')
    .addTag('meta-auth')
    .addBearerAuth() // Thêm nếu có JWT
    .addServer(cfg.get<string>('contextPath') ?? 'http://localhost:8888/meta-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Sửa path thành 'docs' như bạn muốn
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = cfg.get<number>('port') ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);  
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  console.log(`🌐 API prefix: /${prefix}`);
}

bootstrap();