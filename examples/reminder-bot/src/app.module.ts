import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { I18nModule, NestgramModule, WebhookController } from 'nestgram';

import { loadConfig, type AppConfig } from './config';
import { DEFAULT_LOCALE, translations } from './i18n/translations';
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

    I18nModule.forRoot({ translations, defaultLocale: DEFAULT_LOCALE }),

    RemindersModule,
    AdminModule,
  ],
  controllers: [WebhookController],
})
export class AppModule {}
