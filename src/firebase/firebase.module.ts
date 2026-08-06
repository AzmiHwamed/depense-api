import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: (config: ConfigService): App => {
        if (!getApps().length) {
          return initializeApp({
            credential: cert({
              projectId: config.get<string>('FIREBASE_PROJECT_ID'),
              clientEmail: config.get<string>('FIREBASE_CLIENT_EMAIL'),
              privateKey: config
                .get<string>('FIREBASE_PRIVATE_KEY')
                ?.replace(/\\n/g, '\n'),
            }),
            databaseURL: config.get<string>('FIREBASE_DATABASE_URL'),
          });
        }
        return getApps()[0];
      },
    },
    {
      provide: 'FIREBASE_DB',
      inject: ['FIREBASE_ADMIN'],
      useFactory: (app: App): Database => getDatabase(app),
    },
    {
      provide: 'FIREBASE_MESSAGING',
      inject: ['FIREBASE_ADMIN'],
      useFactory: (app: App): Messaging => getMessaging(app),
    },
  ],
  exports: ['FIREBASE_ADMIN', 'FIREBASE_DB', 'FIREBASE_MESSAGING'],
})
export class FirebaseModule {}