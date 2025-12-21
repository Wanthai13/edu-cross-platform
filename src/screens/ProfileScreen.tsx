import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext';
import { authService } from '../services/authService';
import { profileService, UserStats, Achievement, UserSettings } from '../services/profileService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { transcriptEvents } from '../utils/transcriptEvents';

const LEVEL_COLORS = ['#9ca3af', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

function getLevelColor(level: number): string {
  return LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)] || LEVEL_COLORS[0];
}

function getLevelTitle(level: number, t: any): string {
  if (level >= 10) return t.profile.level.master;
  if (level >= 7) return t.profile.level.expert;
  if (level >= 5) return t.profile.level.advanced;
  if (level >= 3) return t.profile.level.intermediate;
  return t.profile.level.beginner;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { logout, user: authUser } = useAuth();
  const { colors, isDark, setTheme } = useTheme();
  const { t, language, setLanguage: setLang } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [earnedCount, setEarnedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  
  // Edit form
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [userData, statsData, achievementsData, settingsData] = await Promise.all([
        authService.getCurrentUser(),
        profileService.getStats(),
        profileService.getAchievements(),
        profileService.getSettings(),
      ]);

      if (userData) {
        setUser(userData);
        setEditUsername(userData.username);
        setEditEmail(userData.email);
      }

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }

      if (achievementsData.success) {
        setAchievements(achievementsData.achievements || []);
        setEarnedCount(achievementsData.earnedCount || 0);
        setTotalCount(achievementsData.totalCount || 0);
      }

      if (settingsData.success && settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Subscribe to transcript events to refresh when new transcript is created
  useEffect(() => {
    console.log('📢 Profile: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 Profile: Received transcript update event, refreshing...');
      // Refresh immediately and also with delay
      loadData();
      setTimeout(() => {
        console.log('📢 Profile: Delayed refresh');
        loadData();
      }, 1000);
    });
    console.log('📢 Profile: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 Profile: Unsubscribing');
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim() || !editEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
        return;
      }

    setSaving(true);
    const result = await authService.updateProfile({
      username: editUsername.trim(),
      email: editEmail.trim(),
    });

    if (result.success) {
      setUser(result.user);
      setShowEditModal(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } else {
      Alert.alert('Lỗi', result.message || 'Không thể cập nhật');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
        return;
      }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
        return;
      }

        if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
          return;
      }

      setSaving(true);
    const result = await authService.updateProfile({
      username: user.username,
      email: user.email,
      currentPassword,
      newPassword,
    });

      if (result.success) {
      setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      Alert.alert('Thành công', 'Đã đổi mật khẩu');
      } else {
      Alert.alert('Lỗi', result.message || 'Không thể đổi mật khẩu');
      }
      setSaving(false);
  };

  const handleToggleSetting = async (key: keyof UserSettings, value: any) => {
    console.log('[ProfileScreen] handleToggleSetting called:', key, value);
    
    // Handle theme toggle using context - always works, even without server settings
    if (key === 'darkMode') {
      console.log('[ProfileScreen] Setting theme to:', value ? 'dark' : 'light');
      setTheme(value ? 'dark' : 'light');
    }
    
    // Handle language toggle using context - always works, even without server settings
    if (key === 'language') {
      console.log('[ProfileScreen] Setting language to:', value);
      setLang(value as 'vi' | 'en');
    }

    // Update local state if settings exist
    if (settings) {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
    }

    // Try to save to server (non-blocking)
    try {
      await profileService.updateSettings({ [key]: value });
    } catch (e) {
      console.log('Failed to save setting to server:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
              await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const xpProgress = stats ? (stats.xp / (stats.xp + stats.xpToNextLevel)) * 100 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header / Avatar Section */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { borderColor: getLevelColor(stats?.level || 1), backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(stats?.level || 1) }]}>
            <Text style={styles.levelBadgeText}>Lv.{stats?.level || 1}</Text>
          </View>
        </View>

        <Text style={[styles.username, { color: colors.text }]}>{user?.username || 'Người dùng'}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        
        <View style={styles.levelInfo}>
          <Text style={[styles.levelTitle, { color: colors.textSecondary }]}>
            🏆 {getLevelTitle(stats?.level || 1, t)} • {stats?.xp || 0} XP
          </Text>
          <View style={[styles.xpBarContainer, { backgroundColor: colors.border }]}>
            <View style={[styles.xpBar, { width: `${xpProgress}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.textMuted }]}>
            {stats?.xpToNextLevel || 100} {t.profile.xpToNext}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 {t.profile.stats}</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
              <Ionicons name="documents" size={20} color={colors.info} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalSessions || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.dashboard.sessions}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#2d1f4e' : '#f5f3ff' }]}>
              <Ionicons name="time" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.round((stats?.totalStudyTime || 0) / 60 * 10) / 10}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.profile.studyTime}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#422006' : '#fef3c7' }]}>
              <Ionicons name="flame" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.currentStreak || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#052e16' : '#ecfdf5' }]}>
              <Ionicons name="albums" size={20} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalFlashcards || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.dashboard.flashcards}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.error} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.quizAccuracy || 0}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.dashboard.quiz}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="trophy" size={20} color="#22c55e" />
            </View>
            <Text style={styles.statValue}>{stats?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Kỷ lục</Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <TouchableOpacity 
        style={styles.achievementCard}
        onPress={() => setShowAchievementsModal(true)}
      >
        <View style={styles.achievementHeader}>
          <Text style={styles.sectionTitle}>🏅 Thành tích</Text>
          <Text style={styles.achievementCount}>{earnedCount}/{totalCount}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.achievementList}>
            {achievements.filter(a => a.earned).slice(0, 6).map((ach) => (
              <View key={ach.id} style={styles.achievementBadge}>
                <Text style={styles.achievementIcon}>{ach.icon}</Text>
              </View>
            ))}
            {earnedCount > 6 && (
              <View style={[styles.achievementBadge, styles.moreBadge]}>
                <Text style={styles.moreText}>+{earnedCount - 6}</Text>
              </View>
            )}
            {earnedCount === 0 && (
              <Text style={styles.noAchievements}>Chưa có thành tích</Text>
            )}
          </View>
        </ScrollView>
      </TouchableOpacity>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>⚙️ {t.profile.settings}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t.profile.language}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingValue}
              onPress={() => handleToggleSetting('language', language === 'vi' ? 'en' : 'vi')}
            >
              <Text style={[styles.settingValueText, { color: colors.textSecondary }]}>
                {language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t.profile.darkMode}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => handleToggleSetting('darkMode', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
        </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t.profile.notifications}</Text>
            </View>
            <Switch
              value={settings?.notifications || false}
              onValueChange={(value) => handleToggleSetting('notifications', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t.profile.audioQuality}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingValue}
              onPress={() => {
                const qualities = ['low', 'medium', 'high'] as const;
                const currentIdx = qualities.indexOf(settings?.audioQuality || 'high');
                const nextIdx = (currentIdx + 1) % qualities.length;
                handleToggleSetting('audioQuality', qualities[nextIdx]);
              }}
            >
              <Text style={[styles.settingValueText, { color: colors.textSecondary }]}>
                {settings?.audioQuality === 'high' ? t.profile.quality.high : settings?.audioQuality === 'medium' ? t.profile.quality.medium : t.profile.quality.low}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t.profile.dailyGoal}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingValue}
              onPress={() => {
                Alert.alert(
                  t.profile.dailyGoal,
                  `${settings?.dailyGoal || 30} ${t.profile.minutes}`,
                  [{ text: t.common.ok }]
                );
              }}
            >
              <Text style={[styles.settingValueText, { color: colors.textSecondary }]}>{settings?.dailyGoal || 30} {t.profile.minutes}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>👤 {t.profile.account}</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
            onPress={() => setShowEditModal(true)}
          >
            <View style={styles.actionInfo}>
              <Ionicons name="create-outline" size={20} color={colors.info} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t.profile.editProfile}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.actionInfo}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t.profile.changePassword}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.actionInfo}>
              <Ionicons name="download-outline" size={20} color={colors.success} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{t.profile.exportData}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>ℹ️ {t.profile.info}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.profile.version}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>v1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.profile.joinDate}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? '#2a1f1f' : '#fef2f2', borderColor: isDark ? '#5c2929' : '#fecaca' }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>{t.profile.logout}</Text>
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={{ height: 120 }} />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.profile.editProfile}</Text>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.auth.username}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder={t.auth.username}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.auth.email}</Text>
              <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder={t.auth.email}
              placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t.common.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.profile.changePassword}</Text>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.auth.password}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
              placeholder={t.auth.password}
              placeholderTextColor={colors.placeholder}
                    secureTextEntry
                  />

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.auth.password}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
              placeholder={t.auth.password}
              placeholderTextColor={colors.placeholder}
                    secureTextEntry
                  />

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.auth.confirmPassword}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
              placeholder={t.auth.confirmPassword}
              placeholderTextColor={colors.placeholder}
                    secureTextEntry
                  />

            <View style={styles.modalButtons}>
                <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                  <Text style={styles.saveButtonText}>Đổi mật khẩu</Text>
                  )}
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={showAchievementsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏅 Thành tích ({earnedCount}/{totalCount})</Text>
              <TouchableOpacity onPress={() => setShowAchievementsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {achievements.map((ach) => (
                <View
                  key={ach.id}
                  style={[
                    styles.achievementItem,
                    !ach.earned && styles.achievementLocked
                  ]}
                >
                  <View style={styles.achievementItemIcon}>
                    <Text style={{ fontSize: 28 }}>{ach.icon}</Text>
                  </View>
                  <View style={styles.achievementItemInfo}>
                    <Text style={[
                      styles.achievementItemName,
                      !ach.earned && styles.achievementLockedText
                    ]}>
                      {ach.nameVi}
                    </Text>
                    <Text style={styles.achievementItemDesc}>
                      {ach.descriptionVi}
                    </Text>
                    <Text style={styles.achievementItemXP}>
                      +{ach.xpReward} XP
                    </Text>
                  </View>
                  {ach.earned ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  ) : (
                    <Ionicons name="lock-closed" size={24} color="#d1d5db" />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6b7280',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  levelInfo: {
    width: '100%',
    paddingHorizontal: 24,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  achievementList: {
    flexDirection: 'row',
    gap: 8,
  },
  achievementBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 24,
  },
  moreBadge: {
    backgroundColor: '#f3f4f6',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  noAchievements: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: '#374151',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    fontSize: 15,
    color: '#374151',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementItemInfo: {
    flex: 1,
  },
  achievementItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  achievementLockedText: {
    color: '#9ca3af',
  },
  achievementItemDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  achievementItemXP: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
    marginTop: 4,
  },
});
