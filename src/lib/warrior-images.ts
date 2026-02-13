// Warrior card ID → portrait image path mapping
const WARRIOR_IMAGES: Record<string, string> = {
  'w-lu-bu': '/images/warriors/lu-bu.png',
  'w-zhuge-liang': '/images/warriors/zhuge-liang.png',
  'w-guan-yu': '/images/warriors/guan-yu.png',
  'w-cao-cao': '/images/warriors/cao-cao.png',
  'w-zhou-yu': '/images/warriors/zhou-yu.png',
  'w-sima-yi': '/images/warriors/sima-yi.png',
  'w-liu-bei': '/images/warriors/liu-bei.png',
  'w-sun-quan': '/images/warriors/sun-quan.png',
  'w-zhang-liao': '/images/warriors/zhang-liao.png',
  'w-xu-huang': '/images/warriors/xu-huang.png',
  'w-zhang-he': '/images/warriors/zhang-he.png',
  'w-zhang-fei': '/images/warriors/zhang-fei.png',
  'w-huang-zhong': '/images/warriors/huang-zhong.png',
  'w-gan-ning': '/images/warriors/gan-ning.png',
  'w-pang-de': '/images/warriors/pang-de.png',
  'w-dong-zhuo': '/images/warriors/dong-zhuo.png',
  'w-ji-ling': '/images/warriors/qi-ling.png',
  'w-wen-chou': '/images/warriors/wen-chou.png',
  'w-chen-lan': '/images/warriors/chen-lan.png',
  'w-pan-zhang': '/images/warriors/pan-zhang.png',
};

export function getWarriorImage(cardId: string): string | null {
  return WARRIOR_IMAGES[cardId] || null;
}
