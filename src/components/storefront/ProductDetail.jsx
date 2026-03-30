import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Download, ShoppingBag, Zap, ChevronLeft, ChevronRight, Store, Loader2 } from 'lucide-react';
import { getProduct, getReviews } from '../../api/storefronts';
import { formatBTC, formatUSD } from '../../utils/formatters';
import BuyModal from './BuyModal';
import ReviewCard from './ReviewCard';

const TYPE_LABELS = { digital: 'Digital Product', physical: 'Physical Product', service: 'Service' };
const TYPE_ICONS = { digital: Download, physical: ShoppingBag, service: Zap };

export default function ProductDetail({ product: initialProduct, btcPrice: parentBtcPrice, onBack, onStoreClick }) {
  const [product, setProduct] = useState(initialProduct);
  const [reviews, setReviews] = useState([]);
  const [btcPrice, setBtcPrice] = useState(parentBtcPrice || 0);
  const [loading, setLoading] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);
  const [showBuy, setShowBuy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getProduct(initialProduct.id);
        const data = res.data || res;
        setProduct(data);
        setReviews(data.reviews || []);
        setBtcPrice(data.btcPrice || parentBtcPrice || 0);
      } catch { /* use initial data */ }
      setLoading(false);
    };
    load();
  }, [initialProduct.id, parentBtcPrice]);

  const images = product.images || [];
  const priceSats = product.priceSats || product.price_sats || 0;
  const productType = product.productType || product.product_type || 'physical';
  const TypeIcon = TYPE_ICONS[productType] || ShoppingBag;
  const stock = product.stock ?? -1;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Image Carousel */}
      <div className="relative">
        <div className="aspect-square bg-gradient-to-br from-phantom-green/10 to-phantom-green/5 overflow-hidden">
          {images.length > 0 ? (
            <img src={images[imageIdx]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-phantom-green/20" />
            </div>
          )}
        </div>
        <button onClick={onBack} className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-4 h-4 text-phantom-charcoal" />
        </button>
        {images.length > 1 && (
          <>
            <button onClick={() => setImageIdx((imageIdx - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setImageIdx((imageIdx + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imageIdx ? 'bg-white w-4' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-phantom-green/10 text-phantom-green flex items-center gap-1">
            <TypeIcon className="w-3 h-3" /> {TYPE_LABELS[productType]}
          </span>
          {stock > 0 && stock < 10 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
              Only {stock} left
            </span>
          )}
          {stock === 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
              Sold Out
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-phantom-charcoal">{product.title}</h1>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-phantom-green">{formatBTC(priceSats)}</span>
          {btcPrice > 0 && (
            <span className="text-sm text-phantom-gray-400">
              ~{formatUSD((priceSats / 100000000) * btcPrice)}
            </span>
          )}
        </div>

        {/* Seller / Store */}
        {product.storefront && (
          <button
            onClick={() => onStoreClick?.(product.storefront)}
            className="flex items-center gap-2 w-full p-2.5 bg-phantom-gray-50 rounded-xl hover:bg-phantom-gray-100 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-phantom-green/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.storefront.avatarUrl ? (
                <img src={product.storefront.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-4 h-4 text-phantom-green/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-phantom-charcoal truncate">{product.storefront.name}</p>
              {product.storefront.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] text-phantom-gray-400">{parseFloat(product.storefront.rating).toFixed(1)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-phantom-gray-300" />
          </button>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="text-xs font-bold text-phantom-charcoal mb-1">Description</h3>
            <p className="text-sm text-phantom-gray-500 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        )}

        {/* Tags */}
        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-phantom-gray-50 text-phantom-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-phantom-charcoal mb-2">Reviews ({reviews.length})</h3>
            <div className="space-y-2">
              {reviews.slice(0, 5).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buy Button */}
      <div className="px-5 py-4 border-t border-phantom-gray-200">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowBuy(true)}
          disabled={stock === 0}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            stock === 0
              ? 'bg-phantom-gray-100 text-phantom-gray-400 cursor-not-allowed'
              : 'bg-phantom-green text-white hover:bg-phantom-green-dark shadow-green-glow/30'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {stock === 0 ? 'Sold Out' : `Buy Now — ${formatBTC(priceSats)}`}
        </motion.button>
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {showBuy && (
          <BuyModal
            product={product}
            btcPrice={btcPrice}
            onClose={() => setShowBuy(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
