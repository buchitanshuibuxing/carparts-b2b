import { useState, useEffect } from 'react';
import api from '@/lib/api';

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'AED', 'SAR', 'RUB', 'JPY'];

const CURRENCY_NAMES: Record<string, string> = {
  USD: '美元', EUR: '欧元', GBP: '英镑', CNY: '人民币',
  AED: '迪拉姆', SAR: '里亚尔', RUB: '卢布', JPY: '日元',
  KRW: '韩元', HKD: '港币', TWD: '新台币', SGD: '新元',
  AUD: '澳元', CAD: '加元', CHF: '瑞士法郎', THB: '泰铢',
  MYR: '林吉特', IDR: '印尼盾', PHP: '比索', VND: '越南盾',
};

export function getCurrencyName(code: string): string {
  return CURRENCY_NAMES[code] || code;
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<string[]>(DEFAULT_CURRENCIES);

  useEffect(() => {
    api.get('/prices/config/types')
      .then(({ data }) => {
        if (data.currencies?.length) {
          setCurrencies(data.currencies);
        }
      })
      .catch(() => {
        api.get('/settings')
          .then(({ data }) => {
            const s = data.data || data || {};
            if (s.currencies) {
              try { setCurrencies(JSON.parse(s.currencies)); } catch {}
            }
          })
          .catch(() => {});
      });
  }, []);

  return currencies;
}
