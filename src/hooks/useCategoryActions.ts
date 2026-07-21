import { useCallback, useState } from 'react';
import {
  removeCategoryColor,
  renameCategoryColor,
  saveCategories,
  setCategoryColor,
} from '../services/category-color';

interface UseCategoryActionsOptions {
  onCategoryRenamed?: (oldCategory: string, newCategory: string) => void;
  onCategoryDeleted?: (categoryToDelete: string, fallbackCategory: string) => void;
}

export function useCategoryActions(options?: UseCategoryActionsOptions) {
  const [categories, setCategories] = useState<string[]>([]);

  const handleRenameCategory = useCallback(
    (oldCategory: string, newCategory: string, newColorId?: string) => {
      if (newColorId) {
        if (oldCategory !== newCategory) {
          removeCategoryColor(oldCategory);
        }
        setCategoryColor(newCategory, newColorId);
      } else if (oldCategory !== newCategory) {
        renameCategoryColor(oldCategory, newCategory);
      }

      setCategories((prev) => {
        const updated = prev.map((c) => (c === oldCategory ? newCategory : c));
        const unique: string[] = Array.from(new Set(updated));
        saveCategories(unique);
        return unique;
      });

      options?.onCategoryRenamed?.(oldCategory, newCategory);
    },
    [options],
  );

  const handleDeleteCategory = useCallback(
    (categoryToDelete: string, fallbackCategory: string = 'Engineering') => {
      removeCategoryColor(categoryToDelete);

      setCategories((prev) => {
        const updated = prev.filter((c) => c !== categoryToDelete);
        saveCategories(updated);
        return updated;
      });

      options?.onCategoryDeleted?.(categoryToDelete, fallbackCategory);
    },
    [options],
  );

  const handleAddCategory = useCallback((newCat: string, colorId?: string) => {
    if (!newCat.trim()) return;
    const trimmed = newCat.trim();
    if (colorId) {
      setCategoryColor(trimmed, colorId);
    }
    setCategories((prev) => {
      if (!prev.includes(trimmed)) {
        const updated = [...prev, trimmed];
        saveCategories(updated);
        return updated;
      }
      return prev;
    });
  }, []);

  return {
    categories,
    setCategories,
    handleRenameCategory,
    handleDeleteCategory,
    handleAddCategory,
  };
}
