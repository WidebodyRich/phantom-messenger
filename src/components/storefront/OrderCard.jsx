import { useState } from 'react';
import { Clock, Truck, CheckCircle, AlertTriangle, Package, Download, Bitcoin, Shield, Loader2 } from 'lucide-react';
import { shipOrder, confirmOrder, disputeOrder } from '../../api/storefronts';
import { formatBTC, formatUSD } from '../../utils/formatters';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Awaiting Payment', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  escrow_funded: { icon: Bitcoin, label: 'Payment Received', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
  shipped: { icon: Truck, label: 'Shipped', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
  completed: { icon: CheckCircle, label: 'Completed', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
  disputed: { icon: AlertTriangle, label: 'Disputed', color: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
  resolved: { icon: Shield, label: 'Resolved', color: 'bg-gray-50 text-gray-500', dot: 'bg-gray-400' },
};

export default function OrderCard({ order, role = 'buyer', btcPrice }) {
  const [acting, setActing] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [showTracking, setShowTracking] = useState(false);
  const [disputeInput, setDisputeInput] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const priceSats = parseInt(order.price_sats || order.priceSats || 0);
  const totalSats = parseInt(order.total_sats || order.totalSats || 0);
  const feeSats = parseInt(order.platform_fee_sats || order.platformFeeSats || 0);
  const isDigital = order.product_type === 'digital' || order.productType === 'digital';

  const handleShip = async () => {
    setActing(true);
    try {
      await shipOrder(order.id, trackingInput || null);
      toast.success('Marked as shipped!');
      order.status = 'shipped';
      order.tracking_number = trackingInput;
      setShowTracking(false);
    } catch (e) { toast.error(e.message || 'Failed'); }
    setActing(false);
  };

  const handleConfirm = async () => {
    setActing(true);
    try {
      await confirmOrder(order.id);
      toast.success('Order confirmed! Escrow released.');
      order.status = 'completed';
    } catch (e) { toast.error(e.message || 'Failed'); }
    setActing(false);
  };

  const handleDispute = async () => {
    setActing(true);
    try {
      await disputeOrder(order.id, disputeInput || 'Issue with order');
      toast.success('Dispute opened');
      order.status = 'disputed';
      setShowDispute(false);
    } catch (e) { toast.error(e.message || 'Failed'); }
    setActing(false);
  };

  return (
    <div className="bg-phantom-gray-50 rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-phantom-green/10 to-phantom-green/5 flex items-center justify-center overflow-hidden flex-shrink-0">
            {order.product_images?.[0] ? (
              <img src={order.product_images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-phantom-green/30" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-phantom-charcoal truncate">
              {order.product_title || 'Product'}
            </p>
            <p className="text-[10px] text-phantom-gray-400">
              {role === 'seller'
                ? `Buyer: ${order.buyer_username || 'Unknown'}`
                : `Seller: ${order.seller_username || 'Unknown'}`}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Price info */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-phantom-gray-400">
          {order.quantity > 1 ? `${order.quantity}x ` : ''}{formatBTC(priceSats)}
          {feeSats > 0 && <span className="text-[10px]"> + {feeSats.toLocaleString()} fee</span>}
        </span>
        <span className="font-bold text-phantom-green">{formatBTC(totalSats)}</span>
      </div>

      {/* Tracking info */}
      {order.tracking_number && (
        <p className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg mb-2">
          Tracking: {order.tracking_number}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {/* Seller: Mark shipped */}
        {role === 'seller' && order.status === 'escrow_funded' && !isDigital && (
          showTracking ? (
            <div className="flex-1 flex gap-1">
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Tracking # (optional)"
                className="flex-1 bg-white rounded-lg px-2 py-1.5 text-xs border border-phantom-gray-200 outline-none focus:border-phantom-green/30"
              />
              <button
                onClick={handleShip}
                disabled={acting}
                className="px-3 py-1.5 bg-phantom-green text-white text-[10px] font-bold rounded-lg"
              >
                {acting ? '...' : 'Ship'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTracking(true)}
              className="flex-1 py-1.5 bg-phantom-green/10 text-phantom-green text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
            >
              <Truck className="w-3 h-3" /> Mark Shipped
            </button>
          )
        )}

        {/* Buyer: Confirm receipt */}
        {role === 'buyer' && ['shipped', 'escrow_funded'].includes(order.status) && !isDigital && (
          <button
            onClick={handleConfirm}
            disabled={acting}
            className="flex-1 py-1.5 bg-phantom-green text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
          >
            {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Confirm Receipt
          </button>
        )}

        {/* Buyer: Download digital */}
        {role === 'buyer' && order.status === 'completed' && isDigital && (
          <a
            href={`/api/orders/${order.id}/digital-download`}
            className="flex-1 py-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
          >
            <Download className="w-3 h-3" /> Download
          </a>
        )}

        {/* Buyer: Dispute */}
        {role === 'buyer' && ['shipped', 'escrow_funded'].includes(order.status) && (
          showDispute ? (
            <div className="flex-1 flex gap-1">
              <input
                type="text"
                value={disputeInput}
                onChange={(e) => setDisputeInput(e.target.value)}
                placeholder="Reason..."
                className="flex-1 bg-white rounded-lg px-2 py-1.5 text-xs border border-phantom-gray-200 outline-none"
              />
              <button
                onClick={handleDispute}
                disabled={acting}
                className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg"
              >
                {acting ? '...' : 'Submit'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDispute(true)}
              className="py-1.5 px-3 bg-red-50 text-red-500 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" /> Dispute
            </button>
          )
        )}
      </div>

      {/* Timestamp */}
      <p className="text-[9px] text-phantom-gray-300 mt-2">
        {new Date(order.created_at || order.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
