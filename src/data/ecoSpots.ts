import { EcoSpot, KazakhstanCity } from '../types';

export function getEcoSpotsForCity(city: KazakhstanCity): EcoSpot[] {
  return [
    {
      id: `${city.id}-spot-1`,
      name: `Центральный пункт приёма пластика и алюминия (${city.name})`,
      type: 'recycle_plastic',
      address: `ул. Абая / пр. Республики, сектор 1, г. ${city.name}`,
      schedule: 'Пн-Сб: 09:00 - 19:00',
      accepts: ['ПЭТ-бутылки (1)', 'HDPE-флаконы (2)', 'Алюминиевые банки', 'Крышечки'],
    },
    {
      id: `${city.id}-spot-2`,
      name: `Эко-Хаб «Taza Qala»: комплексная сортировка`,
      type: 'recycle_all',
      address: `ул. Байтұрсынұлы, 48, г. ${city.name}`,
      schedule: 'Ежедневно: 10:00 - 20:00',
      accepts: ['Макулатура', 'Стеклобой', 'Металл', 'Сломанная электроника'],
    },
    {
      id: `${city.id}-spot-3`,
      name: `Городской лесопитомник саженцев и зелёных культур`,
      type: 'nursery_trees',
      address: `Зелёное кольцо, северный выезд из г. ${city.name}`,
      schedule: 'Вт-Вс: 08:30 - 18:00',
      accepts: ['Выдача саженцев волонтёрам', 'Приём компоста', 'Консультации дендролога'],
    },
    {
      id: `${city.id}-spot-4`,
      name: `Контейнер безопасной утилизации батареек и ламп`,
      type: 'eco_box',
      address: `Главный вход ТРЦ / ЦОН г. ${city.name}`,
      schedule: 'Круглосуточно (24/7)',
      accepts: ['Батарейки AA/AAA', 'Аккумуляторы смартфонов', 'Энергосберегающие лампы'],
    },
  ];
}
