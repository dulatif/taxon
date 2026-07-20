export const PROJECT_CATEGORIES = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Operations',
  'Personal',
] as const;

export type CategoryColor =
  | 'blue'
  | 'pink'
  | 'purple'
  | 'orange'
  | 'emerald'
  | 'yellow'
  | 'cyan'
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'violet'
  | 'lime'
  | 'red'
  | 'amber'
  | 'white';

export const CATEGORY_COLORS = [
  {
    id: 'blue',
    name: 'Blue',
    dot: 'bg-[#3B82F6]',
    text: 'text-[#60A5FA]',
    border: 'border-[#3B82F6]/40',
    bg: 'bg-[#3B82F6]/10',
  },
  {
    id: 'pink',
    name: 'Pink',
    dot: 'bg-[#EC4899]',
    text: 'text-[#F472B6]',
    border: 'border-[#EC4899]/40',
    bg: 'bg-[#EC4899]/10',
  },
  {
    id: 'purple',
    name: 'Purple',
    dot: 'bg-[#A855F7]',
    text: 'text-[#C084FC]',
    border: 'border-[#A855F7]/40',
    bg: 'bg-[#A855F7]/10',
  },
  {
    id: 'orange',
    name: 'Orange',
    dot: 'bg-[#F97316]',
    text: 'text-[#FB923C]',
    border: 'border-[#F97316]/40',
    bg: 'bg-[#F97316]/10',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    dot: 'bg-[#10B981]',
    text: 'text-[#34D399]',
    border: 'border-[#10B981]/40',
    bg: 'bg-[#10B981]/10',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    dot: 'bg-[#EAB308]',
    text: 'text-[#FACC15]',
    border: 'border-[#EAB308]/40',
    bg: 'bg-[#EAB308]/10',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    dot: 'bg-[#06B6D4]',
    text: 'text-[#22D3EE]',
    border: 'border-[#06B6D4]/40',
    bg: 'bg-[#06B6D4]/10',
  },
  {
    id: 'teal',
    name: 'Teal',
    dot: 'bg-[#14B8A6]',
    text: 'text-[#2DD4BF]',
    border: 'border-[#14B8A6]/40',
    bg: 'bg-[#14B8A6]/10',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    dot: 'bg-[#6366F1]',
    text: 'text-[#818CF8]',
    border: 'border-[#6366F1]/40',
    bg: 'bg-[#6366F1]/10',
  },
  {
    id: 'rose',
    name: 'Rose',
    dot: 'bg-[#F43F5E]',
    text: 'text-[#FB7185]',
    border: 'border-[#F43F5E]/40',
    bg: 'bg-[#F43F5E]/10',
  },
  {
    id: 'violet',
    name: 'Violet',
    dot: 'bg-[#8B5CF6]',
    text: 'text-[#A78BFA]',
    border: 'border-[#8B5CF6]/40',
    bg: 'bg-[#8B5CF6]/10',
  },
  {
    id: 'lime',
    name: 'Lime',
    dot: 'bg-[#84CC16]',
    text: 'text-[#A3E635]',
    border: 'border-[#84CC16]/40',
    bg: 'bg-[#84CC16]/10',
  },
  {
    id: 'red',
    name: 'Red',
    dot: 'bg-[#EF4444]',
    text: 'text-[#F87171]',
    border: 'border-[#EF4444]/40',
    bg: 'bg-[#EF4444]/10',
  },
  {
    id: 'amber',
    name: 'Amber',
    dot: 'bg-[#F59E0B]',
    text: 'text-[#FBBF24]',
    border: 'border-[#F59E0B]/40',
    bg: 'bg-[#F59E0B]/10',
  },
  {
    id: 'white',
    name: 'White',
    dot: 'bg-white',
    text: 'text-white',
    border: 'border-white/40',
    bg: 'bg-white/10',
  },
] as const;
