import { KazakhstanCity } from '../types';

export const KAZAKHSTAN_CITIES: KazakhstanCity[] = [
  { id: 'almaty', name: 'Алматы', nameKz: 'Алматы', region: 'Город республиканского значения', lat: 43.2389, lng: 76.8897 },
  { id: 'astana', name: 'Астана', nameKz: 'Астана', region: 'Столица', lat: 51.1694, lng: 71.4491 },
  { id: 'shymkent', name: 'Шымкент', nameKz: 'Шымкент', region: 'Город республиканского значения', lat: 42.3417, lng: 69.5901 },
  { id: 'aktobe', name: 'Актобе', nameKz: 'Ақтөбе', region: 'Актюбинская область', lat: 50.2839, lng: 57.1670 },
  { id: 'karaganda', name: 'Караганда', nameKz: 'Қарағанды', region: 'Карагандинская область', lat: 49.8047, lng: 73.1094 },
  { id: 'taraz', name: 'Тараз', nameKz: 'Тараз', region: 'Жамбылская область', lat: 42.9000, lng: 71.3667 },
  { id: 'pavlodar', name: 'Павлодар', nameKz: 'Павлодар', region: 'Павлодарская область', lat: 52.2873, lng: 76.9674 },
  { id: 'oskemen', name: 'Усть-Каменогорск', nameKz: 'Өскемен', region: 'Восточно-Казахстанская область', lat: 49.9500, lng: 82.6167 },
  { id: 'semey', name: 'Семей', nameKz: 'Семей', region: 'Абайская область', lat: 50.4111, lng: 80.2275 },
  { id: 'atyrau', name: 'Атырау', nameKz: 'Атырау', region: 'Атырауская область', lat: 47.1167, lng: 51.8833 },
  { id: 'kostanay', name: 'Костанай', nameKz: 'Қостанай', region: 'Костанайская область', lat: 53.2144, lng: 63.6246 },
  { id: 'kyzylorda', name: 'Кызылорда', nameKz: 'Қызылорда', region: 'Кызылординская область', lat: 44.8528, lng: 65.5092 },
  { id: 'oral', name: 'Уральск', nameKz: 'Орал', region: 'Западно-Казахстанская область', lat: 51.2333, lng: 51.3667 },
  { id: 'petropavl', name: 'Петропавловск', nameKz: 'Петропавл', region: 'Северо-Казахстанская область', lat: 54.8753, lng: 69.1628 },
  { id: 'aktau', name: 'Актау', nameKz: 'Ақтау', region: 'Мангистауская область', lat: 43.6500, lng: 51.1667 },
  { id: 'temirtau', name: 'Темиртау', nameKz: 'Теміртау', region: 'Карагандинская область', lat: 50.0547, lng: 72.9644 },
  { id: 'turkistan', name: 'Туркестан', nameKz: 'Түркістан', region: 'Туркестанская область', lat: 43.2974, lng: 68.2519 },
  { id: 'kokshetau', name: 'Кокшетау', nameKz: 'Көкшетау', region: 'Акмолинская область', lat: 53.2833, lng: 69.3833 },
  { id: 'taldykorgan', name: 'Талдыкорган', nameKz: 'Талдықорған', region: 'Жетысуская область', lat: 45.0167, lng: 78.3667 },
  { id: 'ekibastuz', name: 'Экибастуз', nameKz: 'Екібастұз', region: 'Павлодарская область', lat: 51.7236, lng: 75.3228 },
  { id: 'zhanaozen', name: 'Жанаозен', nameKz: 'Жаңаөзен', region: 'Мангистауская область', lat: 43.3411, lng: 52.8617 },
  { id: 'rudny', name: 'Рудный', nameKz: 'Рудный', region: 'Костанайская область', lat: 52.9628, lng: 63.1311 },
  { id: 'konaev', name: 'Конаев', nameKz: 'Қонаев', region: 'Алматинская область', lat: 43.8767, lng: 77.0694 },
  { id: 'balkhash', name: 'Балхаш', nameKz: 'Балқаш', region: 'Карагандинская область', lat: 46.8481, lng: 74.9950 },
  { id: 'zhezkazgan', name: 'Жезказган', nameKz: 'Жезқазған', region: 'Улытауская область', lat: 47.7833, lng: 67.7667 },
  { id: 'satbayev', name: 'Сатпаев', nameKz: 'Сәтбаев', region: 'Улытауская область', lat: 47.9000, lng: 67.5333 },
  { id: 'kaskelen', name: 'Каскелен', nameKz: 'Қаскелең', region: 'Алматинская область', lat: 43.1994, lng: 76.6214 },
  { id: 'kulsary', name: 'Кульсары', nameKz: 'Құлсары', region: 'Атырауская область', lat: 46.9833, lng: 54.0167 },
  { id: 'stepnogorsk', name: 'Степногорск', nameKz: 'Степногорск', region: 'Акмолинская область', lat: 52.3500, lng: 71.8833 },
  { id: 'shchuchinsk', name: 'Щучинск', nameKz: 'Щучинск', region: 'Акмолинская область', lat: 52.9333, lng: 70.2000 },
  { id: 'ridder', name: 'Риддер', nameKz: 'Риддер', region: 'Восточно-Казахстанская область', lat: 50.3500, lng: 83.5167 },
  { id: 'baikonur', name: 'Байконур', nameKz: 'Байқоңыр', region: 'Кызылординская область', lat: 45.6167, lng: 63.3167 }
];

// Calculate Haversine distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest Kazakhstan city based on user's GPS coords
export function findClosestCity(lat: number, lng: number): KazakhstanCity {
  let closest = KAZAKHSTAN_CITIES[0];
  let minDistance = Infinity;

  for (const city of KAZAKHSTAN_CITIES) {
    const dist = calculateDistanceKm(lat, lng, city.lat, city.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}
