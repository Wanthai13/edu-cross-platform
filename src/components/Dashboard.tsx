import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

type Session = {
  id: string;
  title: string;
  duration?: string;
  date?: string;
  score?: number;
};

type Stats = {
  totalSessions: number;
  totalFlashcards: number;
  quizAccuracy: number;
  studyStreak: number;
  weeklyProgress: number[];
};

type Props = {
  userName?: string;
  recentSessions: Session[];
  stats: Stats;
  onSelectSession: (id: string) => void;
  onQuickAction: (action: 'record' | 'upload' | 'study') => void;
  onLogout: () => void;
  onViewAllSessions: () => void;
};

function getGreetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getGreetingEmoji(key: 'morning' | 'afternoon' | 'evening'): string {
  const emojis = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
  return emojis[key];
}

function getRandomTipIndex(): number {
  return Math.floor(Math.random() * 6);
}

export default function Dashboard({
  userName = 'bạn',
  recentSessions,
  stats,
  onSelectSession,
  onQuickAction,
  onLogout,
  onViewAllSessions,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const greetingKey = getGreetingKey(new Date().getHours());
  const greetingEmoji = getGreetingEmoji(greetingKey);
  const greetingText = t.dashboard.greeting[greetingKey];
  const tip = t.tips[getRandomTipIndex()];

  const QuickActionButton = ({ icon, label, color, bgColor, action }: any) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: isDark ? colors.surfaceVariant : bgColor, borderColor: colors.border }]}
      onPress={() => onQuickAction(action)}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
        </View>
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, value, label, color, trend }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.statIconBox, { backgroundColor: isDark ? color + '30' : color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {trend && (
        <View style={styles.trendBadge}>
          <Ionicons name="trending-up" size={10} color={colors.success} />
          <Text style={[styles.trendText, { color: colors.success }]}>{trend}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {greetingEmoji} {greetingText}, {userName}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.dashboard.subtitle}</Text>
        </View>
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: isDark ? '#2a1f1f' : '#fef2f2' }]} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
         </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>⚡ {t.dashboard.quickActions}</Text>
        <View style={styles.quickActionsRow}>
          <QuickActionButton
            icon="mic"
            label={t.dashboard.record}
            color={colors.error}
            bgColor="#fef2f2"
            action="record"
          />
          <QuickActionButton
            icon="cloud-upload"
            label={t.dashboard.uploadFile}
            color={colors.info}
            bgColor="#eff6ff"
            action="upload"
          />
          <QuickActionButton
            icon="school"
            label={t.dashboard.studyNow}
            color={colors.primary}
            bgColor="#f5f3ff"
            action="study"
          />
          </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 {t.dashboard.stats}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="documents"
            value={stats.totalSessions}
            label={t.dashboard.sessions}
            color={colors.info}
            trend={stats.totalSessions > 0 ? `+${Math.min(stats.totalSessions, 5)}` : null}
          />
          <StatCard
            icon="albums"
            value={stats.totalFlashcards}
            label={t.dashboard.flashcards}
            color={colors.primary}
          />
          <StatCard
            icon="checkmark-circle"
            value={`${stats.quizAccuracy}%`}
            label={t.dashboard.quiz}
            color="#10b981"
          />
          </View>
        </View>

      {/* Learning Streak */}
      <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.streakHeader}>
          <View style={styles.streakInfo}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={[styles.streakTitle, { color: colors.textSecondary }]}>{t.dashboard.streak}</Text>
              <Text style={[styles.streakValue, { color: colors.text }]}>{stats.studyStreak} {t.dashboard.streakDays}</Text>
            </View>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: isDark ? '#422006' : '#fef3c7' }]}>
            <Text style={styles.streakBadgeText}>
              {stats.studyStreak >= 7 ? '🏆' : stats.studyStreak >= 3 ? '⭐' : '💪'}
            </Text>
          </View>
        </View>
        
        {/* Weekly Progress Bar */}
        <View style={[styles.weeklyProgress, { borderTopColor: colors.borderLight }]}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
            <View key={day} style={styles.dayColumn}>
              <View
                style={[
                  styles.dayBar,
                  {
                    height: Math.max(8, (stats.weeklyProgress[idx] || 0) * 0.4),
                    backgroundColor: stats.weeklyProgress[idx] > 0 ? colors.primary : colors.border,
                  },
                ]}
              />
              <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{day}</Text>
      </View>
          ))}
        </View>
      </View>

      {/* Recent Sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📝 {t.dashboard.recentSessions}</Text>
          <TouchableOpacity onPress={onViewAllSessions}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>{t.dashboard.viewAll} →</Text>
          </TouchableOpacity>
        </View>

        {recentSessions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.dashboard.noSessions}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>{t.dashboard.noSessions}</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => onQuickAction('record')}
            >
              <Ionicons name="mic" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>{t.dashboard.startRecording}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentSessions.slice(0, 5).map((session, idx) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => onSelectSession(session.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.sessionIcon, { backgroundColor: isDark ? '#2d1f4e' : '#f5f3ff' }]}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                  {session.title}
                </Text>
                <View style={styles.sessionMeta}>
                  {session.duration && (
                    <View style={[styles.metaBadge, { backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{session.duration}</Text>
                  </View>
                  )}
                  {session.date && (
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{session.date}</Text>
                  )}
                </View>
              </View>
              {session.score !== undefined && (
                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: session.score >= 80 ? (isDark ? '#052e16' : '#dcfce7') : session.score >= 60 ? (isDark ? '#422006' : '#fef3c7') : (isDark ? '#450a0a' : '#fee2e2') },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreText,
                      { color: session.score >= 80 ? '#166534' : session.score >= 60 ? '#92400e' : '#991b1b' },
                    ]}
                  >
                    {session.score}%
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
              </View>

      {/* Daily Tip */}
      <View style={[styles.tipCard, { backgroundColor: isDark ? '#422006' : '#fef3c7', borderColor: isDark ? '#92400e' : '#fde68a' }]}>
        <Text style={[styles.tipText, { color: isDark ? '#fde68a' : '#92400e' }]}>{tip}</Text>
      </View>

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
  alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
},
  statValue: {
  fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 2,
  },
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  streakTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
  color: '#1e293b',
},
  streakBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadgeText: {
    fontSize: 20,
  },
  weeklyProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayBar: {
    width: 24,
    borderRadius: 4,
    marginBottom: 6,
    minHeight: 8,
  },
  dayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  sessionCard: {
  flexDirection: 'row',
  alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sessionIcon: {
    width: 40,
    height: 40,
  borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  marginLeft: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  scoreText: {
  fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tipCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tipText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
},
});
