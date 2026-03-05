-- 单词热数据库表结构
-- 创建日期: 2026-02-17
-- 数据库: MySQL 8.0

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    openid VARCHAR(64) UNIQUE NOT NULL COMMENT '微信openid',
    unionid VARCHAR(64) COMMENT '微信unionid',
    nickname VARCHAR(64) COMMENT '昵称',
    avatar_url VARCHAR(255) COMMENT '头像URL',
    user_type ENUM('student', 'parent') DEFAULT 'student' COMMENT '用户类型',
    grade TINYINT COMMENT '年级 1-9',
    textbook_version VARCHAR(32) COMMENT '教材版本',
    parent_id BIGINT COMMENT '关联家长ID',
    is_vip BOOLEAN DEFAULT FALSE COMMENT '是否VIP',
    vip_expire_at TIMESTAMP COMMENT 'VIP到期时间',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '用户状态',
    token_version VARCHAR(32) DEFAULT '1' COMMENT 'Token版本',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_active_at TIMESTAMP NULL COMMENT '最后活动时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_openid (openid),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 词库表
CREATE TABLE IF NOT EXISTS word_banks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '单词ID',
    word VARCHAR(64) NOT NULL COMMENT '单词',
    phonetic VARCHAR(128) COMMENT '音标',
    meaning TEXT COMMENT '释义',
    pos VARCHAR(32) COMMENT '词性',
    example TEXT COMMENT '例句',
    example_translation TEXT COMMENT '例句翻译',
    audio_url VARCHAR(255) COMMENT '音频URL',
    difficulty TINYINT DEFAULT 1 COMMENT '难度等级 1-5',
    grade TINYINT COMMENT '适用年级',
    unit VARCHAR(32) COMMENT '单元',
    version BIGINT COMMENT '词库版本ID',
    tags JSON COMMENT '标签',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_grade_unit (grade, unit),
    INDEX idx_version (version),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='词库表';

-- 学习记录表（核心）
CREATE TABLE IF NOT EXISTS learning_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    word_id BIGINT NOT NULL COMMENT '单词ID',
    status ENUM('new', 'learning', 'mastered', 'forgotten') DEFAULT 'new' COMMENT '学习状态',
    familiarity TINYINT DEFAULT 0 COMMENT '熟悉度 0-100',
    next_review_at TIMESTAMP COMMENT '下次复习时间（艾宾浩斯）',
    review_count INT DEFAULT 0 COMMENT '复习次数',
    correct_count INT DEFAULT 0 COMMENT '答对次数',
    wrong_count INT DEFAULT 0 COMMENT '答错次数',
    last_studied_at TIMESTAMP COMMENT '最后学习时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_word (user_id, word_id),
    INDEX idx_user_next_review (user_id, next_review_at),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习记录表';

-- 打卡记录表
CREATE TABLE IF NOT EXISTS checkin_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    checkin_date DATE NOT NULL COMMENT '打卡日期',
    continuous_days INT DEFAULT 1 COMMENT '连续打卡天数',
    studied_words INT DEFAULT 0 COMMENT '学习单词数',
    accuracy DECIMAL(5,2) COMMENT '正确率',
    study_duration INT DEFAULT 0 COMMENT '学习时长(秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, checkin_date),
    INDEX idx_user_date (user_id, checkin_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录表';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(64) UNIQUE NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    product_type ENUM('month', 'quarter', 'year') NOT NULL COMMENT '产品类型',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额(元)',
    status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
    pay_method VARCHAR(32) COMMENT '支付方式',
    paid_at TIMESTAMP COMMENT '支付时间',
    expire_at TIMESTAMP COMMENT '会员到期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_no (order_no),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 错题本表
CREATE TABLE IF NOT EXISTS wrong_words (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    word_id BIGINT NOT NULL COMMENT '单词ID',
    wrong_count INT DEFAULT 1 COMMENT '错误次数',
    last_wrong_at TIMESTAMP COMMENT '最后错误时间',
    is_mastered BOOLEAN DEFAULT FALSE COMMENT '是否已掌握',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_word (user_id, word_id),
    INDEX idx_user_mastered (user_id, is_mastered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='错题本表';

-- 学习统计表（冗余表，用于快速查询）
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id BIGINT PRIMARY KEY COMMENT '用户ID',
    total_words INT DEFAULT 0 COMMENT '总词数',
    mastered_words INT DEFAULT 0 COMMENT '已掌握词数',
    learning_words INT DEFAULT 0 COMMENT '学习中词数',
    total_study_days INT DEFAULT 0 COMMENT '总学习天数',
    max_continuous_days INT DEFAULT 0 COMMENT '最大连续天数',
    today_studied INT DEFAULT 0 COMMENT '今日学习数',
    today_accuracy DECIMAL(5,2) DEFAULT 0 COMMENT '今日正确率',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户统计表';

-- 词库版本表
CREATE TABLE IF NOT EXISTS word_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '版本ID',
    version VARCHAR(64) UNIQUE NOT NULL COMMENT '版本名称',
    description TEXT COMMENT '版本描述',
    total_words INT DEFAULT 0 COMMENT '单词总数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='词库版本表';

-- 退款记录表
CREATE TABLE IF NOT EXISTS refunds (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '退款ID',
    refund_no VARCHAR(64) UNIQUE NOT NULL COMMENT '退款单号',
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '退款金额',
    reason TEXT COMMENT '退款原因',
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '退款状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_no (order_no),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款记录表';

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    user_id BIGINT PRIMARY KEY COMMENT '用户ID',
    daily_goal INT DEFAULT 20 COMMENT '每日学习目标',
    reminder_time TIME COMMENT '提醒时间',
    enable_sound BOOLEAN DEFAULT TRUE COMMENT '是否开启音效',
    enable_vibration BOOLEAN DEFAULT TRUE COMMENT '是否开启震动',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户设置表';
