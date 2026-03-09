import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始导入种子数据...');

  // 1. 创建词库版本
  console.log('📚 创建词库版本...');
  const version = await prisma.wordVersion.create({
    data: {
      version: 'v1.0',
      description: '人教版小学英语词汇',
      totalWords: 50,
    },
  });

  // 2. 创建单词
  console.log('📝 创建单词...');
  const words = [
    // 三年级
    { word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', grade: 3, unit: 1, difficulty: 1 },
    { word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', grade: 3, unit: 1, difficulty: 1 },
    { word: 'cat', phonetic: '/kæt/', meaning: '猫', grade: 3, unit: 2, difficulty: 1 },
    { word: 'dog', phonetic: '/dɒɡ/', meaning: '狗', grade: 3, unit: 2, difficulty: 1 },
    { word: 'book', phonetic: '/bʊk/', meaning: '书', grade: 3, unit: 3, difficulty: 1 },
    // 四年级
    { word: 'school', phonetic: '/skuːl/', meaning: '学校', grade: 4, unit: 1, difficulty: 2 },
    { word: 'teacher', phonetic: '/ˈtiːtʃə(r)/', meaning: '老师', grade: 4, unit: 1, difficulty: 2 },
    { word: 'student', phonetic: '/ˈstjuːdnt/', meaning: '学生', grade: 4, unit: 1, difficulty: 2 },
    { word: 'classroom', phonetic: '/ˈklɑːsruːm/', meaning: '教室', grade: 4, unit: 2, difficulty: 2 },
    { word: 'library', phonetic: '/ˈlaɪbrəri/', meaning: '图书馆', grade: 4, unit: 2, difficulty: 2 },
    // 五年级
    { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', meaning: '美丽的', grade: 5, unit: 1, difficulty: 3 },
    { word: 'weather', phonetic: '/ˈweðə(r)/', meaning: '天气', grade: 5, unit: 1, difficulty: 3 },
    { word: 'season', phonetic: '/ˈsiːzn/', meaning: '季节', grade: 5, unit: 2, difficulty: 3 },
    { word: 'mountain', phonetic: '/ˈmaʊntən/', meaning: '山', grade: 5, unit: 2, difficulty: 3 },
    { word: 'country', phonetic: '/ˈkʌntri/', meaning: '国家', grade: 5, unit: 3, difficulty: 3 },
    // 六年级
    { word: 'adventure', phonetic: '/ədˈventʃə(r)/', meaning: '冒险', grade: 6, unit: 1, difficulty: 4 },
    { word: 'challenge', phonetic: '/ˈtʃælɪndʒ/', meaning: '挑战', grade: 6, unit: 1, difficulty: 4 },
    { word: 'knowledge', phonetic: '/ˈnɒlɪdʒ/', meaning: '知识', grade: 6, unit: 2, difficulty: 4 },
    { word: 'experience', phonetic: '/ɪkˈspɪəriəns/', meaning: '经验', grade: 6, unit: 2, difficulty: 4 },
    { word: 'achievement', phonetic: '/əˈtʃiːvmənt/', meaning: '成就', grade: 6, unit: 3, difficulty: 4 },
  ];

  for (const word of words) {
    await prisma.wordBank.create({
      data: {
        ...word,
        version: version.id,
        tags: JSON.stringify([`grade-${word.grade}`, `unit-${word.unit}`]),
      },
    });
  }

  // 3. 创建测试用户
  console.log('👤 创建测试用户...');
  const users = [
    {
      openid: 'test_user_001',
      nickname: '小明',
      grade: 3,
      textbookVersion: 'pep',
    },
    {
      openid: 'test_user_002',
      nickname: '小红',
      grade: 4,
      textbookVersion: 'pep',
    },
    {
      openid: 'test_user_003',
      nickname: 'VIP用户',
      grade: 5,
      textbookVersion: 'pep',
      isVip: true,
      vipExpireAt: new Date('2025-12-31'),
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });

    // 创建用户统计
    await prisma.userStatistic.create({
      data: {
        userId: user.id,
      },
    });
  }

  console.log('✅ 种子数据导入完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
