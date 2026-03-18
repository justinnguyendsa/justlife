import type { Priority, Role } from '../../types';

type BadgeVariant = 'priority' | 'role';

interface BadgeProps {
  variant: BadgeVariant;
  value: Priority | Role;
  size?: 'sm' | 'md';
}

const PRIORITY_CONFIG: Record<Priority, { label: string; classes: string }> = {
  HIGH: {
    label: '🔴 Cao',
    classes: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  MEDIUM: {
    label: '🟡 TB',
    classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: '🟢 Thấp',
    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
};

const ROLE_CONFIG: Record<Role, { label: string; classes: string }> = {
  WORK: {
    label: '🏢 Công sở',
    classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  TEACH: {
    label: '👨‍🏫 Đi dạy',
    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  MASTER: {
    label: '🎓 Cao học',
    classes: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
};

export default function Badge({ variant, value, size = 'sm' }: BadgeProps) {
  const config =
    variant === 'priority'
      ? PRIORITY_CONFIG[value as Priority]
      : ROLE_CONFIG[value as Role];

  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
