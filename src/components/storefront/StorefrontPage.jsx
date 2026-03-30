import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Users, ShoppingBag, Heart, MessageCircle, Store, ChevronRight, Loader2, Lock, Shield } from 'lucide-react';
import { getStorefront, followStorefront, unfollowStorefront, getFollowStatus } from '../../api/storefronts';
import { formatBTC, formatUSD } from '../../utils/formatters';
import ProductCard from './ProductCard';
import toast from 'react-hot-toast';

export default function StorefrontPage({ storefrontId, onBack, onProductClick, btcPrice: parentBtcPrice }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [btcPrice, setBtcPrice] = useState(parentBtcPrice || 0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getStorefront(storefrontId);
        if (res.success !== false) {
          setStore(res.data || res);
          setBtcPrice(res.data?.btcPrice || res.btcPrice || parentBtcPrice || 0);
        }
        // Check follow status
        try {
          const followRes = await getFollowStatus(typeof storefrontId === 'string' ? storefrontId : res.data?.id);
          setFollowing(followRes.data?.following || false);
        } catch {}
      } catch (e) {
        toast.error('Failed to load storefront');
      }
      setLoading(false);
    };
    load();
  }, [storefrontId, parentBtcPrice]);

  const handleFollow = async () => {
    try {
      if (following) {
        await unfollowStorefront(store.id);
        setFollowing(false);
        toast('Unfollowed');
      } else {
        await followStorefront(store.id);
        setFollowing(true);
        toast.success('Following!');
      }
    } catch { toast.error('Failed'); }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-phantom-green animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white px-5">
        <Store className="w-16 h-16 text-phantom-gray-200 mb-4" />
        <p className="text-phantom-gray-400 text-sm">Storefront not found</p>
        <button onClick={onBack} className="text-phantom-green text-sm font-semibold mt-4">Go back</button>
      </div>
    );
  }

  const listings = store.listings || [];
  const filtered = filter === 'all'
    ? listings
    : listings.filter(p => (p.productType || p.product_type) === filter);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Banner */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-phantom-green/20 to-phantom-green/5 overflow-hidden">
          {store.bannerUrl && (
            <img src={store.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          )}
        </div>
        <button
          onClick={onBack}
          className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-phantom-charcoal" />
        </button>
      </div>

      {/* Store Info */}
      <div className="px-5 -mt-8 relative z-10">
        <div className="flex items-end gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-card overflow-hidden flex items-center justify-center">
            {store.avatarUrl ? (
              <img src={store.avatarUrl} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-7 h-7 text-phantom-green/40" />
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-phantom-charcoal">{store.name}</h2>
              {store.isVerified && (
                <Shield className="w-4 h-4 text-phantom-green fill-phantom-green/20" />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-phantom-gray-400">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {parseFloat(store.rating || 0).toFixed(1)}
              </span>
              <span>{store.totalSales || store.total_sales || 0} sales</span>
              {store.followerCount > 0 && <span>{store.followerCount} followers</span>}
              {!store.isPublic && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
          </div>
        </div>

        {store.description && (
          <p className="text-xs text-phantom-gray-500 mt-3 leading-relaxed">{store.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleFollow}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              following
                ? 'bg-phantom-gray-100 text-phantom-gray-500'
                : 'bg-phantom-green text-white hover:bg-phantom-green-dark'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${following ? 'fill-current' : ''}`} />
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="flex-1 py-2 rounded-xl text-xs font-semibold bg-phantom-gray-50 text-phantom-charcoal hover:bg-phantom-gray-100 transition-all flex items-center justify-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> Message
          </button>
        </div>
      </div>

      {/* Product filters */}
      <div className="px-5 mt-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-phantom-charcoal">Products ({listings.length})</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['all', 'digital', 'physical', 'service'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-phantom-green/10 text-phantom-green'
                  : 'bg-phantom-gray-50 text-phantom-gray-400 hover:bg-phantom-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                btcPrice={btcPrice}
                index={i}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
            <p className="text-phantom-gray-400 text-xs">No products yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
