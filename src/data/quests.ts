import { EcoQuest, KazakhstanCity } from '../types';

interface CityLandmarks {
  [cityId: string]: {
    riverOrLake: string;
    centralPark: string;
    suburbanArea: string;
    greenBelt: string;
  };
}

const CITY_LANDMARKS: CityLandmarks = {
  almaty: {
    riverOrLake: 'Озеро Сайран и русло реки Большая Алматинка',
    centralPark: 'Роща Баума и Центральный парк культуры',
    suburbanArea: 'Пешеходная тропа Терренкур и урочище Медеу',
    greenBelt: 'Парк Первого Президента и предгорья Заилийского Алатау',
  },
  astana: {
    riverOrLake: 'Набережная реки Есиль и гребной канал',
    centralPark: 'Триатлон парк и Ботанический сад',
    suburbanArea: 'Парк «Жеруйык» и район EXPO',
    greenBelt: 'Зелёный пояс Астаны (Юго-Западный сектор)',
  },
  shymkent: {
    riverOrLake: 'Набережная реки Кошкар-Ата',
    centralPark: 'Шымкентский государственный Дендропарк',
    suburbanArea: 'Парк Абая и зона озера Тулпар',
    greenBelt: 'Эко-зона Бозарык и северный лесопитомник',
  },
  karaganda: {
    riverOrLake: 'Береговая линия Федоровского водохранилища',
    centralPark: 'Центральный парк культуры и отдыха им. 30-летия ВЛКСМ',
    suburbanArea: 'Лесопосадки района Юго-Восток',
    greenBelt: 'Сквер Победы и защитная лесополоса Майкудука',
  },
  aktobe: {
    riverOrLake: 'Прибрежная зона реки Илек',
    centralPark: 'Парк Первого Президента и сквер Шахмат',
    suburbanArea: 'Триатлон-парк в 11-м микрорайоне',
    greenBelt: 'Лесополоса в районе Богословской трассы',
  },
  taraz: {
    riverOrLake: 'Берег реки Талас и канал Карасу',
    centralPark: 'Парк Победы и аллея «Желтоксан»',
    suburbanArea: 'Зона Майской рощи',
    greenBelt: 'Сквер Т. Рыскулова и предгорный пояс',
  },
  pavlodar: {
    riverOrLake: 'Набережная реки Иртыш и Гусиный перелёт',
    centralPark: 'Городской сад и парк Гагарина',
    suburbanArea: 'Усольский микрорайон и пойменные рощи',
    greenBelt: 'Защитные зелёные посадки Северной промзоны',
  },
  oskemen: {
    riverOrLake: 'Слияние рек Ульба и Иртыш',
    centralPark: 'Парк «Жастар» и остров Комсомольский',
    suburbanArea: 'Левобережный экопарк и гора Государственного флага',
    greenBelt: 'Горно-лесной массив Аблакетки',
  },
  atyrau: {
    riverOrLake: 'Обе стороны набережной реки Жайык (Урал)',
    centralPark: 'Ретро-парк и парк Победы',
    suburbanArea: 'Микрорайон Нурсая и Алмагуль',
    greenBelt: 'Санитарно-защитная лесополоса вокруг города',
  },
  aktau: {
    riverOrLake: 'Прибрежная скалистая полоса Каспийского моря (4А и 14 мкр)',
    centralPark: 'Ботанический сад и парк Акбота',
    suburbanArea: 'Сквер «Толкын» и приморский бульвар',
    greenBelt: 'Озеленительный пояс вдоль трассы в аэропорт',
  },
  semey: {
    riverOrLake: 'Остров Полковничий и берега Иртыша',
    centralPark: 'Центральный сквер и парк Победы',
    suburbanArea: 'Сосновый бор Прииртышья',
    greenBelt: 'Реликтовый сосновый бор левобережья',
  },
};

