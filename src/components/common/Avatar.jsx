import clsx from 'clsx';

const COLORS = [
  'bg-phantom-green', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

export default function Avatar({ name, size = 'md', className }) {
  const initial = (name || '?')[0].toUpperCase();
  const colorIndex = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={clsx('rounded-full flex items-center justify-center font-semibold text-white', COLORS[colorIndex], sizeClasses[size], className)}>
      {initial}
    </div>
  );
}
