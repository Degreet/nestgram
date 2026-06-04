import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NestgramModule, WebhookController } from 'nestgram';

import { loadConfig, type AppConfig } from './config';
import { RemindersModule } from './reminders/reminders.module';
import { AdminModule } from './admin/admin.module';

const config = (service: ConfigService): AppConfig =>
  service.getOrThrow<AppConfig>('app');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ app: loadConfig() })],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (service: ConfigService) => ({
        type: 'postgres',
        url: config(service).databaseUrl,
        autoLoadEntities: true,
        // Demo convenience — auto-creates the schema. Use migrations in real prod.
        synchronize: true,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (service: ConfigService) => ({
        connection: {
          host: config(service).redisHost,
          port: config(service).redisPort,
        },
      }),
    }),

    NestgramModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (service: ConfigService) => {
        const app = config(service);
        return {
          token: app.botToken,
          parseMode: 'HTML',
          ...(app.useWebhook
            ? {
                webhook: {
                  url: app.webhookUrl,
                  secretToken: app.webhookSecret,
                },
              }
            : { polling: true }),
        };
      },
    }),

    RemindersModule,
    AdminModule,
  ],
  // Ready-made receiver for the webhook transport (served at /telegram/webhook).
  // Harmless under polling — Telegram simply never calls it.
  controllers: [WebhookController],
})
export class AppModule {}
