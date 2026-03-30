import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Store, Package, ShoppingCart, DollarSign, Plus, Star, ChevronRight, Loader2, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { getMyStorefronts, getMySales, getMyPurchases } from '../../api/storefronts';
import { formatBTC, formatUSD } from '../../utils/formatters';
import CreateStorefront from './CreateStorefront';
import CreateProduct from './CreateProduct';
import OrderCard from './OrderCard';
import toast from 'react-hot-toast';

export default function SellerDashboard({ onBack, btcPrice }) {
  const [tab, setTab] = useState('stores'); // stores, sales, purchases
  const [stores, setStores] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(null);
  const [salesBtcPrice, setSalesBtcPrice] = useState(btcPrice || 0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storeRes, salesRes, purchaseRes] = await Promise.all([
          getMyStorefronts().catch(() => ({ data: [] })),
          getMySales().catch(() => ({ data: { orders: [] } })),
          getMyPurchases().catch(() => ({ data: { orders: [] } })),
        ]);
        setStores(Array.isArray(storeRes.data) ? storeRes.data : []);
        setSales(salesRes.data?.orders || []);
        setPurchases(purchaseRes.data?.orders || []);
        setSalesBtcPrice(salesRes.data?.btcPrice || purchaseRes.data?.btcPrice || btcPrice || 0);
      } catch (e) {
        console.error('[Seller] Load error:', e);
      }
      setLoading(false);
    };
    load();
  }, [btcPrice]);

  const totalRevenue = stores.reduce((sum, s) => sum + (parseInt(s.totalRevenueSats || s.total_revenue_sats || 0)), 0);
  const totalSales = stores.reduce((sum, s) => sum + (s.totalSales || s.total_sales || 0), 0);
  const pendingSales = sales.filter((o) => ['pending', 'escrow_funded'].includes(o.status));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-phantom-gray-50 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-phantom-charcoal" />
          </button>
          <h2 className="text-lg font-bold text-phantom-charcoal">My Store</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-phantom-green/5 rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-phantom-green mx-auto mb-1" />
            <p className="text-lg font-bold text-phantom-charcoal">{totalSales}</p>
            <p className="text-[10px] text-phantom-gray-400">Sales</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <DollarSign className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-phantom-charcoal">{formatBTC(totalRevenue)}</p>
            <p className="text-[10px] text-phantom-gray-400">Revenue</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-phantom-charcoal">{pendingSales.length}</p>
            <p className="text-[10px] text-phantom-gray-400">Pending</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-phantom-gray-50 rounded-xl p-1">
          {[
            { id: 'stores', label: 'Stores', icon: Store },
            { id: 'sales', label: 'Sales', icon: ShoppingCart },
            { id: 'purchases', label: 'Purchases', icon: Package },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                tab === id ? 'bg-white text-phantom-charcoal shadow-sm' : 'text-phantom-gray-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-phantom-green animate-spin" />
          </div>
        ) : (
          <>
            {/* Stores Tab */}
            {tab === 'stores' && (
              <div className="space-y-3">
                {stores.map((store) => (
                  <div key={store.id} className="bg-phantom-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-phantom-green/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {store.avatarUrl || store.avatar_url ? (
                          <img src={store.avatarUrl || store.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5 text-phantom-green/40" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-phantom-charcoal">{store.name}</p>
                        <div className="flex items-center gap-3 text-[10px] text-phantom-gray-400">
                          <span>{store._count?.listings || 0} products</span>
                          <span>{store.totalSales || store.total_sales || 0} sales</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            {parseFloat(store.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddProduct(store.id)}
                      className="w-full py-2 bg-phantom-green/10 text-phantom-green text-xs font-semibold rounded-lg flex items-center justify-center gap-1 hover:bg-phantom-green/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full py-3 border-2 border-dashed border-phantom-gray-200 rounded-xl text-sm font-semibold text-phantom-gray-400 flex items-center justify-center gap-2 hover:border-phantom-green/30 hover:text-phantom-green transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create New Storefront
                </button>
              </div>
            )}

            {/* Sales Tab */}
            {tab === 'sales' && (
              <div className="space-y-2">
                {sales.length > 0 ? (
                  sales.map((order) => (
                    <OrderCard key={order.id} order={order} role="seller" btcPrice={salesBtcPrice} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                    <p className="text-phantom-gray-400 text-xs">No sales yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Purchases Tab */}
            {tab === 'purchases' && (
              <div className="space-y-2">
                {purchases.length > 0 ? (
                  purchases.map((order) => (
                    <OrderCard key={order.id} order={order} role="buyer" btcPrice={salesBtcPrice} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                    <p className="text-phantom-gray-400 text-xs">No purchases yet</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateStorefront
            onClose={() => setShowCreate(false)}
            onCreated={(sf) => {
              setShowCreate(false);
              setStores((prev) => [sf, ...prev]);
              toast.success('Storefront created!');
            }}
          />
        )}
        {showAddProduct && (
          <CreateProduct
            storefrontId={showAddProduct}
            onClose={() => setShowAddProduct(null)}
            onCreated={() => {
              setShowAddProduct(null);
              // Refresh stores to update product count
              getMyStorefronts().then((res) => setStores(Array.isArray(res.data) ? res.data : [])).catch(() => {});
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
