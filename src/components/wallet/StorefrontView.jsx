import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Bitcoin, Star, ExternalLink } from 'lucide-react';
import { formatBTC, formatUSD } from '../../utils/formatters';
import { getBTCPriceUSD } from '../../api/wallet';
import toast from 'react-hot-toast';

const DEMO_ITEMS = [
  { id: 1, name: 'Phantom Sticker Pack', description: 'Exclusive ghost stickers for chat', price: 5000, category: 'Stickers', image: null },
  { id: 2, name: 'Premium Theme', description: 'Custom dark theme with neon accents', price: 15000, category: 'Premium', image: null },
  { id: 3, name: 'Vanity Username', description: 'Reserve a 3-character username', price: 100000, category: 'Premium', image: null },
  { id: 4, name: 'Digital Art Pack', description: '10 exclusive Phantom NFT artworks', price: 50000, category: 'Digital', image: null },
  { id: 5, name: 'Ghost Emoji Set', description: '50 custom ghost emojis', price: 8000, category: 'Stickers', image: null },
  { id: 6, name: 'Pro Upgrade - 1 Month', description: 'Unlock all Pro features', price: 500000, category: 'Premium', image: null },
];

const CATEGORIES = ['All', 'Digital', 'Stickers', 'Premium'];

export default function StorefrontView() {
  const [category, setCategory] = useState('All');
  const [btcPrice, setBtcPrice] = useState(0);

  useEffect(() => { getBTCPriceUSD().then(setBtcPrice); }, []);

  const filtered = category === 'All' ? DEMO_ITEMS : DEMO_ITEMS.filter(i => i.category === category);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-phantom-charcoal mb-4">Storefront</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat ? 'bg-phantom-green text-white' : 'bg-phantom-gray-50 text-phantom-gray-500 hover:bg-phantom-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-phantom-gray-50 rounded-2xl overflow-hidden hover:shadow-card transition-all"
            >
              <div className="aspect-square bg-gradient-to-br from-phantom-green/10 to-phantom-green/5 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-phantom-green/30" />
              </div>
              <div className="p-3">
                <h4 className="text-sm font-semibold text-phantom-charcoal truncate">{item.name}</h4>
                <p className="text-xs text-phantom-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs font-bold text-phantom-charcoal">{formatBTC(item.price)}</p>
                    <p className="text-[10px] text-phantom-gray-400">{formatUSD((item.price / 100000000) * btcPrice)}</p>
                  </div>
                  <button
                    onClick={() => toast(`Purchase "${item.name}" coming soon! BTC payments will be available in the next update.`, { icon: '🛍️', duration: 4000 })}
                    className="bg-phantom-green text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-phantom-green-dark transition-all active:scale-95"
                  >
                    Buy
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
