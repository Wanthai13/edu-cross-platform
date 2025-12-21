// models/Achievement.ts
import mongoose from 'mongoose';

export interface IAchievement {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: string;
  category: 'streak' | 'study' | 'quiz' | 'flashcard' | 'milestone';
  requirement: number;
  xpReward: number;
}

// Predefined achievements
export const ACHIEVEMENTS: IAchievement[] = [
  // Streak achievements
  {
    id: 'streak_3',
    name: '3-Day Streak',
    nameVi: 'Chuỗi 3 ngày',
    description: 'Study for 3 consecutive days',
    descriptionVi: 'Học liên tục 3 ngày',
    icon: '🔥',
    category: 'streak',
    requirement: 3,
    xpReward: 50
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    nameVi: 'Chiến binh tuần',
    description: 'Study for 7 consecutive days',
    descriptionVi: 'Học liên tục 7 ngày',
    icon: '🏆',
    category: 'streak',
    requirement: 7,
    xpReward: 100
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    nameVi: 'Bậc thầy tháng',
    description: 'Study for 30 consecutive days',
    descriptionVi: 'Học liên tục 30 ngày',
    icon: '👑',
    category: 'streak',
    requirement: 30,
    xpReward: 500
  },
  
  // Session achievements
  {
    id: 'sessions_1',
    name: 'First Step',
    nameVi: 'Bước đầu tiên',
    description: 'Complete your first session',
    descriptionVi: 'Hoàn thành phiên đầu tiên',
    icon: '🎯',
    category: 'milestone',
    requirement: 1,
    xpReward: 25
  },
  {
    id: 'sessions_10',
    name: 'Getting Started',
    nameVi: 'Khởi đầu',
    description: 'Complete 10 sessions',
    descriptionVi: 'Hoàn thành 10 phiên',
    icon: '📚',
    category: 'study',
    requirement: 10,
    xpReward: 100
  },
  {
    id: 'sessions_50',
    name: 'Dedicated Learner',
    nameVi: 'Người học tận tâm',
    description: 'Complete 50 sessions',
    descriptionVi: 'Hoàn thành 50 phiên',
    icon: '⭐',
    category: 'study',
    requirement: 50,
    xpReward: 300
  },
  {
    id: 'sessions_100',
    name: 'Study Expert',
    nameVi: 'Chuyên gia học tập',
    description: 'Complete 100 sessions',
    descriptionVi: 'Hoàn thành 100 phiên',
    icon: '🎓',
    category: 'study',
    requirement: 100,
    xpReward: 500
  },
  
  // Flashcard achievements
  {
    id: 'flashcards_50',
    name: 'Card Collector',
    nameVi: 'Nhà sưu tập thẻ',
    description: 'Study 50 flashcards',
    descriptionVi: 'Học 50 flashcards',
    icon: '🃏',
    category: 'flashcard',
    requirement: 50,
    xpReward: 75
  },
  {
    id: 'flashcards_200',
    name: 'Memory Champion',
    nameVi: 'Nhà vô địch trí nhớ',
    description: 'Study 200 flashcards',
    descriptionVi: 'Học 200 flashcards',
    icon: '🧠',
    category: 'flashcard',
    requirement: 200,
    xpReward: 200
  },
  {
    id: 'flashcards_500',
    name: 'Flashcard Master',
    nameVi: 'Bậc thầy Flashcard',
    description: 'Study 500 flashcards',
    descriptionVi: 'Học 500 flashcards',
    icon: '💎',
    category: 'flashcard',
    requirement: 500,
    xpReward: 400
  },
  
  // Quiz achievements
  {
    id: 'quiz_perfect',
    name: 'Perfect Score',
    nameVi: 'Điểm tuyệt đối',
    description: 'Get 100% on a quiz',
    descriptionVi: 'Đạt 100% bài quiz',
    icon: '💯',
    category: 'quiz',
    requirement: 100,
    xpReward: 50
  },
  {
    id: 'quiz_10',
    name: 'Quiz Taker',
    nameVi: 'Người làm quiz',
    description: 'Complete 10 quizzes',
    descriptionVi: 'Hoàn thành 10 bài quiz',
    icon: '✅',
    category: 'quiz',
    requirement: 10,
    xpReward: 100
  },
  {
    id: 'quiz_accuracy_80',
    name: 'High Achiever',
    nameVi: 'Người đạt cao',
    description: 'Maintain 80%+ quiz accuracy',
    descriptionVi: 'Duy trì độ chính xác 80%+',
    icon: '🎯',
    category: 'quiz',
    requirement: 80,
    xpReward: 150
  },
  
  // Study time achievements
  {
    id: 'time_60',
    name: 'Hour Power',
    nameVi: 'Sức mạnh giờ',
    description: 'Study for 1 hour total',
    descriptionVi: 'Học tổng cộng 1 giờ',
    icon: '⏱️',
    category: 'study',
    requirement: 60,
    xpReward: 50
  },
  {
    id: 'time_600',
    name: 'Ten Hour Club',
    nameVi: 'Câu lạc bộ 10 giờ',
    description: 'Study for 10 hours total',
    descriptionVi: 'Học tổng cộng 10 giờ',
    icon: '🕐',
    category: 'study',
    requirement: 600,
    xpReward: 200
  },
  {
    id: 'time_3000',
    name: 'Fifty Hour Legend',
    nameVi: 'Huyền thoại 50 giờ',
    description: 'Study for 50 hours total',
    descriptionVi: 'Học tổng cộng 50 giờ',
    icon: '🌟',
    category: 'study',
    requirement: 3000,
    xpReward: 500
  }
];

// Helper function to check achievements
export function checkAchievements(stats: any): string[] {
  const newAchievements: string[] = [];
  const existingAchievements = stats.achievements || [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (existingAchievements.includes(achievement.id)) return;
    
    let earned = false;
    
    switch (achievement.category) {
      case 'streak':
        earned = stats.currentStreak >= achievement.requirement || 
                 stats.longestStreak >= achievement.requirement;
        break;
      case 'study':
        if (achievement.id.startsWith('sessions_')) {
          earned = stats.totalSessions >= achievement.requirement;
        } else if (achievement.id.startsWith('time_')) {
          earned = stats.totalStudyTime >= achievement.requirement;
        }
        break;
      case 'flashcard':
        earned = stats.totalFlashcards >= achievement.requirement;
        break;
      case 'quiz':
        if (achievement.id === 'quiz_10') {
          earned = stats.quizzesTaken >= achievement.requirement;
        } else if (achievement.id === 'quiz_accuracy_80') {
          const accuracy = stats.quizzesTaken > 0 
            ? (stats.quizCorrectAnswers / stats.quizzesTaken) * 100 
            : 0;
          earned = accuracy >= achievement.requirement && stats.quizzesTaken >= 5;
        }
        break;
      case 'milestone':
        if (achievement.id === 'sessions_1') {
          earned = stats.totalSessions >= 1;
        }
        break;
    }
    
    if (earned) {
      newAchievements.push(achievement.id);
    }
  });
  
  return newAchievements;
}

export function getAchievementById(id: string): IAchievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

