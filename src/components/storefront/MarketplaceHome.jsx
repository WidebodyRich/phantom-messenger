import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Star, ShoppingBag, TrendingUp, Sparkles, Store, ChevronRight, Loader2 } from 'lucide-react';
import { discoverStorefronts, getFeaturedStorefronts, getTrendingProducts } from '../../api/storefronts';
import { formatBTC, formatUSD } from '../../utils/formatters';
import ProductCard from './ProductCard';
import StorefrontPage from './StorefrontPage';
import CreateStorefront from './CreateStorefront';
import ProductDetail from './ProductDetail';
import SellerDashboard from './SellerDashboard';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Digital', 'Physical', 'Services', 'Stickers', 'Premium'];

export default function MarketplaceHome() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [featured, setFeatured] = useState([]);
  const [stores, setStores] = useState([]);
  const [trending, setTrending] = useState([]);
  const [btcPrice, setBtcPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeStore, setActiveStore] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [showSeller, setShowSeller] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [featRes, discRes, trendRes] = await Promise.all([
        getFeaturedStorefronts().catch(() => ({ data: [] })),
        discoverStorefronts({ category: category !== 'All' ? category : undefined, q: search || undefined }).catch(() => ({ data: { storefronts: [], btcPrice: 0 } })),
        getTrendingProducts().catch(() => ({ data: { products: [], btcPrice: 0 } })),
      ]);
      setFeatured(Array.isArray(featRes.data) ? featRes.data : []);
      setStores(discRes.data?.storefronts || []);
      setTrending(trendRes.data?.products || []);
      setBtcPrice(discRes.data?.btcPrice || trendRes.data?.btcPrice || 0);
    } catch (e) {
      console.error('[Market] Load error:', e);
    }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { loadData(); }, [loadData]);

  // Navigate back from nested views
  if (activeProduct) {
    return (
      <ProductDetail
        product={activeProduct}
        btcPrice={btcPrice}
        onBack={() => setActiveProduct(null)}
        onStoreClick={(store) => { setActiveProduct(null); setActiveStore(store); }}
      />
    );
  }

  if (activeStore) {
    return (
      <StorefrontPage
        storefrontId={activeStore.id || activeStore.slug || activeStore}
        onBack={() => setActiveStore(null)}
        onProductClick={(p) => setActiveProduct(p)}
        btcPrice={btcPrice}
      />
    );
  }

  if (showSeller) {
    return <SellerDashboard onBack={() => setShowSeller(false)} btcPrice={btcPrice} />;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-phantom-charcoal flex items-center gap-2">
            <Store className="w-5 h-5 text-phantom-green" />
            Marketplace
          </h2>
          <button
            onClick={() => setShowSeller(true)}
            className="text-xs font-semibold text-phantom-green hover:underline"
          >
            My Store
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-phantom-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores & products..."
            className="w-full bg-phantom-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-transparent focus:border-phantom-green/30 transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-phantom-green text-white'
                  : 'bg-phantom-gray-50 text-phantom-gray-500 hover:bg-phantom-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-phantom-green animate-spin" />
          </div>
        ) : (
          <>
            {/* Featured Stores */}
            {featured.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-phantom-charcoal flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Featured Stores
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {featured.map((store) => (
                    <motion.button
                      key={store.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveStore(store)}
                      className="flex-shrink-0 w-28 text-center"
                    >
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-phantom-green/20 to-phantom-green/5 flex items-center justify-center overflow-hidden border-2 border-phantom-green/20">
                        {store.avatarUrl ? (
                          <img src={store.avatarUrl} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-8 h-8 text-phantom-green/40" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-phantom-charcoal mt-2 truncate">{store.name}</p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-phantom-gray-400">{parseFloat(store.rating || 0).toFixed(1)}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}

            {/* Browse Stores */}
            {stores.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-phantom-charcoal flex items-center gap-1.5 mb-3">
                  <Store className="w-4 h-4 text-phantom-green" /> Browse Stores
                </h3>
                <div className="space-y-2">
                  {stores.map((store) => (
                    <motion.button
                      key={store.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveStore(store)}
                      className="w-full flex items-center gap-3 p-3 bg-phantom-gray-50 rounded-xl hover:bg-phantom-gray-100 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-phantom-green/20 to-phantom-green/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {store.avatarUrl ? (
                          <img src={store.avatarUrl} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5 text-phantom-green/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-phantom-charcoal truncate">{store.name}</p>
                          {store.isVerified && (
                            <span className="w-4 h-4 bg-phantom-green rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[8px]">✓</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-phantom-gray-400 truncate">{store.description || store.category || 'General store'}</p>
                      </div>
                      <div className="flex items-center gap-1 text-phantom-gray-300">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-phantom-gray-400">{parseFloat(store.rating || 0).toFixed(1)}</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending Products */}
            {trending.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-phantom-charcoal flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-4 h-4 text-phantom-green" /> Trending Items
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {trending.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      btcPrice={btcPrice}
                      index={i}
                      onClick={() => setActiveProduct(product)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {stores.length === 0 && trending.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-phantom-gray-200 mx-auto mb-4" />
                <p className="text-phantom-gray-400 text-sm font-medium">No stores yet</p>
                <p className="text-phantom-gray-300 text-xs mt-1">Be the first to create a storefront!</p>
              </div>
            )}
          </>
        )}

        {/* Create Storefront Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="w-full py-3.5 bg-phantom-green text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-phantom-green-dark transition-colors shadow-green-glow/30"
        >
          <Plus className="w-5 h-5" /> Create Your Storefront
        </motion.button>
      </div>

      {/* Create Storefront Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateStorefront
            onClose={() => setShowCreate(false)}
            onCreated={(sf) => {
              setShowCreate(false);
              loadData();
              toast.success('Storefront created!');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
