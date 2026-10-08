import { EcoUserRank, KazakhstanCity } from '../types';

export function getLeaderboardForCity(city: KazakhstanCity, currentUserEco: number, walletShort?: string): EcoUserRank[] {
  const cityShort = city.name.slice(0, 3);
  
  const baseUsers: EcoUserRank[] = [
    {
      rank: 1,
      name: `Арман Эко-${cityShort}`,
      walletShort: '8xK2...4vNp',
      trashKg: 184,
      treesPlanted: 16,
      earnedEco: 1420,
      avatarSeed: 'arman',
    },
    {
      rank: 2,
      name: 'Динара Taza Alem',
      walletShort: '3mY7...9zQw',
      trashKg: 142,
      treesPlanted: 11,
      earnedEco: 1150,
      avatarSeed: 'dinara',
    },
    {
      rank: 3,
      name: 'Нурлан Жасыл',
      walletShort: '7jP1...3bRt',
      trashKg: 98,
      treesPlanted: 9,
      earnedEco: 890,
      avatarSeed: 'nurlan',
    },
    {
      rank: 4,
      name: 'Айгерим GreenHero',
      walletShort: '2sV8...6xMn',
      trashKg: 65,
      treesPlanted: 5,
      earnedEco: 540,
      avatarSeed: 'aigerim',
    },
    {
      rank: 5,
      name: 'Бауржан Эко-Патруль',
      walletShort: '5wL4...8tKp',
      trashKg: 46,
      treesPlanted: 4,
      earnedEco: 380,
      avatarSeed: 'baurzhan',
    },
  ];

  // Insert current user rank dynamically based on their ECO points
  const userRank: EcoUserRank = {
    rank: 6,
    name: 'Вы (Эко-Активист)',
    walletShort: walletShort || 'Гость',
    trashKg: Math.floor(currentUserEco * 0.45),
    treesPlanted: Math.floor(currentUserEco / 70),
    earnedEco: currentUserEco,
    avatarSeed: 'current_user',
    isCurrentUser: true,
  };

  const list = [...baseUsers, userRank].sort((a, b) => b.earnedEco - a.earnedEco);
  return list.map((user, idx) => ({ ...user, rank: idx + 1 }));
}
