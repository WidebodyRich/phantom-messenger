import { Star } from 'lucide-react';

export default function ReviewCard({ review }) {
  const rating = review.rating || 0;
  const date = review.created_at || review.createdAt;

  return (
    <div className="p-3 bg-phantom-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-phantom-green/10 flex items-center justify-center">
            <span className="text-phantom-green text-[10px] font-bold">
              {(review.username || '?')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-semibold text-phantom-charcoal">{review.username || 'Anonymous'}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-3 h-3 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-phantom-gray-200'}`}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="text-xs text-phantom-gray-500 mt-1 leading-relaxed">{review.comment}</p>
      )}
      {date && (
        <p className="text-[10px] text-phantom-gray-300 mt-1.5">
          {new Date(date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
