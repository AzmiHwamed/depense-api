import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Language } from './entities/language.entity';
import languages from './data/lang.json';

interface LanguageSeed {
  code: string;
  name: string;
}

@Injectable()
export class LanguageSeeder implements OnModuleInit {
  private readonly logger = new Logger(LanguageSeeder.name);

  constructor(
    @InjectRepository(Language)
    private repo: Repository<Language>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const seedData = languages as LanguageSeed[];
    // ... rest unchanged

        if (!seedData?.length) {
            this.logger.warn('No language seed data found, skipping.');
            return;
        }

        const codes = seedData.map((l) => l.code);

        // One query instead of one-per-language
        const existing = await this.repo.find({
            where: { code: In(codes) },
            select: { code: true },
        });
        const existingCodes = new Set(existing.map((l) => l.code));

        const toInsert = seedData
            .filter((lang) => !existingCodes.has(lang.code))
            .map((lang) => this.repo.create({ code: lang.code, name: lang.name }));

        if (toInsert.length === 0) {
            this.logger.log('Languages already seeded, nothing to do.');
            return;
        }

        try {
            await this.repo.save(toInsert);
            this.logger.log(`Seeded ${toInsert.length} language(s).`);
        } catch (err) {
            this.logger.error('Failed to seed languages', err as Error);
        }
    }
}