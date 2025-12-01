import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

type Transcript = {
  id: string;
  title: string;
  duration?: string;
  date?: string;
  score?: number;
};

type Language = 'en' | 'vi';

const UI_TEXT: Record<Language, any> = {
  en: {
    stats: { totalHours: 'Total Hours', avgScore: 'Avg Score', participants: 'Participants', processed: 'Processed' },
    charts: { engagement: 'Engagement', recentSessions: 'Recent Sessions', viewAll: 'View All' },
  },
  vi: {
    stats: { totalHours: 'Tổng giờ', avgScore: 'Điểm trung bình', participants: 'Người tham gia', processed: 'Đã xử lý' },
    charts: { engagement: 'Tương tác', recentSessions: 'Buổi gần đây', viewAll: 'Xem tất cả' },
  },
};

type Props = {
  recentUploads: Transcript[];
  onSelectTranscript: (id: string) => void;
  language?: Language;
  onLogout: () => void; // 🔥 bắt buộc để TS không lỗi

};


export default function Dashboard({ recentUploads, onSelectTranscript, language = 'en',onLogout }: Props) {
  const t = UI_TEXT[language];

  const StatCard = ({ iconName, color, bg, title, value, trend }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        {trend ? (
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={12} color="#10b981" />
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>

         <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
           <Ionicons name="log-out-outline" size={18} color="#ef4444" />
           <Text style={styles.logoutText}>Logout</Text>
         </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.col}>
            <StatCard iconName="flash-outline" color="#4f46e5" bg="#e0e7ff" title={t.stats.totalHours} value="24.5h" trend="+12%" />
          </View>
          <View style={styles.col}>
            <StatCard iconName="trophy-outline" color="#f97316" bg="#ffedd5" title={t.stats.avgScore} value="82/100" trend="+5%" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <StatCard iconName="people-outline" color="#2563eb" bg="#dbeafe" title={t.stats.participants} value="142" />
          </View>
          <View style={styles.col}>
            <StatCard iconName="time-outline" color="#9333ea" bg="#f3e8ff" title={t.stats.processed} value="4" trend="+2" />
          </View>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>{t.charts.engagement}</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="trending-up-outline" size={48} color="#cbd5e1" />
          <Text style={styles.chartPlaceholderText}>Chart requires react-native-chart-kit</Text>
        </View>
      </View>

      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.charts.recentSessions}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>{t.charts.viewAll}</Text>
          </TouchableOpacity>
        </View>

        {recentUploads.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => onSelectTranscript(item.id)} style={styles.recentItem}>
            <View style={styles.recentItemContent}>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.recentMeta}>
                  <View style={styles.badge}>
                    <Ionicons name="time-outline" size={12} color="#64748b" />
                    <Text style={styles.badgeText}>{item.duration ?? ''}</Text>
                  </View>
                  <Text style={styles.dateText}>{item.date ?? ''}</Text>
                </View>
              </View>

              <View style={styles.recentScore}>
                <View style={[styles.scoreBadge, (item.score || 0) > 80 ? styles.scoreHigh : styles.scoreMed]}>
                  <Text style={[styles.scoreText, (item.score || 0) > 80 ? styles.scoreTextHigh : styles.scoreTextMed]}>{item.score ?? 0}%</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 20, paddingBottom: 40 },
  grid: { marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1, paddingHorizontal: 6 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: { padding: 10, borderRadius: 12 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  trendText: { fontSize: 10, fontWeight: 'bold', color: '#10b981' },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  chartSection: { backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  chartPlaceholder: { height: 180, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
  chartPlaceholderText: { marginTop: 8, color: '#94a3b8', fontSize: 12 },
  recentSection: { backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllText: { fontSize: 12, fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' },
  recentItem: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  recentItemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  recentInfo: { flex: 1, marginRight: 10 },
  recentTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  recentMeta: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: '#64748b' },
  dateText: { fontSize: 10, color: '#94a3b8' },
  recentScore: { flexDirection: 'row', alignItems: 'center' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  scoreHigh: { backgroundColor: '#ecfdf5' },
  scoreMed: { backgroundColor: '#fef3c7' },
  scoreText: { fontSize: 11, fontWeight: 'bold' },
  scoreTextHigh: { color: '#047857' },
  scoreTextMed: { color: '#b45309' },
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
},

headerTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#1e293b',
},

logoutBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fee2e2',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 10,
},

logoutText: {
  marginLeft: 4,
  fontSize: 12,
  fontWeight: 'bold',
  color: '#ef4444',
},
});
