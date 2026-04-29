/**
 * 手动灌演示数据（需项目根目录 .env 已配置且库 hengyi_huoke 可用）
 *   npm run seed         — 仅当各表为空时插入
 *   npm run seed:force   — 清空四张表后重灌（演示环境用）
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initSchema, seedDemoData } = require('./db');

(async () => {
  const force = process.argv.includes('--force');
  try {
    await initSchema();
    await seedDemoData({ force });
    console.log(force ? '[seed] 已清空并重灌演示数据' : '[seed] 完成（空表已写入演示数据）');
    process.exit(0);
  } catch (e) {
    console.error('[seed] 失败:', e.message);
    process.exit(1);
  }
})();
