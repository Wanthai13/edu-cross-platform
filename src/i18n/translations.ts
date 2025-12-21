// i18n/translations.ts

export type Language = 'vi' | 'en';

export interface TranslationKeys {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    yes: string;
    no: string;
    ok: string;
    back: string;
    next: string;
    done: string;
    search: string;
    noData: string;
    retry: string;
  };
  
  // Navigation
  nav: {
    home: string;
    sessions: string;
    upload: string;
    study: string;
    profile: string;
  };
  
  // Dashboard
  dashboard: {
    greeting: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    subtitle: string;
    quickActions: string;
    record: string;
    uploadFile: string;
    studyNow: string;
    stats: string;
    sessions: string;
    flashcards: string;
    quiz: string;
    streak: string;
    streakDays: string;
    recentSessions: string;
    viewAll: string;
    noSessions: string;
    startRecording: string;
  };
  
  // Profile
  profile: {
    title: string;
    stats: string;
    studyTime: string;
    record: string;
    achievements: string;
    noAchievements: string;
    settings: string;
    language: string;
    darkMode: string;
    notifications: string;
    audioQuality: string;
    dailyGoal: string;
    minutes: string;
    account: string;
    editProfile: string;
    changePassword: string;
    exportData: string;
    info: string;
    version: string;
    joinDate: string;
    logout: string;
    logoutConfirm: string;
    xpToNext: string;
    level: {
      beginner: string;
      intermediate: string;
      advanced: string;
      expert: string;
      master: string;
    };
    quality: {
      low: string;
      medium: string;
      high: string;
    };
  };
  
  // Study
  study: {
    title: string;
    recentSessions: string;
    noSession: string;
    materials: string;
    scoring: string;
    flashcardsTab: string;
    quizTab: string;
    generating: string;
    noFlashcards: string;
    noQuiz: string;
    quickScore: string;
    detailedScore: string;
    analyzing: string;
    score: string;
    excellent: string;
    good: string;
    fair: string;
    average: string;
    belowAverage: string;
  };
  
  // Upload
  upload: {
    title: string;
    selectFile: string;
    record: string;
    youtube: string;
    dragDrop: string;
    supportedFormats: string;
    recording: string;
    stop: string;
    pause: string;
    resume: string;
    processing: string;
    transcribing: string;
    success: string;
    failed: string;
    enterYoutubeUrl: string;
    invalidUrl: string;
  };
  
  // Sessions
  sessions: {
    title: string;
    search: string;
    noResults: string;
    empty: string;
    deleteConfirm: string;
    deleted: string;
  };
  
  // Auth
  auth: {
    login: string;
    register: string;
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    loginFailed: string;
    registerFailed: string;
  };
  
  // Errors
  errors: {
    network: string;
    unknown: string;
    sessionNotFound: string;
    transcriptTooShort: string;
    noApiKey: string;
  };
  
  // Tips
  tips: string[];
}

