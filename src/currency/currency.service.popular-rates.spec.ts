import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CurrencyService } from './currency.service';
import { Currency } from './entities/currency.entity';

describe('CurrencyService popular rates', () => {
  let service: CurrencyService;
  let repository: jest.Mocked<Pick<Repository<Currency>, 'find' | 'findOne'>>;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: getRepositoryToken(Currency), useValue: repository },
      ],
    }).compile();

    service = module.get(CurrencyService);
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns popular rates based on the user's configured currency", async () => {
    repository.findOne.mockResolvedValue({
      id: 'eur-id',
      code: 'EUR',
      name: 'Euro',
    } as Currency);
    repository.find.mockResolvedValue([
      { id: 'usd-id', code: 'USD', name: 'US Dollar' },
      { id: 'gbp-id', code: 'GBP', name: 'British Pound' },
    ] as Currency[]);
    jest.mocked(fetch).mockImplementation(async (input) => {
      const url = input.toString();
      const rate = url.endsWith('/USD') ? 1.17 : 0.86;
      return new Response(JSON.stringify({ rate }));
    });

    await expect(service.getPopularRates('eur-id')).resolves.toEqual([
      {
        currencyId: 'usd-id',
        currencyCode: 'USD',
        label: 'USD',
        badgeText: '$',
        conversionText: '1 EUR = 1.17 USD',
        rate: 1.17,
        changePercent: 0,
        rateHistory: [1.17, 1.17, 1.17, 1.17, 1.17],
      },
      {
        currencyId: 'gbp-id',
        currencyCode: 'GBP',
        label: 'GBP',
        badgeText: '£',
        conversionText: '1 EUR = 0.86 GBP',
        rate: 0.86,
        changePercent: 0,
        rateHistory: [0.86, 0.86, 0.86, 0.86, 0.86],
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/rate/EUR/USD'),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/rate/EUR/GBP'),
    );
  });

  it('rejects users without a configured home currency', async () => {
    await expect(service.getPopularRates('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
