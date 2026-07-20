import { CATEGORY_COLORS } from '../constants/categories';

const CATEGORY_COLORS_KEY = 'axon_tasking_category_colors';
const CATEGORIES_KEY = 'axon_tasking_categories';

let categoryColorsMap: Record<string, string> = {};
try {
  const saved = localStorage.getItem(CATEGORY_COLORS_KEY);
  if (saved) {
    categoryColorsMap = JSON.parse(saved);
  }
} catch {
  // ignore
}

export function getCategoryColorId(cat: string): string {
  if (categoryColorsMap[cat]) return categoryColorsMap[cat];
  switch (cat) {
    case 'Engineering':
      return 'blue';
    case 'Design':
      return 'pink';
    case 'Product':
      return 'purple';
    case 'Marketing':
      return 'orange';
    case 'Operations':
      return 'emerald';
    case 'Personal':
      return 'yellow';
    case 'Completed':
      return 'white';
    default: {
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      }
      const defaultPalette = ['cyan', 'teal', 'indigo', 'rose', 'violet', 'lime'];
      return defaultPalette[Math.abs(hash) % defaultPalette.length]!;
    }
  }
}

export function getCategoryStyle(cat: string) {
  if (cat === 'Completed') {
    return {
      dot: 'bg-white',
      text: 'text-black font-bold',
      border: 'border-white',
      bg: 'bg-white',
    };
  }
  const colorId = getCategoryColorId(cat);
  const found = CATEGORY_COLORS.find((c) => c.id === colorId);
  if (found) {
    return { dot: found.dot, text: found.text, border: found.border, bg: found.bg };
  }
  return {
    dot: 'bg-[#06B6D4]',
    text: 'text-[#22D3EE]',
    border: 'border-[#06B6D4]/40',
    bg: 'bg-[#06B6D4]/10',
  };
}

export function setCategoryColor(cat: string, colorId: string) {
  categoryColorsMap[cat] = colorId;
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch {
    /* ignore */
  }
}

export function removeCategoryColor(cat: string) {
  delete categoryColorsMap[cat];
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch {
    /* ignore */
  }
}

export function renameCategoryColor(oldCat: string, newCat: string) {
  if (categoryColorsMap[oldCat]) {
    categoryColorsMap[newCat] = categoryColorsMap[oldCat];
    delete categoryColorsMap[oldCat];
  } else {
    categoryColorsMap[newCat] = getCategoryColorId(oldCat);
  }
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch {
    /* ignore */
  }
}

export function getSavedCategories(): string[] | null {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCategories(cats: string[]) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    /* ignore */
  }
}
