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
      const isUsd = url.includes('/USD');
      const date = new URL(url).searchParams.get('date');
      const usdHistory: Record<string, number> = {
        '2026-08-03': 1.13,
        '2026-08-10': 1.14,
        '2026-08-17': 1.15,
        '2026-08-24': 1.16,
      };
      const gbpHistory: Record<string, number> = {
        '2026-08-03': 0.9,
        '2026-08-10': 0.89,
        '2026-08-17': 0.88,
        '2026-08-24': 0.87,
      };
      const rate = date
        ? isUsd
          ? usdHistory[date]
          : gbpHistory[date]
        : isUsd
          ? 1.17
          : 0.86;
      return new Response(JSON.stringify({ date: date ?? '2026-08-31', rate }));
    });

    await expect(service.getPopularRates('eur-id')).resolves.toEqual([
      {
        currencyId: 'usd-id',
        currencyCode: 'USD',
        label: 'USD',
        badgeText: '$',
        conversionText: '1 EUR = 1.17 USD',
        rate: 1.17,
        changePercent: 0.8621,
        rateHistory: [1.13, 1.14, 1.15, 1.16, 1.17],
      },
      {
        currencyId: 'gbp-id',
        currencyCode: 'GBP',
        label: 'GBP',
        badgeText: '£',
        conversionText: '1 EUR = 0.86 GBP',
        rate: 0.86,
        changePercent: -1.1494,
        rateHistory: [0.9, 0.89, 0.88, 0.87, 0.86],
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/rate/EUR/USD'),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/rate/EUR/GBP'),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/rate/EUR/USD?date=2026-08-24'),
    );
  });

  it('rejects users without a configured home currency', async () => {
    await expect(service.getPopularRates('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
