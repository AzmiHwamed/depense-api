import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async findAll(): Promise<Country[]> {
    return this.countryRepository.find();
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countryRepository.findOne({ where: { id } });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    const country = this.countryRepository.create(dto);
    return this.countryRepository.save(country);
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    await this.countryRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const country = await this.findOne(id);
    await this.countryRepository.remove(country);
  }
}