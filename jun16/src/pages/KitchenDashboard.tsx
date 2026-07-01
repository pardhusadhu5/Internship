import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import AuthGate from '../components/AuthGate';
import { Flame, Clock, User, Phone, CheckCircle2, Play, LogOut, Info, XCircle } from 'lucide-react';

const KitchenDashboard: React.FC = () => {
  const { orders, updateOrderStatus, kitchenSession, logout } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(!!kitchenSession);
  const [filter, setFilter] = useState<'ALL' | 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED'>('ALL');
  
  const prevOrdersCountRef = useRef(orders.length);

  // --- AUDIO CHIME PLAYER ---
  const playNewOrderChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      
      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      
      osc1.start(audioCtx.currentTime);
      osc2.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.8);
      osc2.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio Context interaction required first.');
    }
  };

  // Trigger sound when orders list length increases
  useEffect(() => {
    if (orders.length > prevOrdersCountRef.current) {
      const latestOrder = orders[orders.length - 1];
      if (latestOrder && (latestOrder.status === 'PLACED' || latestOrder.status === 'NEW')) {
        playNewOrderChime();
      }
    }
    prevOrdersCountRef.current = orders.length;
  }, [orders]);

  const handleLogoutClick = () => {
    if (confirm('Are you sure you want to log out from the Kitchen Portal?')) {
      logout('kitchen');
      setIsAuthenticated(false);
    }
  };

  // Filter KDS tickets (KDS ALL only shows cooking states; READY shows completed items)
  const filteredTickets = orders.filter(o => {
    if (o.status === 'PAID') return false;
    
    if (filter === 'ALL') {
      return o.status === 'PLACED' || o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'PREPARING';
    }
    if (filter === 'PLACED') {
      return o.status === 'PLACED' || o.status === 'NEW';
    }
    if (filter === 'PREPARING') {
      return o.status === 'PREPARING' || o.status === 'ACCEPTED';
    }
    if (filter === 'READY') {
      return o.status === 'READY';
    }
    if (filter === 'COMPLETED') {
      return o.status === 'COMPLETED' || o.status === 'PICKED_UP';
    }
    return o.status === filter;
  });

  if (!isAuthenticated) {
    return <AuthGate role="kitchen" onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* KDS Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4 no-print">
        <div>
          <h2 className="font-logo font-extrabold text-2xl text-maroon dark:text-saffron flex items-center gap-2">
            <Flame className="w-6 h-6 animate-pulse" /> Kitchen Live Order Board
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-450">Real-time KDS display monitor for chef crews</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-2 border border-neutral-300 dark:border-neutral-700 hover:border-red-500 rounded-xl text-xs font-semibold transition-all hover:text-red-500 bg-transparent cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Kanban Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-print">
        {(['ALL', 'PLACED', 'PREPARING', 'READY', 'COMPLETED'] as const).map(f => {
          let badgeCount = 0;
          if (f === 'ALL') {
            badgeCount = orders.filter(o => o.status === 'PLACED' || o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
          } else if (f === 'PLACED') {
            badgeCount = orders.filter(o => o.status === 'PLACED' || o.status === 'NEW').length;
          } else if (f === 'PREPARING') {
            badgeCount = orders.filter(o => o.status === 'PREPARING' || o.status === 'ACCEPTED').length;
          } else if (f === 'READY') {
            badgeCount = orders.filter(o => o.status === 'READY').length;
          } else if (f === 'COMPLETED') {
            badgeCount = orders.filter(o => o.status === 'COMPLETED' || o.status === 'PICKED_UP').length;
          }

          return (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                filter === f 
                  ? 'bg-maroon text-white border-maroon dark:bg-saffron dark:text-maroon dark:border-saffron shadow-sm'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-355 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <span>{f === 'ALL' ? 'All Cooking Tickets' : f === 'READY' ? 'Ready' : f === 'COMPLETED' ? 'Completed' : f}</span>
              {badgeCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  filter === f
                    ? 'bg-white text-maroon dark:bg-maroon dark:text-saffron'
                    : 'bg-maroon/10 text-maroon dark:bg-saffron/10 dark:text-saffron'
                }`}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KDS Tickets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full text-center py-20 text-neutral-400 text-sm bg-white dark:bg-bg-dark border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl glass select-none">
            <Flame className="w-12 h-12 mx-auto opacity-10 mb-2" />
            No active orders in this pipeline stage.
          </div>
        ) : (
          filteredTickets.map(order => {
            const minutesElapsed = Math.floor((Date.now() - order.timestamp) / 60000);
            
            let cardBorder = 'border-neutral-200 dark:border-neutral-800';
            let headerBg = 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300';
            
            if (order.status === 'NEW' || order.status === 'PLACED') {
              cardBorder = order.status === 'NEW' 
                ? 'border-amber-500 dark:border-saffron ring-4 ring-amber-500/20 shadow-md shadow-amber-500/5 dark:shadow-saffron/5 animate-pulse' 
                : 'border-amber-400/50';
              headerBg = order.status === 'NEW'
                ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white font-extrabold shadow-md'
                : 'bg-amber-500 text-white shadow-md shadow-amber-500/10';
            } else if (order.status === 'ACCEPTED') {
              cardBorder = 'border-blue-400 dark:border-blue-800';
              headerBg = 'bg-blue-600 text-white shadow-md';
            } else if (order.status === 'PREPARING') {
              cardBorder = 'border-maroon/40 dark:border-saffron/40';
              headerBg = 'bg-maroon text-white dark:bg-saffron dark:text-maroon shadow-md';
            } else if (order.status === 'READY') {
              cardBorder = 'border-emerald-400/50';
              headerBg = 'bg-emerald-600 text-white shadow-md';
            } else if (order.status === 'CANCELLED') {
              cardBorder = 'border-red-400/50';
              headerBg = 'bg-red-650 text-white shadow-md';
            }

            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-bg-dark border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 ${cardBorder} glass`}
              >
                {/* Header info */}
                <div>
                  <div className={`p-4 flex items-center justify-between font-logo ${headerBg}`}>
                    <div>
                      <h4 className="font-extrabold text-base leading-none flex items-center gap-1.5">
                        {order.tableNo === 'Takeaway' ? '🥡 Takeaway' : `Table ${order.tableNo}`}
                      </h4>
                      <span className="text-[10px] opacity-75 font-semibold font-body block mt-0.5">{order.id}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold opacity-90">
                      <Clock className={`w-3.5 h-3.5 ${minutesElapsed >= 15 ? 'text-red-500 dark:text-red-400 animate-bounce' : ''}`} /> 
                      <span className={minutesElapsed >= 15 ? 'text-red-500 dark:text-red-400 font-extrabold' : ''}>
                        {minutesElapsed}m ago
                      </span>
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="p-4 space-y-4">
                    
                    {/* Customer */}
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-2 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <User className="w-3.5 h-3.5" /> Cust: {order.customerName || 'Walk-in'}
                      </div>
                      {order.customerPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Phone: {order.customerPhone}
                        </div>
                      )}
                      {order.paymentMethod && (
                        <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/40 font-bold">
                          <span>Pay Mode:</span>
                          <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded text-neutral-700 dark:text-neutral-300">
                            {order.paymentMethod === 'UPI' ? '📱 UPI' : order.paymentMethod === 'Cash' ? '💵 Cash' : '💳 Card'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Special instruction notes */}
                    {order.specialNotes && (
                      <div className="p-2 bg-saffron/10 border border-saffron/20 rounded-xl text-[10px] font-semibold text-neutral-600 dark:text-saffron flex gap-1 items-start">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Notes: {order.specialNotes}</span>
                      </div>
                    )}

                    {/* Items List */}
                    <ul className="space-y-2 text-xs font-semibold">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-xl">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-neutral-800 dark:text-neutral-200">{item.name}</span>
                            <span className="px-2.5 py-0.5 bg-maroon/5 dark:bg-saffron/5 text-maroon dark:text-saffron font-extrabold font-logo rounded-lg text-[10px]">
                              {item.quantity}x
                            </span>
                          </div>
                          {item.isAdditional && (
                            <div className="flex items-center justify-between text-[8px] text-red-500 font-bold border-t border-neutral-200/40 pt-1 mt-0.5 uppercase tracking-wider">
                              <span>⚠️ Additional Order</span>
                              <span className="text-[7px] font-normal opacity-85">
                                {item.addedAt ? new Date(item.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 no-print space-y-2">
                  
                  {/* Takeaway Order specific NEW state */}
                  {order.status === 'NEW' && (
                    <>
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer"
                      >
                        Accept Takeaway Order
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Cancel this takeaway order?')) {
                            updateOrderStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className="w-full py-2 bg-transparent text-red-500 hover:bg-red-500/10 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-red-500/20 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Cancel Order
                      </button>
                    </>
                  )}

                  {/* Accept Order and cancel for other active states */}
                  {order.status === 'ACCEPTED' && (
                    <>
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Start Cooking
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Cancel this takeaway order?')) {
                            updateOrderStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className="w-full py-2 bg-transparent text-red-500 hover:bg-red-500/10 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-red-500/20 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Cancel Order
                      </button>
                    </>
                  )}

                  {order.status === 'PLACED' && (
                    <>
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Start Cooking
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Cancel this dining order?')) {
                            updateOrderStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className="w-full py-2 bg-transparent text-red-500 hover:bg-red-500/10 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-red-500/20 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Cancel Order
                      </button>
                    </>
                  )}

                  {order.status === 'PREPARING' && (
                    <>
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="w-full py-2 bg-maroon text-white dark:bg-saffron dark:text-maroon font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Prepared
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Cancel this cooking order?')) {
                            updateOrderStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className="w-full py-2 bg-transparent text-red-500 hover:bg-red-500/10 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-red-500/20 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Cancel Order
                      </button>
                    </>
                  )}

                  {order.status === 'READY' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> 
                      {order.tableNo === 'Takeaway' ? 'Mark Picked Up' : 'Mark Completed'}
                    </button>
                  )}

                  {(order.status === 'COMPLETED' || order.status === 'PICKED_UP' || order.status === 'PAID') && (
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 py-1.5 font-logo">
                      <CheckCircle2 className="w-4 h-4" /> 
                      {order.tableNo === 'Takeaway' ? 'Picked Up & Completed' : 'Completed & Delivered'}
                    </div>
                  )}

                  {order.status === 'CANCELLED' && (
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-red-650 dark:text-red-400 py-1.5 font-logo">
                      <XCircle className="w-4 h-4" /> Order Cancelled
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default KitchenDashboard;
