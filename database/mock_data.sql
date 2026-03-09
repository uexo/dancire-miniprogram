-- 单词热 - Mock测试数据
-- 用于开发和测试环境的数据初始化
-- 执行方式: sqlite3 wordheat.db < database/mock_data.sql

-- 清理现有数据（可选，开发环境使用）
-- DELETE FROM user_settings;
-- DELETE FROM refunds;
-- DELETE FROM orders;
-- DELETE FROM wrong_words;
-- DELETE FROM learning_records;
-- DELETE FROM checkin_records;
-- DELETE FROM user_statistics;
-- DELETE FROM word_banks;
-- DELETE FROM word_versions;
-- DELETE FROM users;

-- ============================================
-- 1. 测试用户数据
-- ============================================

-- 普通测试用户
INSERT INTO users (openid, nickname, avatar_url, user_type, grade, textbook_version, is_vip, status, phone, last_login_at, created_at) VALUES
('test_openid_001', '小明同学', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming', 'student', 3, 'pep', 0, 'active', '13800138001', datetime('now'), datetime('now', '-30 days')),
('test_openid_002', '小红同学', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohong', 'student', 4, 'pep', 0, 'active', '13800138002', datetime('now', '-1 day'), datetime('now', '-60 days')),
('test_openid_003', '学霸小李', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoli', 'student', 5, 'pep', 1, 'active', '13800138003', datetime('now'), datetime('now', '-90 days')),
('test_openid_004', '家长王女士', 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent1', 'parent', NULL, NULL, 0, 'active', '13800138004', datetime('now', '-2 day'), datetime('now', '-45 days'));

-- 更新VIP用户的过期时间
UPDATE users SET vip_expire_at = datetime('now', '+365 days') WHERE openid = 'test_openid_003';

-- 关联家长和孩子
UPDATE users SET parent_id = 4 WHERE id IN (1, 2);

-- ============================================
-- 2. 词库版本数据
-- ============================================

INSERT INTO word_versions (version, description, total_words, created_at) VALUES
('pep_2024', '人教版PEP小学英语2024版', 800, datetime('now', '-180 days')),
('oxford_2024', '牛津版小学英语2024版', 950, datetime('now', '-90 days')),
('cambridge_ket', '剑桥KET核心词汇', 1500, datetime('now', '-30 days'));

-- ============================================
-- 3. 测试单词数据（人教版PEP 3-6年级）
-- ============================================

-- 三年级上册 Unit 1
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('hello', '/həˈləʊ/', '你好', 'int.', 'Hello, I''m Tom.', '你好，我是汤姆。', 1, 3, 'Unit 1', 1, '["greeting"]', datetime('now')),
('hi', '/haɪ/', '嗨，你好', 'int.', 'Hi, how are you?', '嗨，你好吗？', 1, 3, 'Unit 1', 1, '["greeting"]', datetime('now')),
('I', '/aɪ/', '我', 'pron.', 'I am a student.', '我是一名学生。', 1, 3, 'Unit 1', 1, '["pronoun"]', datetime('now')),
('am', '/æm/', '是', 'v.', 'I am happy.', '我很高兴。', 1, 3, 'Unit 1', 1, '["verb"]', datetime('now')),
('I''m', '/aɪm/', '我是', 'abbr.', 'I''m from China.', '我来自中国。', 1, 3, 'Unit 1', 1, '["pronoun", "verb"]', datetime('now')),
('goodbye', '/ˌɡʊdˈbaɪ/', '再见', 'int.', 'Goodbye, see you tomorrow.', '再见，明天见。', 1, 3, 'Unit 1', 1, '["greeting"]', datetime('now')),
('bye', '/baɪ/', '再见', 'int.', 'Bye! Have a nice day.', '再见！祝你有个美好的一天。', 1, 3, 'Unit 1', 1, '["greeting"]', datetime('now')),
('Miss', '/mɪs/', '小姐', 'n.', 'Good morning, Miss Wang.', '早上好，王小姐。', 1, 3, 'Unit 1', 1, '["title"]', datetime('now'));

-- 三年级上册 Unit 2
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('name', '/neɪm/', '名字', 'n.', 'What''s your name?', '你叫什么名字？', 1, 3, 'Unit 2', 1, '["noun"]', datetime('now')),
('what', '/wɒt/', '什么', 'pron.', 'What is this?', '这是什么？', 1, 3, 'Unit 2', 1, '["pronoun"]', datetime('now')),
('is', '/ɪz/', '是', 'v.', 'She is my friend.', '她是我的朋友。', 1, 3, 'Unit 2', 1, '["verb"]', datetime('now')),
('what''s', '/wɒts/', '是什么', 'abbr.', 'What''s your favorite color?', '你最喜欢什么颜色？', 1, 3, 'Unit 2', 1, '["pronoun", "verb"]', datetime('now')),
('your', '/jɔː(r)/', '你的', 'pron.', 'This is your book.', '这是你的书。', 1, 3, 'Unit 2', 1, '["pronoun"]', datetime('now')),
('my', '/maɪ/', '我的', 'pron.', 'My name is John.', '我的名字是约翰。', 1, 3, 'Unit 2', 1, '["pronoun"]', datetime('now')),
('nice', '/naɪs/', '令人愉快的', 'adj.', 'Nice to meet you.', '很高兴认识你。', 2, 3, 'Unit 2', 1, '["adjective"]', datetime('now')),
('meet', '/miːt/', '遇见', 'v.', 'I want to meet you.', '我想见你。', 2, 3, 'Unit 2', 1, '["verb"]', datetime('now'));

-- 三年级上册 Unit 3
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('pen', '/pen/', '钢笔', 'n.', 'I have a red pen.', '我有一支红色的钢笔。', 1, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('pencil', '/ˈpensl/', '铅笔', 'n.', 'May I use your pencil?', '我可以用你的铅笔吗？', 1, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('pencil-box', '/ˈpensl bɒks/', '铅笔盒', 'n.', 'My pencil-box is blue.', '我的铅笔盒是蓝色的。', 1, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('ruler', '/ˈruːlə(r)/', '尺子', 'n.', 'I need a ruler.', '我需要一把尺子。', 1, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('eraser', '/ɪˈreɪzə(r)/', '橡皮', 'n.', 'Where is my eraser?', '我的橡皮在哪里？', 2, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('crayon', '/ˈkreɪən/', '蜡笔', 'n.', 'I like to draw with crayons.', '我喜欢用蜡笔画画。', 2, 3, 'Unit 3', 1, '["stationery"]', datetime('now')),
('bag', '/bæɡ/', '书包', 'n.', 'My bag is heavy.', '我的书包很重。', 1, 3, 'Unit 3', 1, '["school"]', datetime('now')),
('book', '/bʊk/', '书', 'n.', 'I read a book every day.', '我每天读一本书。', 1, 3, 'Unit 3', 1, '["school"]', datetime('now'));

-- 四年级上册 Unit 1
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('classroom', '/ˈklɑːsruːm/', '教室', 'n.', 'Our classroom is big.', '我们的教室很大。', 2, 4, 'Unit 1', 1, '["school", "place"]', datetime('now')),
('window', '/ˈwɪndəʊ/', '窗户', 'n.', 'Open the window, please.', '请打开窗户。', 2, 4, 'Unit 1', 1, '["school", "object"]', datetime('now')),
('blackboard', '/ˈblækbɔːd/', '黑板', 'n.', 'Write on the blackboard.', '在黑板上写字。', 2, 4, 'Unit 1', 1, '["school", "object"]', datetime('now')),
('light', '/laɪt/', '电灯', 'n.', 'Turn on the light.', '打开灯。', 2, 4, 'Unit 1', 1, '["school", "object"]', datetime('now')),
('picture', '/ˈpɪktʃə(r)/', '图画', 'n.', 'There is a picture on the wall.', '墙上有一幅画。', 2, 4, 'Unit 1', 1, '["school", "object"]', datetime('now')),
('door', '/dɔː(r)/', '门', 'n.', 'Close the door.', '关上门。', 1, 4, 'Unit 1', 1, '["school", "object"]', datetime('now')),
('teacher', '/ˈtiːtʃə(r)/', '教师', 'n.', 'My teacher is kind.', '我的老师很和蔼。', 2, 4, 'Unit 1', 1, '["school", "people"]', datetime('now')),
('desk', '/desk/', '书桌', 'n.', 'Put your book on the desk.', '把书放在书桌上。', 2, 4, 'Unit 1', 1, '["school", "object"]', datetime('now'));

-- 四年级上册 Unit 2
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('schoolbag', '/ˈskuːlbæɡ/', '书包', 'n.', 'I have a new schoolbag.', '我有一个新书包。', 2, 4, 'Unit 2', 1, '["school"]', datetime('now')),
('maths', '/mæθs/', '数学', 'n.', 'Maths is my favorite subject.', '数学是我最喜欢的科目。', 2, 4, 'Unit 2', 1, '["subject"]', datetime('now')),
('English', '/ˈɪŋɡlɪʃ/', '英语', 'n.', 'I study English every day.', '我每天学习英语。', 2, 4, 'Unit 2', 1, '["subject"]', datetime('now')),
('Chinese', '/ˌtʃaɪˈniːz/', '语文', 'n.', 'Chinese is interesting.', '语文很有趣。', 2, 4, 'Unit 2', 1, '["subject"]', datetime('now')),
('storybook', '/ˈstɔːribʊk/', '故事书', 'n.', 'I like reading storybooks.', '我喜欢读故事书。', 2, 4, 'Unit 2', 1, '["book"]', datetime('now')),
('candy', '/ˈkændi/', '糖果', 'n.', 'Don''t eat too much candy.', '不要吃太多糖果。', 2, 4, 'Unit 2', 1, '["food"]', datetime('now')),
('notebook', '/ˈnəʊtbʊk/', '笔记本', 'n.', 'Write it in your notebook.', '把它写在你的笔记本上。', 2, 4, 'Unit 2', 1, '["stationery"]', datetime('now')),
('toy', '/tɔɪ/', '玩具', 'n.', 'This is my favorite toy.', '这是我最喜欢的玩具。', 1, 4, 'Unit 2', 1, '["object"]', datetime('now'));

-- 五年级上册 Unit 1
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('old', '/əʊld/', '老的；年纪大的', 'adj.', 'My grandfather is old.', '我的祖父年纪大了。', 2, 5, 'Unit 1', 1, '["adjective", "people"]', datetime('now')),
('young', '/jʌŋ/', '年轻的', 'adj.', 'She is a young teacher.', '她是一位年轻的老师。', 2, 5, 'Unit 1', 1, '["adjective", "people"]', datetime('now')),
('funny', '/ˈfʌni/', '滑稽的；可笑的', 'adj.', 'The clown is funny.', '这个小丑很滑稽。', 2, 5, 'Unit 1', 1, '["adjective"]', datetime('now')),
('kind', '/kaɪnd/', '体贴的；慈祥的', 'adj.', 'My mother is very kind.', '我的妈妈非常慈祥。', 2, 5, 'Unit 1', 1, '["adjective", "people"]', datetime('now')),
('strict', '/strɪkt/', '要求严格的', 'adj.', 'Our teacher is strict.', '我们的老师很严格。', 3, 5, 'Unit 1', 1, '["adjective", "people"]', datetime('now')),
('polite', '/pəˈlaɪt/', '有礼貌的', 'adj.', 'He is a polite boy.', '他是一个有礼貌的男孩。', 3, 5, 'Unit 1', 1, '["adjective", "people"]', datetime('now')),
('helpful', '/ˈhelpfl/', '有用的；愿意帮忙的', 'adj.', 'She is very helpful.', '她很愿意帮忙。', 3, 5, 'Unit 1', 1, '["adjective"]', datetime('now')),
('clever', '/ˈklevə(r)/', '聪明的', 'adj.', 'The dog is very clever.', '这只狗很聪明。', 2, 5, 'Unit 1', 1, '["adjective"]', datetime('now'));

-- 六年级上册 Unit 1
INSERT INTO word_banks (word, phonetic, meaning, pos, example, example_translation, difficulty, grade, unit, version, tags, created_at) VALUES
('science', '/ˈsaɪəns/', '科学', 'n.', 'I like science class.', '我喜欢科学课。', 3, 6, 'Unit 1', 1, '["subject"]', datetime('now')),
('museum', '/mjuˈziːəm/', '博物馆', 'n.', 'Let''s go to the museum.', '我们去博物馆吧。', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('post office', '/ˈpəʊst ɒfɪs/', '邮局', 'n.', 'Where is the post office?', '邮局在哪里？', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('bookstore', '/ˈbʊkstɔː(r)/', '书店', 'n.', 'I want to go to the bookstore.', '我想去书店。', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('cinema', '/ˈsɪnəmə/', '电影院', 'n.', 'Let''s watch a movie at the cinema.', '我们去电影院看电影吧。', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('hospital', '/ˈhɒspɪtl/', '医院', 'n.', 'My mother works in a hospital.', '我妈妈在医院工作。', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('crossing', '/ˈkrɒsɪŋ/', '十字路口', 'n.', 'Turn left at the crossing.', '在十字路口左转。', 3, 6, 'Unit 1', 1, '["place"]', datetime('now')),
('turn', '/tɜːn/', '转弯', 'v.', 'Turn right here.', '在这里右转。', 3, 6, 'Unit 1', 1, '["verb", "direction"]', datetime('now'));

-- ============================================
-- 4. 学习记录数据
-- ============================================

-- 用户1的学习记录
INSERT INTO learning_records (user_id, word_id, status, familiarity, next_review_at, review_count, correct_count, wrong_count, last_studied_at, created_at) VALUES
(1, 1, 'mastered', 100, datetime('now', '+7 days'), 5, 5, 0, datetime('now', '-1 day'), datetime('now', '-30 days')),
(1, 2, 'mastered', 100, datetime('now', '+7 days'), 4, 4, 0, datetime('now', '-2 day'), datetime('now', '-28 days')),
(1, 3, 'learning', 75, datetime('now', '+2 days'), 3, 3, 1, datetime('now', '-1 day'), datetime('now', '-20 days')),
(1, 4, 'learning', 60, datetime('now', '+1 day'), 2, 2, 1, datetime('now', '-3 day'), datetime('now', '-15 days')),
(1, 9, 'new', 20, datetime('now'), 1, 1, 2, datetime('now', '-5 day'), datetime('now', '-10 days'));

-- 用户2的学习记录
INSERT INTO learning_records (user_id, word_id, status, familiarity, next_review_at, review_count, correct_count, wrong_count, last_studied_at, created_at) VALUES
(2, 1, 'mastered', 100, datetime('now', '+7 days'), 6, 6, 0, datetime('now', '-1 day'), datetime('now', '-45 days')),
(2, 2, 'mastered', 100, datetime('now', '+7 days'), 5, 5, 0, datetime('now', '-3 day'), datetime('now', '-40 days')),
(2, 3, 'mastered', 100, datetime('now', '+7 days'), 4, 4, 0, datetime('now', '-2 day'), datetime('now', '-35 days')),
(2, 9, 'learning', 80, datetime('now', '+3 days'), 3, 3, 0, datetime('now', '-1 day'), datetime('now', '-20 days'));

-- 用户3（VIP用户）的学习记录
INSERT INTO learning_records (user_id, word_id, status, familiarity, next_review_at, review_count, correct_count, wrong_count, last_studied_at, created_at) VALUES
(3, 1, 'mastered', 100, datetime('now', '+30 days'), 10, 10, 0, datetime('now', '-5 day'), datetime('now', '-90 days')),
(3, 2, 'mastered', 100, datetime('now', '+30 days'), 9, 9, 0, datetime('now', '-7 day'), datetime('now', '-85 days')),
(3, 3, 'mastered', 100, datetime('now', '+30 days'), 8, 8, 0, datetime('now', '-6 day'), datetime('now', '-80 days')),
(3, 17, 'mastered', 100, datetime('now', '+30 days'), 7, 7, 0, datetime('now', '-4 day'), datetime('now', '-60 days')),
(3, 25, 'mastered', 100, datetime('now', '+30 days'), 6, 6, 0, datetime('now', '-3 day'), datetime('now', '-45 days')),
(3, 33, 'learning', 85, datetime('now', '+3 days'), 4, 4, 1, datetime('now', '-2 day'), datetime('now', '-20 days'));

-- ============================================
-- 5. 错题本数据
-- ============================================

INSERT INTO wrong_words (user_id, word_id, wrong_count, last_wrong_at, is_mastered, created_at) VALUES
(1, 9, 3, datetime('now', '-5 day'), 0, datetime('now', '-20 days')),
(1, 10, 2, datetime('now', '-10 day'), 0, datetime('now', '-30 days')),
(2, 5, 2, datetime('now', '-15 day'), 0, datetime('now', '-25 days'));

-- ============================================
-- 6. 打卡记录数据
-- ============================================

-- 用户1的打卡记录（连续5天）
INSERT INTO checkin_records (user_id, checkin_date, continuous_days, studied_words, accuracy, study_duration, created_at) VALUES
(1, date('now', '-4 days'), 1, 15, 80.00, 600, datetime('now', '-4 days')),
(1, date('now', '-3 days'), 2, 20, 85.00, 900, datetime('now', '-3 days')),
(1, date('now', '-2 days'), 3, 18, 90.00, 720, datetime('now', '-2 days')),
(1, date('now', '-1 days'), 4, 25, 88.00, 1200, datetime('now', '-1 days')),
(1, date('now'), 5, 22, 92.00, 1080, datetime('now'));

-- 用户2的打卡记录（断开后重新计算）
INSERT INTO checkin_records (user_id, checkin_date, continuous_days, studied_words, accuracy, study_duration, created_at) VALUES
(2, date('now', '-10 days'), 1, 10, 75.00, 480, datetime('now', '-10 days')),
(2, date('now', '-9 days'), 2, 12, 80.00, 540, datetime('now', '-9 days')),
(2, date('now', '-2 days'), 1, 15, 85.00, 600, datetime('now', '-2 days')),
(2, date('now', '-1 days'), 2, 20, 90.00, 900, datetime('now', '-1 days')),
(2, date('now'), 3, 18, 88.00, 720, datetime('now'));

-- 用户3的打卡记录（连续30天）
INSERT INTO checkin_records (user_id, checkin_date, continuous_days, studied_words, accuracy, study_duration, created_at) 
SELECT 
  3,
  date('now', '-' || (30 - n) || ' days'),
  (30 - n + 1),
  20 + (n % 10),
  85.00 + (n % 10),
  600 + (n % 300),
  datetime('now', '-' || (30 - n) || ' days')
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
  UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
  UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
  UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
);

-- ============================================
-- 7. 订单数据
-- ============================================

INSERT INTO orders (order_no, user_id, product_type, product_name, amount, status, paid_at, expire_at, created_at) VALUES
('WH202601010001', 3, 'year', '年度会员', 199.00, 'paid', datetime('now', '-90 days'), datetime('now', '+275 days'), datetime('now', '-90 days')),
('WH202602150002', 1, 'month', '月度会员', 29.90, 'pending', NULL, NULL, datetime('now', '-1 days')),
('WH202603010003', 2, 'quarter', '季度会员', 69.90, 'paid', datetime('now', '-5 days'), datetime('now', '+85 days'), datetime('now', '-5 days'));

-- ============================================
-- 8. 用户统计数据
-- ============================================

INSERT INTO user_statistics (user_id, total_words, mastered_words, learning_words, total_study_days, max_continuous_days, today_studied, today_accuracy, updated_at) VALUES
(1, 5, 2, 3, 5, 5, 22, 92.00, datetime('now')),
(2, 4, 3, 1, 5, 3, 18, 88.00, datetime('now')),
(3, 6, 5, 1, 30, 30, 29, 94.00, datetime('now'));

-- ============================================
-- 9. 用户设置数据
-- ============================================

INSERT INTO user_settings (user_id, daily_goal, reminder_time, enable_sound, enable_vibration, updated_at) VALUES
(1, 20, '19:00', 1, 1, datetime('now')),
(2, 15, '20:00', 1, 0, datetime('now')),
(3, 30, '18:30', 1, 1, datetime('now'));

-- ============================================
-- 数据汇总
-- ============================================

-- 验证数据
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Word Banks', COUNT(*) FROM word_banks
UNION ALL
SELECT 'Learning Records', COUNT(*) FROM learning_records
UNION ALL
SELECT 'Checkin Records', COUNT(*) FROM checkin_records
UNION ALL
SELECT 'Wrong Words', COUNT(*) FROM wrong_words
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders;
