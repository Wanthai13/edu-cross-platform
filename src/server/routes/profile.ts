// routes/profile.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserStats from '../models/UserStats';
import Transcript from '../models/Transcript';
import Audio from '../models/AudioFile';
import { StudyMaterial } from '../models/StudyMaterial';
import { ACHIEVEMENTS, checkAchievements, getAchievementById } from '../models/Achievement';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '7kYrFd4mwN1vDe59sdQsaKGmzQ5t5tWlgxr4Dmv0haO';

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Helper to get or create user stats
async function getOrCreateUserStats(userId: string) {
  let stats = await UserStats.findOne({ userId });
  
  if (!stats) {
    // Create new stats document
    stats = new UserStats({ userId });
    
    // Calculate initial stats from existing data
    const transcriptCount = await Transcript.countDocuments({ userId });
    
    // Find StudyMaterials through transcripts and audios
    const userTranscripts = await Transcript.find({ userId }).select('_id');
    const userAudios = await Audio.find({ userId }).select('_id');
    const transcriptIds = userTranscripts.map(t => t._id);
    const audioIds = userAudios.map(a => a._id);
    const studyMaterials = await StudyMaterial.find({ 
      $or: [
        { transcriptId: { $in: transcriptIds } },
        { audioId: { $in: audioIds } }
      ]
    });
    
    let totalFlashcards = 0;
    let totalQuizzes = 0;
    
    studyMaterials.forEach(sm => {
      totalFlashcards += sm.flashcards?.length || 0;
      totalQuizzes += sm.quizzes?.length || 0;
    });
    
    stats.totalSessions = transcriptCount;
    stats.totalFlashcards = totalFlashcards;
    
    // Calculate streak from transcripts
    const transcripts = await Transcript.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);
    
    if (transcripts.length > 0) {
      stats.lastStudyDate = transcripts[0].createdAt;
      
      // Calculate streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      let checkDate = new Date(today);
      
      const dates = transcripts.map(t => {
        const d = new Date(t.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      const uniqueDates = [...new Set(dates)];
      
      for (let i = 0; i < 30; i++) {
        if (uniqueDates.includes(checkDate.getTime())) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i > 0) {
          break;
        } else {
          // Check if studied yesterday
          checkDate.setDate(checkDate.getDate() - 1);
          if (uniqueDates.includes(checkDate.getTime())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      
      stats.currentStreak = streak;
      stats.longestStreak = streak;
      
      // Calculate weekly progress
      const weekProgress = [0, 0, 0, 0, 0, 0, 0];
      transcripts.forEach(t => {
        const dayDiff = Math.floor((today.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 7) {
          weekProgress[6 - dayDiff] += 30; // Estimate 30 min per session
        }
      });
      stats.weeklyProgress = weekProgress;
      
      // Calculate XP
      stats.xp = transcriptCount * 25 + totalFlashcards * 5;
      stats.level = Math.floor(Math.sqrt(stats.xp / 100)) + 1;
    }
    
    // Check for achievements
    const newAchievements = checkAchievements(stats);
    stats.achievements = newAchievements;
    
    await stats.save();
  }
  
  return stats;
}

// ---------------- GET PROFILE STATS ----------------
router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const stats = await getOrCreateUserStats(userId);
    
    // Get additional calculated stats
    const transcriptCount = await Transcript.countDocuments({ userId });
    
    // Calculate study time from transcripts (estimate)
    const transcripts = await Transcript.find({ userId });
    let totalStudyTime = 0;
    transcripts.forEach(t => {
      // Estimate based on transcript length or duration
      totalStudyTime += (t as any).duration || 10; // Default 10 min if no duration
    });
    
    // Update stats with latest data
    stats.totalSessions = transcriptCount;
    stats.totalStudyTime = totalStudyTime;
    
    // Check for new achievements
    const newAchievements = checkAchievements(stats);
    let xpGained = 0;
    
    newAchievements.forEach(achId => {
      if (!stats.achievements.includes(achId)) {
        stats.achievements.push(achId);
        const ach = getAchievementById(achId);
        if (ach) xpGained += ach.xpReward;
      }
    });
    
    if (xpGained > 0) {
      stats.xp += xpGained;
      stats.level = Math.floor(Math.sqrt(stats.xp / 100)) + 1;
    }
    
    await stats.save();
    
    res.json({
      success: true,
      stats: {
        totalSessions: stats.totalSessions,
        totalStudyTime: stats.totalStudyTime,
        totalFlashcards: stats.totalFlashcards,
        flashcardsMastered: stats.flashcardsMastered,
        quizzesTaken: stats.quizzesTaken,
        quizAccuracy: stats.quizzesTaken > 0 
          ? Math.round((stats.quizCorrectAnswers / (stats.quizzesTaken * 10)) * 100) 
          : 0,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        weeklyProgress: stats.weeklyProgress,
        xp: stats.xp,
        level: stats.level,
        xpToNextLevel: Math.pow(stats.level, 2) * 100 - stats.xp
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- GET ACHIEVEMENTS ----------------
router.get('/achievements', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const stats = await getOrCreateUserStats(userId);
    
    // Map achievements with earned status
    const achievementsWithStatus = ACHIEVEMENTS.map(ach => ({
      ...ach,
      earned: stats.achievements.includes(ach.id),
      earnedAt: stats.achievements.includes(ach.id) ? stats.updatedAt : null
    }));
    
    res.json({
      success: true,
      achievements: achievementsWithStatus,
      earnedCount: stats.achievements.length,
      totalCount: ACHIEVEMENTS.length
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- GET SETTINGS ----------------
router.get('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const stats = await getOrCreateUserStats(userId);
    
    res.json({
      success: true,
      settings: stats.settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- UPDATE SETTINGS ----------------
router.patch('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const { language, darkMode, notifications, audioQuality, dailyGoal } = req.body;
    
    const stats = await getOrCreateUserStats(userId);
    
    if (language !== undefined) stats.settings.language = language;
    if (darkMode !== undefined) stats.settings.darkMode = darkMode;
    if (notifications !== undefined) stats.settings.notifications = notifications;
    if (audioQuality !== undefined) stats.settings.audioQuality = audioQuality;
    if (dailyGoal !== undefined) stats.settings.dailyGoal = dailyGoal;
    
    stats.updatedAt = new Date();
    await stats.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: stats.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- RECORD STUDY ACTIVITY ----------------
router.post('/activity', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const { type, duration, flashcardsStudied, quizScore, quizTotal } = req.body;
    
    const stats = await getOrCreateUserStats(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update streak
    if (stats.lastStudyDate) {
      const lastStudy = new Date(stats.lastStudyDate);
      lastStudy.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, no streak update needed
      } else if (daysDiff === 1) {
        // Consecutive day
        stats.currentStreak += 1;
        if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak;
        }
      } else {
        // Streak broken
        stats.currentStreak = 1;
      }
    } else {
      stats.currentStreak = 1;
    }
    
    stats.lastStudyDate = new Date();
    
    // Update weekly progress
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    stats.weeklyProgress[adjustedDay] += duration || 0;
    
    // Update other stats
    if (duration) {
      stats.totalStudyTime += duration;
    }
    
    if (flashcardsStudied) {
      stats.totalFlashcards += flashcardsStudied;
    }
    
    if (quizTotal) {
      stats.quizzesTaken += 1;
      stats.quizCorrectAnswers += quizScore || 0;
    }
    
    // Add XP
    let xpGained = 0;
    if (duration) xpGained += Math.floor(duration / 5) * 5; // 5 XP per 5 minutes
    if (flashcardsStudied) xpGained += flashcardsStudied * 2; // 2 XP per flashcard
    if (quizScore) xpGained += quizScore * 5; // 5 XP per correct answer
    
    stats.xp += xpGained;
    stats.level = Math.floor(Math.sqrt(stats.xp / 100)) + 1;
    
    // Check for new achievements
    const newAchievements = checkAchievements(stats);
    const earnedAchievements: any[] = [];
    
    newAchievements.forEach(achId => {
      if (!stats.achievements.includes(achId)) {
        stats.achievements.push(achId);
        const ach = getAchievementById(achId);
        if (ach) {
          stats.xp += ach.xpReward;
          earnedAchievements.push(ach);
        }
      }
    });
    
    stats.updatedAt = new Date();
    await stats.save();
    
    res.json({
      success: true,
      message: 'Activity recorded',
      xpGained,
      newLevel: stats.level,
      earnedAchievements,
      currentStreak: stats.currentStreak
    });
  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- GET DAILY PROGRESS ----------------
router.get('/daily-progress', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const stats = await getOrCreateUserStats(userId);
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const todayProgress = stats.weeklyProgress[adjustedDay] || 0;
    const dailyGoal = stats.settings.dailyGoal || 30;
    
    res.json({
      success: true,
      progress: {
        current: todayProgress,
        goal: dailyGoal,
        percentage: Math.min(100, Math.round((todayProgress / dailyGoal) * 100)),
        completed: todayProgress >= dailyGoal
      }
    });
  } catch (error) {
    console.error('Get daily progress error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------- CLEAR CACHE / RESET WEEKLY ----------------
router.post('/reset-weekly', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user._id;
    const stats = await getOrCreateUserStats(userId);
    
    stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
    stats.updatedAt = new Date();
    await stats.save();
    
    res.json({
      success: true,
      message: 'Weekly progress reset'
    });
  } catch (error) {
    console.error('Reset weekly error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;

