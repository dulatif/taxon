import type { ReactNode } from 'react';

interface PropertyCardProps {
  icon: ReactNode;
  label: string;
  value: string | ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  children?: ReactNode; // Dropdown content when active
  ariaLabel?: string;
}

export default function PropertyCard({
  icon,
  label,
  value,
  isActive = false,
  onClick,
  children,
  ariaLabel,
}: PropertyCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ?? `${label}: ${typeof value === 'string' ? value : 'Click to edit'}`}
      aria-expanded={isActive}
      aria-haspopup={children ? 'menu' : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={onClick}
      className="card-property flex items-start gap-3 relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    >
      <span className="w-5 h-5 mt-0.5 shrink-0 text-text-muted group-hover:text-text-primary transition-colors">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-text-primary uppercase tracking-wide font-mono">
          {label}
        </div>
        <div className="text-xs text-text-muted font-medium truncate mt-0.5">{value}</div>
      </div>

      {/* ------ Dropdown ------ */}
      {isActive && children && (
        <div
          role="menu"
          aria-label={`Select ${label}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onClick?.();
            }
          }}
          className="dropdown-menu absolute left-0 top-full mt-1.5 w-full space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {children}
        </div>
      )}
    </div>
  );
}
