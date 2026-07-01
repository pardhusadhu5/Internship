import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Truck, ShieldCheck, Flame, X, ShoppingBag, Loader2 } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

const PhoneIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="w-4 h-4 animate-bounce"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const Clock: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth="2" 
    stroke="currentColor" 
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"></path>
  </svg>
);

const ParcelSection: React.FC = () => {
  const { parcelItems, setBgImage, orders, placeParcelOrder } = useApp();
  const [selectedPack, setSelectedPack] = useState<'ALL' | 'Couple Pack' | 'Family Pack' | 'Bucket Biryani'>('ALL');

  // Modal & Form State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [specialNotes, setSpecialNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(() => 
    localStorage.getItem('svd_active_takeaway_order_id')
  );

  // Sync state with localStorage if active order is completed
  const trackedOrder = orders.find(o => o.id === trackingOrderId);

  // If order status changes to PICKED_UP or COMPLETED, we can show completed tracking card but don't clear instantly
  // Let the user clear it manually.

  // Filter items
  const filteredParcels = parcelItems.filter(item => {
    return selectedPack === 'ALL' || item.category === selectedPack;
  });

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!/^[0-9]{10}$/.test(customerPhone.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const orderId = await placeParcelOrder(
        selectedItem,
        quantity,
        customerName.trim(),
        customerPhone.trim(),
        specialNotes.trim(),
        paymentMethod
      );

      if (orderId) {
        setSuccessOrderId(orderId);
        setTrackingOrderId(orderId);
        localStorage.setItem('svd_active_takeaway_order_id', orderId);
        // Clear modal form fields
        setCustomerName('');
        setCustomerPhone('');
        setQuantity(1);
        setSpecialNotes('');
      } else {
        setErrorMsg('Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'PLACED':
        return 1;
      case 'ACCEPTED':
        return 2;
      case 'PREPARING':
        return 3;
      case 'READY':
        return 4;
      case 'COMPLETED':
      case 'PICKED_UP':
      case 'PAID':
        return 5;
      default:
        return 1;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'PLACED':
        return 'Waiting for Acceptance';
      case 'ACCEPTED':
        return 'Order Accepted by Kitchen';
      case 'PREPARING':
        return 'Preparing in Kitchen';
      case 'READY':
        return 'Ready for Pickup! 🥡';
      case 'COMPLETED':
      case 'PICKED_UP':
      case 'PAID':
        return 'Completed & Picked Up';
      case 'CANCELLED':
        return 'Order Cancelled';
      default:
        return 'Processing';
    }
  };

  const clearTracking = () => {
    setTrackingOrderId(null);
    localStorage.removeItem('svd_active_takeaway_order_id');
  };

  return (
    <div className="w-full space-y-8 relative">
      
      {/* Live Order Tracker */}
      {trackingOrderId && (
        <div className="relative overflow-hidden bg-gradient-to-r from-maroon/10 via-saffron/10 to-maroon/10 p-6 rounded-3xl border border-maroon/20 dark:border-saffron/30 z-10 glass shadow-md">
          {trackedOrder ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-200/40 dark:border-neutral-800/40 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Live Order Status</span>
                  <h3 className="font-logo font-extrabold text-sm text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 mt-0.5">
                    Order ID: <span className="text-maroon dark:text-saffron">{trackedOrder.id}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-logo flex items-center gap-1.5 ${
                    trackedOrder.status === 'CANCELLED' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                      : trackedOrder.status === 'READY'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 animate-pulse'
                      : 'bg-saffron/20 text-maroon dark:text-saffron'
                  }`}>
                    {trackedOrder.status !== 'CANCELLED' && (
                      <span className={`w-2 h-2 rounded-full ${trackedOrder.status === 'READY' ? 'bg-emerald-500' : 'bg-saffron'} animate-ping`}></span>
                    )}
                    {getStatusText(trackedOrder.status)}
                  </span>
                  
                  {/* Clear tracking for completed/cancelled orders */}
                  {(trackedOrder.status === 'COMPLETED' || trackedOrder.status === 'PICKED_UP' || trackedOrder.status === 'PAID' || trackedOrder.status === 'CANCELLED') && (
                    <button 
                      onClick={clearTracking}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      title="Clear Status Tracker"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {trackedOrder.status !== 'CANCELLED' && (
                <div className="py-2">
                  {/* Stepper Bar */}
                  <div className="relative flex justify-between items-center w-full max-w-xl mx-auto">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-neutral-800 -translate-y-1/2 -z-10"></div>
                    
                    {/* Fill line */}
                    <div 
                      className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-maroon to-saffron -translate-y-1/2 -z-10 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, (getStatusStep(trackedOrder.status) - 1) * 25))}%` }}
                    ></div>

                    {[
                      { step: 1, label: 'Placed' },
                      { step: 2, label: 'Accepted' },
                      { step: 3, label: 'Cooking' },
                      { step: 4, label: 'Ready' },
                      { step: 5, label: 'Collected' }
                    ].map(node => {
                      const currentStep = getStatusStep(trackedOrder.status);
                      const isPast = node.step < currentStep;
                      const isCurrent = node.step === currentStep;

                      return (
                        <div key={node.step} className="flex flex-col items-center gap-1.5 bg-transparent">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-black transition-all ${
                            isPast 
                              ? 'bg-maroon dark:bg-saffron text-white dark:text-maroon border-maroon dark:border-saffron scale-105' 
                              : isCurrent
                              ? 'bg-white dark:bg-bg-dark text-maroon dark:text-saffron border-maroon dark:border-saffron scale-110 shadow-md ring-4 ring-maroon/10 dark:ring-saffron/10'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'
                          }`}>
                            {node.step}
                          </div>
                          <span className={`text-[9px] font-logo font-bold uppercase tracking-wider ${
                            isCurrent 
                              ? 'text-maroon dark:text-saffron font-black' 
                              : isPast 
                              ? 'text-neutral-700 dark:text-neutral-300' 
                              : 'text-neutral-400'
                          }`}>
                            {node.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white/40 dark:bg-neutral-900/40 border border-neutral-200/20 dark:border-neutral-800/20 rounded-2xl p-3 text-xs flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="font-logo font-extrabold text-neutral-700 dark:text-neutral-300">
                    {trackedOrder.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                  </span>
                  {trackedOrder.specialNotes && (
                    <p className="text-[10px] text-neutral-500 italic">Notes: "{trackedOrder.specialNotes}"</p>
                  )}
                </div>
                <span className="font-logo font-extrabold text-neutral-800 dark:text-neutral-100 bg-neutral-100/50 dark:bg-neutral-800/50 px-2 py-1 rounded-lg">
                  ₹{trackedOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
              <span className="italic">Order #{trackingOrderId} has been created and is syncing...</span>
              <button 
                onClick={clearTracking}
                className="text-maroon dark:text-saffron font-bold underline hover:no-underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Background packaging info banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 p-6 sm:p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/70 z-10 glass">
        
        {/* Ambient floating elements & Premium Animations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
          <div className="absolute top-6 left-10 text-2xl animate-float" style={{ animationDelay: '0s' }}>🌶️</div>
          <div className="absolute top-1/2 right-20 text-3xl animate-float" style={{ animationDelay: '2s' }}>🛍️</div>
          <div className="absolute bottom-10 left-1/4 text-2xl animate-float" style={{ animationDelay: '4s' }}>🍗</div>
          <div className="absolute top-1/4 left-3/4 text-xl animate-float" style={{ animationDelay: '1.5s' }}>🧅</div>
          <div className="absolute bottom-12 left-1/2 text-2xl animate-steam" style={{ animationDelay: '0s' }}>♨️</div>
          <div className="absolute bottom-16 left-1/2 text-lg animate-steam" style={{ animationDelay: '1s' }}>♨️</div>
          
          <div className="absolute top-8 right-12 flex items-center gap-1.5 animate-pulse bg-white/20 dark:bg-black/20 p-2 rounded-2xl border border-white/10" style={{ animationDuration: '3s' }}>
            <span className="text-xl">📦</span>
            <span className="text-xl">👨‍🍳</span>
            <span className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest leading-none">Packing</span>
          </div>

          <div className="absolute left-0 bottom-1 w-full h-8 overflow-hidden">
            <div className="text-2xl animate-bike absolute bottom-0 font-logo">🛵💨</div>
          </div>
        </div>

        <div className="max-w-2xl text-center mx-auto space-y-3 relative z-10 py-4">
          <h2 className="font-logo font-extrabold text-2xl sm:text-3xl text-maroon dark:text-saffron">
            Freshly Packed Takeaways
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-450 leading-relaxed max-w-xl mx-auto">
            Savor your favorite delicacies in the comfort of your home. We pack each event parcel and family combo with food-grade materials to preserve heat, flavor, and absolute hygiene.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-neutral-200/30 dark:border-neutral-800/30 mt-6 relative z-10 select-none">
          <div className="flex items-center gap-2.5 justify-center text-neutral-600 dark:text-neutral-400">
            <ShieldCheck className="w-5 h-5 text-saffron" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Hygienic Packs</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center text-neutral-600 dark:text-neutral-400">
            <Flame className="w-5 h-5 text-maroon dark:text-saffron" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Freshly Cooked</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center text-neutral-600 dark:text-neutral-400">
            <Clock className="w-5 h-5 text-saffron" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Fast Setup</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center text-neutral-600 dark:text-neutral-400">
            <Truck className="w-5 h-5 text-maroon dark:text-saffron" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Home Takeaway</span>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2.5 justify-center relative z-10">
        {(['ALL', 'Couple Pack', 'Family Pack', 'Bucket Biryani'] as const).map(pack => (
          <button 
            key={pack}
            onClick={() => setSelectedPack(pack)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all duration-200 ${
              selectedPack === pack
                ? 'bg-maroon text-white border-maroon dark:bg-saffron dark:text-maroon dark:border-saffron shadow-md scale-102'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-maroon/20 dark:hover:border-saffron/30 hover:bg-neutral-50 dark:hover:bg-neutral-850'
            }`}
          >
            {pack === 'ALL' ? 'Show All Packs' : pack}
          </button>
        ))}
      </div>

      {/* Parcel Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
        {filteredParcels.map(item => {
          return (
            <div 
              key={item.id}
              onClick={() => !item.disabled && setBgImage(item.image)}
              className={`flex flex-col justify-between bg-white dark:bg-neutral-900/60 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/70 overflow-hidden shadow-sm hover:shadow-lg hover:border-maroon/15 dark:hover:border-saffron/20 transition-all duration-300 relative group cursor-pointer ${item.disabled ? 'opacity-55 select-none' : ''}`}
            >
              <div className="w-full aspect-[4/3] sm:aspect-video overflow-hidden relative bg-neutral-100 dark:bg-neutral-850 flex-shrink-0">
                <ImageWithFallback 
                  src={item.image} 
                  alt={item.name} 
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${item.disabled ? 'grayscale' : ''}`}
                />
                
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-maroon to-red-700 dark:from-saffron dark:to-amber-500 text-white dark:text-neutral-950 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-logo shadow-md">
                    {item.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-10">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md border ${
                    item.type === 'veg' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-650 dark:text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {item.type === 'veg' ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-logo font-extrabold text-base text-neutral-850 dark:text-neutral-100 group-hover:text-maroon dark:group-hover:text-saffron transition-colors leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {item.description || 'Delicately crafted family pack served with authentic basmati rice, raita, and sherva side dishes.'}
                  </p>
                </div>
                
                <div 
                  className="pt-3 border-t border-neutral-100 dark:border-neutral-800/40 mt-3 flex items-center justify-between"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="font-logo font-extrabold text-base text-maroon dark:text-saffron bg-maroon/5 dark:bg-saffron/5 px-3 py-1 rounded-xl">
                    ₹{item.price}
                  </span>
                  
                  {item.disabled ? (
                    <span className="px-3 py-1.5 bg-red-55/10 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-[9px] rounded-xl border border-red-200 dark:border-red-900/30 uppercase tracking-wider select-none">
                      Unavailable
                    </span>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedItem(item);
                        setCustomerName('');
                        setCustomerPhone('');
                        setQuantity(1);
                        setSpecialNotes('');
                        setPaymentMethod('UPI');
                        setErrorMsg('');
                        setSuccessOrderId(null);
                      }}
                      className="flex items-center gap-1 px-4 py-2 bg-maroon dark:bg-saffron text-white dark:text-maroon font-logo font-bold text-xs rounded-xl shadow-sm hover:scale-103 hover:shadow-md active:scale-97 transition-all text-center border-none cursor-pointer"
                    >
                      Place Takeaway Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Takeaway Order Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-bg-dark border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden glass animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-850 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-maroon/10 text-maroon dark:bg-saffron/10 dark:text-saffron uppercase tracking-widest font-logo">
                  🥡 Takeaway Order
                </span>
                <h3 className="font-logo font-extrabold text-base text-neutral-850 dark:text-neutral-100 mt-1">
                  Customize Details
                </h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            {successOrderId ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl animate-pulse">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="font-logo font-extrabold text-sm text-neutral-850 dark:text-neutral-100">
                    Order Placed Successfully!
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Your order was successfully sent to the kitchen.
                  </p>
                </div>
                <div className="bg-neutral-55/10 dark:bg-neutral-850/30 border border-neutral-200/20 dark:border-neutral-800/20 rounded-2xl p-3 text-xs max-w-xs mx-auto space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Order Reference</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{successOrderId}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Item</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{selectedItem.name}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Payment Mode</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{paymentMethod}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-3 bg-maroon dark:bg-saffron text-white dark:text-maroon font-logo font-bold text-xs rounded-xl shadow-sm hover:scale-101 active:scale-99 transition-all border-none cursor-pointer"
                >
                  Track in Main Page
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="p-5 space-y-4">
                {/* Item Summary Card */}
                <div className="flex gap-3 bg-neutral-50 dark:bg-neutral-850/30 border border-neutral-100 dark:border-neutral-800/40 p-3 rounded-2xl">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                    <ImageWithFallback src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-logo font-bold text-xs text-neutral-800 dark:text-neutral-200 line-clamp-1">
                      {selectedItem.name}
                    </h5>
                    <span className="font-logo font-extrabold text-xs text-maroon dark:text-saffron">
                      ₹{selectedItem.price} per pack
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 p-2.5 rounded-xl text-center text-[10px] font-bold text-red-650 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Customer Name *</label>
                    <input 
                      type="text" 
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-maroon dark:focus:border-saffron"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Mobile Number *</label>
                    <input 
                      type="tel" 
                      required
                      maxLength={10}
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-maroon dark:focus:border-saffron"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Quantity</label>
                      <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-850 h-[38px] px-1">
                        <button 
                          type="button"
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800 text-sm font-bold bg-transparent border-none cursor-pointer text-neutral-600 dark:text-neutral-400"
                        >
                          -
                        </button>
                        <span className="font-logo font-black text-xs text-neutral-800 dark:text-neutral-100">
                          {quantity}
                        </span>
                        <button 
                          type="button"
                          onClick={() => setQuantity(prev => prev + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800 text-sm font-bold bg-transparent border-none cursor-pointer text-neutral-600 dark:text-neutral-400"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Payment Mode</label>
                      <select 
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as any)}
                        className="w-full border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-850 h-[38px] text-xs px-2.5 text-neutral-850 dark:text-neutral-200 focus:outline-none focus:border-maroon dark:focus:border-saffron cursor-pointer"
                      >
                        <option value="UPI">UPI (Quick Scan)</option>
                        <option value="Cash">Cash at Counter</option>
                        <option value="Card">Card at Counter</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Order Notes (Optional)</label>
                    <input 
                      type="text" 
                      value={specialNotes}
                      onChange={e => setSpecialNotes(e.target.value)}
                      placeholder="e.g. Extra spicy, no onions"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-maroon dark:focus:border-saffron"
                    />
                  </div>
                </div>

                {/* Total Summary */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-850 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Subtotal</span>
                  <span className="font-logo font-black text-base text-maroon dark:text-saffron bg-maroon/5 dark:bg-saffron/5 px-3 py-1 rounded-xl">
                    ₹{selectedItem.price * quantity}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl font-logo font-bold text-xs text-neutral-500 dark:text-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-all bg-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-maroon dark:bg-saffron text-white dark:text-maroon font-logo font-black uppercase text-xs rounded-xl shadow-md hover:scale-101 active:scale-99 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Send to Kitchen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Catering Callout */}
      <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-saffron/30 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden select-none mt-12">
        <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-saffron/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-maroon/15 blur-3xl pointer-events-none"></div>

        <div className="space-y-3 text-center md:text-left relative z-10 flex-1">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron/10 border border-saffron/25 text-saffron text-[9px] font-bold uppercase tracking-widest">
              ✨ Premium Services
            </span>
            <h3 className="font-logo font-black text-xl sm:text-2xl text-white tracking-wide leading-tight">
              Bulk Catering &amp; Event Orders
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
              Make your celebrations unforgettable. We cater premium wedding receptions, birthday celebrations, and corporate dinners with verified gourmet menus and high standards of taste.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 max-w-md mx-auto md:mx-0">
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-saffron text-sm">🎉</span>
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">Parties &amp; Birthdays</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-saffron text-sm">💍</span>
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">Weddings &amp; Catering</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-saffron text-sm">🏢</span>
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">Corporate Catering</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-saffron text-sm">🍽️</span>
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">Family AC Buffets</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-shrink-0 flex justify-center w-full md:w-auto">
          <a 
            href="tel:9966315544"
            className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-saffron to-amber-500 hover:from-amber-500 hover:to-saffron text-neutral-950 font-logo font-black uppercase text-xs rounded-2xl shadow-lg hover:scale-103 transition-all flex items-center justify-center gap-2 border border-amber-400/20"
          >
            <PhoneIcon />
            <span>Call 9966315544</span>
          </a>
        </div>
      </div>

    </div>
  );
};

export default ParcelSection;
