import { motion } from 'framer-motion';
import { ShoppingBag, Download, Zap, Star } from 'lucide-react';
import { formatBTC, formatUSD } from '../../utils/formatters';

const TYPE_BADGES = {
  digital: { icon: Download, label: 'Digital', color: 'bg-blue-50 text-blue-600' },
  physical: { icon: ShoppingBag, label: 'Physical', color: 'bg-green-50 text-green-600' },
  service: { icon: Zap, label: 'Service', color: 'bg-purple-50 text-purple-600' },
};

export default function ProductCard({ product, btcPrice, index = 0, onClick }) {
  const badge = TYPE_BADGES[product.productType || product.product_type] || TYPE_BADGES.physical;
  const BadgeIcon = badge.icon;
  const images = product.images || [];
  const priceSats = product.priceSats || product.price_sats || 0;
  const storeName = product.storefront?.name || '';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-soft border border-phantom-gray-200/50 hover:shadow-card transition-all text-left"
    >
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-phantom-green/10 to-phantom-green/5 relative overflow-hidden">
        {images.length > 0 ? (
          <img src={images[0]} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-phantom-green/30" />
          </div>
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.color} flex items-center gap-0.5`}>
          <BadgeIcon className="w-2.5 h-2.5" /> {badge.label}
        </span>
        {/* Stock badge */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold">SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-phantom-charcoal truncate">{product.title}</h4>
        {storeName && (
          <p className="text-[10px] text-phantom-gray-400 mt-0.5 truncate">{storeName}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-xs font-bold text-phantom-green">{formatBTC(priceSats)}</p>
            {btcPrice > 0 && (
              <p className="text-[10px] text-phantom-gray-400">
                ~{formatUSD((priceSats / 100000000) * btcPrice)}
              </p>
            )}
          </div>
          {product.totalSold > 0 && (
            <span className="text-[10px] text-phantom-gray-400">
              {product.totalSold || product.total_sold} sold
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