export const translations: Record<Language, TranslationKeys> = {
  vi: {
    common: {
      save: 'Lưu',
      cancel: 'Hủy',
      delete: 'Xóa',
      edit: 'Sửa',
      loading: 'Đang tải...',
      error: 'Lỗi',
      success: 'Thành công',
      confirm: 'Xác nhận',
      yes: 'Có',
      no: 'Không',
      ok: 'OK',
      back: 'Quay lại',
      next: 'Tiếp',
      done: 'Xong',
      search: 'Tìm kiếm',
      noData: 'Không có dữ liệu',
      retry: 'Thử lại',
    },
    nav: {
      home: 'Trang chủ',
      sessions: 'Phiên học',
      upload: 'Tải lên',
      study: 'Học tập',
      profile: 'Hồ sơ',
    },
    dashboard: {
      greeting: {
        morning: 'Chào buổi sáng',
        afternoon: 'Chào buổi chiều',
        evening: 'Chào buổi tối',
      },
      subtitle: 'Hôm nay bạn muốn học gì?',
      quickActions: 'Hành động nhanh',
      record: 'Ghi âm',
      uploadFile: 'Tải lên',
      studyNow: 'Học tập',
      stats: 'Thống kê học tập',
      sessions: 'Phiên',
      flashcards: 'Flashcards',
      quiz: 'Quiz',
      streak: 'Chuỗi học tập',
      streakDays: 'ngày liên tiếp',
      recentSessions: 'Phiên gần đây',
      viewAll: 'Xem tất cả',
      noSessions: 'Chưa có phiên nào',
      startRecording: 'Bắt đầu ghi âm',
    },
    profile: {
      title: 'Hồ sơ',
      stats: 'Thống kê học tập',
      studyTime: 'Thời gian',
      record: 'Kỷ lục',
      achievements: 'Thành tích',
      noAchievements: 'Chưa có thành tích',
      settings: 'Cài đặt',
      language: 'Ngôn ngữ',
      darkMode: 'Chế độ tối',
      notifications: 'Thông báo',
      audioQuality: 'Chất lượng audio',
      dailyGoal: 'Mục tiêu hàng ngày',
      minutes: 'phút',
      account: 'Tài khoản',
      editProfile: 'Chỉnh sửa thông tin',
      changePassword: 'Đổi mật khẩu',
      exportData: 'Xuất dữ liệu',
      info: 'Thông tin',
      version: 'Phiên bản',
      joinDate: 'Ngày tham gia',
      logout: 'Đăng xuất',
      logoutConfirm: 'Bạn có chắc muốn đăng xuất?',
      xpToNext: 'XP đến level tiếp theo',
      level: {
        beginner: 'Người mới',
        intermediate: 'Trung cấp',
        advanced: 'Nâng cao',
        expert: 'Chuyên gia',
        master: 'Bậc thầy',
      },
      quality: {
        low: 'Thấp',
        medium: 'Trung bình',
        high: 'Cao',
      },
    },
    study: {
      title: 'Học tập',
      recentSessions: 'Phiên ghi âm gần đây',
      noSession: 'Chưa có phiên nào. Hãy tải lên hoặc ghi âm ở tab Upload trước.',
      materials: 'Học liệu',
      scoring: 'Đánh giá & Agenda',
      flashcardsTab: 'Flashcards',
      quizTab: 'Quiz',
      generating: 'Đang tạo flashcards và quiz...',
      noFlashcards: 'Chưa có flashcards cho nội dung này.',
      noQuiz: 'Chưa có câu hỏi quiz.',
      quickScore: 'Đánh giá nhanh',
      detailedScore: 'Chi tiết đầy đủ',
      analyzing: 'Đang phân tích...',
      score: 'Điểm',
      excellent: 'Xuất sắc',
      good: 'Tốt',
      fair: 'Khá',
      average: 'Trung bình',
      belowAverage: 'Yếu',
    },
    upload: {
      title: 'Tải lên',
      selectFile: 'Chọn file',
      record: 'Ghi âm',
      youtube: 'YouTube',
      dragDrop: 'Kéo thả file hoặc nhấn để chọn',
      supportedFormats: 'Hỗ trợ: MP3, WAV, M4A, MP4',
      recording: 'Đang ghi âm...',
      stop: 'Dừng',
      pause: 'Tạm dừng',
      resume: 'Tiếp tục',
      processing: 'Đang xử lý...',
      transcribing: 'Đang chuyển đổi...',
      success: 'Tải lên thành công!',
      failed: 'Tải lên thất bại',
      enterYoutubeUrl: 'Nhập URL YouTube',
      invalidUrl: 'URL không hợp lệ',
    },
    sessions: {
      title: 'Phiên học',
      search: 'Tìm kiếm phiên...',
      noResults: 'Không tìm thấy kết quả',
      empty: 'Chưa có phiên nào',
      deleteConfirm: 'Bạn có chắc muốn xóa phiên này?',
      deleted: 'Đã xóa phiên',
    },
    auth: {
      login: 'Đăng nhập',
      register: 'Đăng ký',
      email: 'Email',
      password: 'Mật khẩu',
      confirmPassword: 'Xác nhận mật khẩu',
      username: 'Tên người dùng',
      forgotPassword: 'Quên mật khẩu?',
      noAccount: 'Chưa có tài khoản?',
      hasAccount: 'Đã có tài khoản?',
      loginFailed: 'Đăng nhập thất bại',
      registerFailed: 'Đăng ký thất bại',
    },
    errors: {
      network: 'Lỗi kết nối mạng',
      unknown: 'Có lỗi xảy ra',
      sessionNotFound: 'Không tìm thấy phiên',
      transcriptTooShort: 'Nội dung transcript quá ngắn hoặc không có',
      noApiKey: 'Thiếu cấu hình GenAI API key',
    },
    tips: [
      '💡 Ôn tập flashcard mỗi ngày giúp ghi nhớ lâu hơn 80%!',
      '🎯 Chia nhỏ bài học thành các phần 25 phút để tập trung tốt hơn.',
      '📝 Ghi chú bằng giọng nói giúp tiết kiệm 60% thời gian.',
      '🧠 Ngủ đủ giấc giúp củng cố kiến thức đã học.',
      '🔄 Lặp lại cách quãng (spaced repetition) tăng khả năng nhớ 200%.',
      '✨ Quiz thường xuyên giúp phát hiện lỗ hổng kiến thức.',
    ],
  },
  
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      noData: 'No data',
      retry: 'Retry',
    },
    nav: {
      home: 'Home',
      sessions: 'Sessions',
      upload: 'Upload',
      study: 'Study',
      profile: 'Profile',
    },
    dashboard: {
      greeting: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
      },
      subtitle: 'What would you like to learn today?',
      quickActions: 'Quick Actions',
      record: 'Record',
      uploadFile: 'Upload',
      studyNow: 'Study',
      stats: 'Learning Stats',
      sessions: 'Sessions',
      flashcards: 'Flashcards',
      quiz: 'Quiz',
      streak: 'Learning Streak',
      streakDays: 'consecutive days',
      recentSessions: 'Recent Sessions',
      viewAll: 'View All',
      noSessions: 'No sessions yet',
      startRecording: 'Start Recording',
    },
    profile: {
      title: 'Profile',
      stats: 'Learning Stats',
      studyTime: 'Study Time',
      record: 'Record',
      achievements: 'Achievements',
      noAchievements: 'No achievements yet',
      settings: 'Settings',
      language: 'Language',
      darkMode: 'Dark Mode',
      notifications: 'Notifications',
      audioQuality: 'Audio Quality',
      dailyGoal: 'Daily Goal',
      minutes: 'minutes',
      account: 'Account',
      editProfile: 'Edit Profile',
      changePassword: 'Change Password',
      exportData: 'Export Data',
      info: 'Information',
      version: 'Version',
      joinDate: 'Join Date',
      logout: 'Logout',
      logoutConfirm: 'Are you sure you want to logout?',
      xpToNext: 'XP to next level',
      level: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Expert',
        master: 'Master',
      },
      quality: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      },
    },
    study: {
      title: 'Study',
      recentSessions: 'Recent Recording Sessions',
      noSession: 'No sessions yet. Upload or record in the Upload tab first.',
      materials: 'Materials',
      scoring: 'Scoring & Agenda',
      flashcardsTab: 'Flashcards',
      quizTab: 'Quiz',
      generating: 'Generating flashcards and quiz...',
      noFlashcards: 'No flashcards for this content.',
      noQuiz: 'No quiz questions.',
      quickScore: 'Quick Score',
      detailedScore: 'Detailed Analysis',
      analyzing: 'Analyzing...',
      score: 'Score',
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      average: 'Average',
      belowAverage: 'Below Average',
    },
    upload: {
      title: 'Upload',
      selectFile: 'Select File',
      record: 'Record',
      youtube: 'YouTube',
      dragDrop: 'Drag & drop or click to select',
      supportedFormats: 'Supported: MP3, WAV, M4A, MP4',
      recording: 'Recording...',
      stop: 'Stop',
      pause: 'Pause',
      resume: 'Resume',
      processing: 'Processing...',
      transcribing: 'Transcribing...',
      success: 'Upload successful!',
      failed: 'Upload failed',
      enterYoutubeUrl: 'Enter YouTube URL',
      invalidUrl: 'Invalid URL',
    },
    sessions: {
      title: 'Sessions',
      search: 'Search sessions...',
      noResults: 'No results found',
      empty: 'No sessions yet',
      deleteConfirm: 'Are you sure you want to delete this session?',
      deleted: 'Session deleted',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      username: 'Username',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      loginFailed: 'Login failed',
      registerFailed: 'Registration failed',
    },
    errors: {
      network: 'Network error',
      unknown: 'An error occurred',
      sessionNotFound: 'Session not found',
      transcriptTooShort: 'Transcript content is too short or empty',
      noApiKey: 'Missing GenAI API key configuration',
    },
    tips: [
      '💡 Daily flashcard review improves retention by 80%!',
      '🎯 Break lessons into 25-minute chunks for better focus.',
      '📝 Voice notes save 60% of your time.',
      '🧠 Good sleep helps consolidate learned knowledge.',
      '🔄 Spaced repetition increases memory by 200%.',
      '✨ Regular quizzes help identify knowledge gaps.',
    ],
  },
};