export function getQuestsForCity(city: KazakhstanCity): EcoQuest[] {
  const landmarks = CITY_LANDMARKS[city.id] || {
    riverOrLake: `Прибрежная зона и водоёмы города ${city.name}`,
    centralPark: `Центральный городской парк культуры (${city.name})`,
    suburbanArea: `Жилые микрорайоны и аллеи (${city.name})`,
    greenBelt: `Озеленительный пояс и лесопитомник (${city.name})`,
  };

  return [
    {
      id: `${city.id}-quest-1`,
      title: 'Очистка парковой зоны',
      description: `Сбор и сортировка пластика, пакетов и жестяных банок в парковой зоне. Сделайте фото До и После уборки с собранными мешками для верификации ИИ.`,
      category: 'trash',
      rewardEco: 30,
      locationName: landmarks.centralPark,
      difficulty: 'Легко',
      impactMetric: '≥ 3 кг отходов',
      participantsCount: 56,
      deadlineDays: 5,
      iconType: 'trash',
    },
    {
      id: `${city.id}-quest-2`,
      title: 'Посадка саженца яблони/карагача',
      description: `Посадите дерево (саженец яблони Недзвецкого, карагача или ясеня) с подвязкой и лункой для полива. Загрузите фото места до посадки и молодого деревца после.`,
      category: 'trees',
      rewardEco: 100,
      locationName: landmarks.greenBelt,
      difficulty: 'Хард',
      impactMetric: '1 саженец с поливом',
      participantsCount: 24,
      deadlineDays: 14,
      iconType: 'tree',
    },
    {
      id: `${city.id}-quest-3`,
      title: 'Большой субботник: очистка береговой зоны',
      description: `Сбор пластика, стекла и жестяных банок вдоль водоёма. Соберите от 5 кг отходов, сфотографируйте результат "До/После" или мешки на весах для одобрения ИИ.`,
      category: 'trash',
      rewardEco: 50,
      locationName: landmarks.riverOrLake,
      difficulty: 'Легко',
      impactMetric: '≥ 5 кг пластика/ТБО',
      participantsCount: 42,
      deadlineDays: 4,
      iconType: 'trash',
    },
    {
      id: `${city.id}-quest-3`,
      title: 'Раздельный сбор: ПЭТ-бутылки и крышечки',
      description: `Отсортируйте чистый пластик (PET 1, HDPE 2) и сдайте в любой эко-бокс или пункт приёма. ИИ распознаёт объём и тип полимеров по фото.`,
      category: 'trash',
      rewardEco: 50,
      locationName: landmarks.centralPark,
      difficulty: 'Легко',
      impactMetric: 'от 30 ПЭТ-бутылок',
      participantsCount: 68,
      deadlineDays: 6,
      iconType: 'trash',
    },
    {
      id: `${city.id}-quest-4`,
      title: 'Эко-патруль: фиксация и ликвидация микросвалки',
      description: `Найдите несанкционированное скопление мусора в черте города, ликвидируйте его с командой или загрузите геометку с отчётом очистки в эко-патруль.`,
      category: 'patrol',
      rewardEco: 110,
      locationName: landmarks.suburbanArea,
      difficulty: 'Средне',
      impactMetric: 'Ликвидированный очаг отходов',
      participantsCount: 27,
      deadlineDays: 8,
      iconType: 'patrol',
    },
    {
      id: `${city.id}-quest-5`,
      title: 'Полив и уход за молодыми саженцами',
      description: `Обеспечьте прикорневой полив (не менее 20 литров) молодым деревьям первого года посадки в засушливый период. Загрузите подтверждающее фото.`,
      category: 'trees',
      rewardEco: 65,
      locationName: landmarks.centralPark,
      difficulty: 'Легко',
      impactMetric: '3 политых дерева',
      participantsCount: 31,
      deadlineDays: 3,
      iconType: 'tree',
    },
    {
      id: `${city.id}-quest-6`,
      title: 'Сбор макулатуры и картонных коробок',
      description: `Соберите сухой картон и бумагу весом от 10 кг для передачи на переработку местным переработчикам вторсырья.`,
      category: 'trash',
      rewardEco: 70,
      locationName: `Эко-пункты г. ${city.name}`,
      difficulty: 'Средне',
      impactMetric: '10+ кг макулатуры',
      participantsCount: 15,
      deadlineDays: 7,
      iconType: 'trash',
    },
  ];
}
