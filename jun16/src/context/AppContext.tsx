import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MENU_ITEMS, PARCEL_ITEMS } from '../data/menuData';

export interface Table {
  id: string;
  number: string;
  floor: 'ground' | 'first';
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'PENDING'; // AVAILABLE=Green, OCCUPIED=Red, PENDING=Orange (Billing Pending)
  bookingTimeSlot?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isAdditional?: boolean;
  addedAt?: number;
}

export interface Order {
  id: string;
  tableNo: string;
  customerName: string;
  customerPhone: string;
  status: 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'BILLING' | 'PENDING_VERIFY' | 'PAID' | 'NEW' | 'ACCEPTED' | 'PICKED_UP' | 'CANCELLED';
  items: OrderItem[];
  timestamp: number;
  isParcel: boolean;
  specialNotes?: string;
  pickupTime?: string;
  paymentMethod?: string;
}

export interface Invoice {
  invoiceNo: string;
  orderId: string;
  tableNo: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  timestamp: number;
  isParcel: boolean;
  paymentMethod: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  category: string;
  type: 'veg' | 'non-veg';
  image: string;
  description: string;
  quantity: number;
}

export interface PaymentNotification {
  id: string;
  orderId: string;
  tableNo: string;
  customerName: string;
  amount: number;
  timestamp: number;
}

export interface Rating {
  id: string;
  customerName: string;
  customerPhone: string;
  food: number;
  service: number;
  ambience: number;
  comment?: string;
  timestamp: number;
}

interface AppContextType {
  tables: Table[];
  orders: Order[];
  invoices: Invoice[];
  activeTable: string | null;
  cart: CartItem[];
  theme: 'dark' | 'light';
  adminSession: string | null;
  kitchenSession: string | null;
  upiId: string;
  qrCodeUrl: string;
  ratings: Rating[];
  menuItems: any[];
  setTheme: (theme: 'dark' | 'light') => void;
  reserveTable: (tableNo: string, customerName: string, customerPhone: string, slot?: string) => boolean;
  releaseTable: (tableNo: string) => void;
  addToCart: (item: any) => void;
  updateCartQty: (itemId: number, change: number) => void;
  clearCart: () => void;
  placeOrder: (customerName: string, customerPhone: string, specialNotes?: string, isParcel?: boolean, pickupTime?: string) => boolean;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  settleBillAndReleaseTable: (orderId: string, paymentMethod: string) => void;
  login: (role: 'admin' | 'kitchen', email: string) => void;
  logout: (role: 'admin' | 'kitchen') => void;
  activeOrder: Order | null;
  triggerSync: () => void;
  updateUpiSettings: (newUpi: string, newQrUrl: string) => void;
  addRating: (customerName: string, customerPhone: string, food: number, service: number, ambience: number, comment?: string) => void;
  paymentNotifications: PaymentNotification[];
  dismissNotification: (id: string) => void;
  dismissAllNotifications: () => void;
  getAverageRating: () => number;
  updateMenu: (newMenu: any[]) => void;
  parcelItems: any[];
  updateParcelMenu: (newMenu: any[]) => void;
  bgImage: string;
  setBgImage: (img: string) => void;
  placeParcelOrder: (item: any, quantity: number, customerName: string, customerPhone: string, specialNotes?: string, paymentMethod?: string) => Promise<string | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Expanded 25 tables layout (G1-G5 on Ground Floor, A1-A5, B1-B5, C1-C5, D1-D5 on First Floor)
const DEFAULT_TABLES: Table[] = [
  { id: 'TG1', number: 'G1', floor: 'ground', capacity: 2, status: 'AVAILABLE' },
  { id: 'TG2', number: 'G2', floor: 'ground', capacity: 4, status: 'AVAILABLE' },
  { id: 'TG3', number: 'G3', floor: 'ground', capacity: 4, status: 'AVAILABLE' },
  { id: 'TG4', number: 'G4', floor: 'ground', capacity: 6, status: 'AVAILABLE' },
  { id: 'TG5', number: 'G5', floor: 'ground', capacity: 2, status: 'AVAILABLE' },
  
  { id: 'TA1', number: 'A1', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TA2', number: 'A2', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TA3', number: 'A3', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TA4', number: 'A4', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  { id: 'TA5', number: 'A5', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  
  { id: 'TB1', number: 'B1', floor: 'first', capacity: 2, status: 'AVAILABLE' },
  { id: 'TB2', number: 'B2', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TB3', number: 'B3', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TB4', number: 'B4', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  { id: 'TB5', number: 'B5', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  
  { id: 'TC1', number: 'C1', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TC2', number: 'C2', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TC3', number: 'C3', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TC4', number: 'C4', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  { id: 'TC5', number: 'C5', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  
  { id: 'TD1', number: 'D1', floor: 'first', capacity: 2, status: 'AVAILABLE' },
  { id: 'TD2', number: 'D2', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TD3', number: 'D3', floor: 'first', capacity: 4, status: 'AVAILABLE' },
  { id: 'TD4', number: 'D4', floor: 'first', capacity: 6, status: 'AVAILABLE' },
  { id: 'TD5', number: 'D5', floor: 'first', capacity: 6, status: 'AVAILABLE' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- STATE ---
  const [tables, setTables] = useState<Table[]>(() => {
    const stored = localStorage.getItem('svd_tables');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const hasG1 = parsed.some((t: any) => t.number === 'G1');
        if (!hasG1) {
          localStorage.setItem('svd_tables', JSON.stringify(DEFAULT_TABLES));
          return DEFAULT_TABLES;
        }
        return parsed;
      } catch (e) {
        return DEFAULT_TABLES;
      }
    }
    return DEFAULT_TABLES;
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const stored = localStorage.getItem('svd_invoices');
    return stored ? JSON.parse(stored) : [];
  });

  const [upiId, setUpiId] = useState<string>(() => {
    const stored = localStorage.getItem('svd_upi_id');
    return stored || '9030121200-2@ybl';
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>(() => {
    const stored = localStorage.getItem('svd_qr_url');
    if (!stored || stored.includes('payment_qr_') || stored === '/phonepe_qr.jpg') {
      localStorage.setItem('svd_qr_url', '/phonepe_qr.png');
      return '/phonepe_qr.png';
    }
    return stored;
  });

  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>(() => {
    const stored = localStorage.getItem('svd_payment_notifications');
    return stored ? JSON.parse(stored) : [];
  });

  const [ratings, setRatings] = useState<Rating[]>(() => {
    const stored = localStorage.getItem('svd_ratings');
    return stored ? JSON.parse(stored) : [];
  });

  const [menuItems, setMenuItems] = useState<any[]>(() => {
    const stored = localStorage.getItem('svd_menu_items');
    return stored ? JSON.parse(stored) : MENU_ITEMS;
  });

  const [parcelItems, setParcelItems] = useState<any[]>(() => {
    const stored = localStorage.getItem('svd_parcel_items');
    return stored ? JSON.parse(stored) : PARCEL_ITEMS;
  });

  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bgImage, setBgImage] = useState<string>('/hero_background.png');
  
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  const [adminSession, setAdminSession] = useState<string | null>(() => sessionStorage.getItem('svd_session_admin'));
  const [kitchenSession, setKitchenSession] = useState<string | null>(() => sessionStorage.getItem('svd_session_kitchen'));
  const tablesRef = React.useRef(tables);
  const ordersRef = React.useRef(orders);
  const paymentNotificationsRef = React.useRef(paymentNotifications);


  const socketRef = React.useRef<any>(null);

  useEffect(() => {
    socketRef.current = io(isDev ? `http://${window.location.hostname}:3000` : undefined, { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity
    });
    
    fetch(`${API_URL}/api/orders`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          console.log('[Kitchen Fetch Response] Loaded initial orders from backend');
          setOrders(data);
        } else {
          console.warn('[Kitchen Fetch Response] Backend returned non-array:', data);
        }
      })
      .catch(err => console.error('Failed to fetch orders:', err));

    socketRef.current.on('new-order', (newOrder: Order) => {
      console.log('[Realtime Events] Received new-order:', newOrder.id);
      setOrders(prev => {
        if (!prev.find(o => o.id === newOrder.id)) return [...prev, newOrder];
        return prev;
      });
    });

    socketRef.current.on('order_updated', (updatedOrder: Order) => {
      console.log('[Realtime Events] Received order_updated:', updatedOrder.id);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    socketRef.current.on('orders_synced', (syncedOrders: Order[]) => {
      setOrders(syncedOrders);
    });

    socketRef.current.on('new_notification', (notification: PaymentNotification) => {
      console.log('[Realtime Events] Received new_notification:', notification.id);
      setPaymentNotifications(prev => {
        if (!prev.find(n => n.id === notification.id)) return [notification, ...prev];
        return prev;
      });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    paymentNotificationsRef.current = paymentNotifications;
  }, [paymentNotifications]);

  // --- PARSE TABLE FROM URL HASH ---
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash || '#home';
      const parts = hash.split('?');
      if (parts[1]) {
        const queryParams = new URLSearchParams(parts[1]);
        const table = queryParams.get('table');
        if (table) {
          setActiveTable(table);
        }
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // --- STARTUP STUCK TABLE RECOVERY ---
  useEffect(() => {
    const storedTables = localStorage.getItem('svd_tables');
    const storedOrders = localStorage.getItem('svd_orders');
    if (!storedTables) return;
    
    try {
      const parsedTables: Table[] = JSON.parse(storedTables);
      const parsedOrders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
      let updated = false;
      
      const auditLogsStored = localStorage.getItem('svd_recovery_audit_logs');
      const auditLogs: any[] = auditLogsStored ? JSON.parse(auditLogsStored) : [];
      
      const newTables = parsedTables.map(table => {
        if (table.status === 'PENDING') {
          const activeOrd = parsedOrders.find(o => o.tableNo === table.number && o.status !== 'PAID');
          
          let shouldRecover = false;
          let reason = '';
          
          if (table.number === 'A3') {
            shouldRecover = true;
            reason = 'Force recovered stuck table A3 on startup';
          } else if (!activeOrd) {
            shouldRecover = true;
            reason = 'Table stuck in PENDING status without active order';
          } else if (Date.now() - activeOrd.timestamp > 10 * 60 * 1000) {
            shouldRecover = true;
            reason = `Billing Pending session exceeded 10 minutes limit (${Math.round((Date.now() - activeOrd.timestamp) / 60000)}m elapsed)`;
          }
          
          if (shouldRecover) {
            updated = true;
            
            // Calculate amount
            const subtotal = activeOrd ? activeOrd.items.reduce((sum, i) => sum + i.price * i.quantity, 0) : 0;
            const total = subtotal;

            // Create audit log with required fields
            const logEntry = {
              id: 'REC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
              tableNumber: table.number,
              orderId: activeOrd?.id || 'NO_ORDER',
              amount: total,
              billingPendingStartTime: activeOrd?.timestamp || Date.now(),
              autoReleaseTime: Date.now(),
              releaseReason: reason
            };
            auditLogs.push(logEntry);
            console.log(`[Stuck Table Recovery] Recovering table ${table.number}: ${reason}`);
            
            // Close active order if exists
            if (activeOrd) {
              parsedOrders.forEach(o => {
                if (o.id === activeOrd.id) {
                  o.status = 'PAID';
                }
              });
            }
            
            // Reset table to AVAILABLE
            return {
              ...table,
              status: 'AVAILABLE' as const,
              bookingTimeSlot: null,
              customerName: null,
              customerPhone: null
            };
          }
        }
        return table;
      });
      
      if (updated) {
        localStorage.setItem('svd_tables', JSON.stringify(newTables));
        fetch(`${API_URL}/api/orders/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsedOrders) });
        localStorage.setItem('svd_recovery_audit_logs', JSON.stringify(auditLogs));
        setTables(newTables);
        setOrders(parsedOrders);
        triggerSync();
      }
    } catch (err) {
      console.error('Failed to run stuck table recovery:', err);
    }
  }, []);

  // --- LIVE BILLING PENDING TIMEOUT CHECKER ---
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentTables = tablesRef.current;
      const currentOrders = ordersRef.current;
      
      let tablesUpdated = false;
      let ordersUpdated = false;
      const newTables = [...currentTables];
      const newOrders = [...currentOrders];
      const newNotifications: PaymentNotification[] = [];
      const newAuditLogs: any[] = [];
      
      newTables.forEach((table, index) => {
        if (table.status === 'PENDING') {
          // Find the active order for this table in BILLING status
          const activeOrd = newOrders.find(o => o.tableNo === table.number && o.status === 'BILLING');
          if (activeOrd) {
            const elapsedTime = Date.now() - activeOrd.timestamp;
            if (elapsedTime > 10 * 60 * 1000) { // 10 minutes timeout
              tablesUpdated = true;
              ordersUpdated = true;
              
              // 1. Mark order as PAID (Close dining session)
              newOrders.forEach(o => {
                if (o.id === activeOrd.id) {
                  o.status = 'PAID';
                }
              });
              
              // 2. Reset table to AVAILABLE
              newTables[index] = {
                ...table,
                status: 'AVAILABLE',
                bookingTimeSlot: null,
                customerName: null,
                customerPhone: null
              };
              
              // 3. Calculate order amount
              const subtotal = activeOrd.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
              const total = subtotal;
              
              // 4. Create Admin notification
              const notificationId = 'NTF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
              newNotifications.push({
                id: notificationId,
                orderId: activeOrd.id,
                tableNo: table.number,
                customerName: 'System (Auto-Release)',
                amount: total,
                timestamp: Date.now()
              });
              
              // 5. Create audit log entry
              const logEntry = {
                id: 'REC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                tableNumber: table.number,
                orderId: activeOrd.id,
                amount: total,
                billingPendingStartTime: activeOrd.timestamp,
                autoReleaseTime: Date.now(),
                releaseReason: 'Billing Pending timeout (exceeded 10 minutes)'
              };
              newAuditLogs.push(logEntry);
              
              console.log(`[Billing Pending Timeout] Auto-releasing table ${table.number} after timeout.`);
            }
          } else {
            // No active order found in BILLING status but table is PENDING.
            // This is a stuck table situation. Let's release it immediately.
            tablesUpdated = true;
            newTables[index] = {
              ...table,
              status: 'AVAILABLE',
              bookingTimeSlot: null,
              customerName: null,
              customerPhone: null
            };
            
            const logEntry = {
              id: 'REC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
              tableNumber: table.number,
              orderId: 'NO_ORDER',
              amount: 0,
              billingPendingStartTime: Date.now(),
              autoReleaseTime: Date.now(),
              releaseReason: 'Table stuck in PENDING status without active order (live check)'
            };
            newAuditLogs.push(logEntry);
            console.log(`[Billing Pending Timeout] Auto-releasing table ${table.number} because it has no active order.`);
          }
        }
      });
      
      if (tablesUpdated || ordersUpdated) {
        if (tablesUpdated) {
          setTables(newTables);
          localStorage.setItem('svd_tables', JSON.stringify(newTables));
        }
        if (ordersUpdated) {
          setOrders(newOrders);
          fetch(`${API_URL}/api/orders/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newOrders) });
        }
        if (newNotifications.length > 0) {
          setPaymentNotifications(prev => {
            const updatedNotifs = [...newNotifications, ...prev];
            localStorage.setItem('svd_payment_notifications', JSON.stringify(updatedNotifs));
            return updatedNotifs;
          });
        }
        if (newAuditLogs.length > 0) {
          const storedLogs = localStorage.getItem('svd_recovery_audit_logs');
          const auditLogs = storedLogs ? JSON.parse(storedLogs) : [];
          const updatedLogs = [...auditLogs, ...newAuditLogs];
          localStorage.setItem('svd_recovery_audit_logs', JSON.stringify(updatedLogs));
        }
        triggerSync();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkInterval);
  }, []);

  // --- LOAD CART WHEN ACTIVE TABLE CHANGES ---
  useEffect(() => {
    if (activeTable) {
      const stored = localStorage.getItem(`svd_cart_T${activeTable}`);
      const parsedCart = stored ? JSON.parse(stored) : [];
      
      // Sync cart with active order items
      const activeOrd = orders.find(o => o.tableNo === activeTable && o.status !== 'PAID');
      if (activeOrd) {
        const syncedCart = [...parsedCart];
        
        // Sum quantities of same items (both non-additional and additional)
        const orderQtyMap: { [key: number]: number } = {};
        activeOrd.items.forEach(ordItem => {
          orderQtyMap[ordItem.id] = (orderQtyMap[ordItem.id] || 0) + ordItem.quantity;
        });

        Object.entries(orderQtyMap).forEach(([idStr, orderedQty]) => {
          const id = Number(idStr);
          const cartIdx = syncedCart.findIndex(c => c.id === id);
          if (cartIdx > -1) {
            syncedCart[cartIdx].quantity = Math.max(syncedCart[cartIdx].quantity, orderedQty);
          } else {
            const menuItem = menuItems.find(m => m.id === id);
            syncedCart.push({
              id,
              name: menuItem?.name || 'Item',
              price: menuItem?.price || 0,
              category: menuItem?.category || 'Other',
              type: menuItem?.type || 'veg',
              image: menuItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300',
              description: menuItem?.description || '',
              quantity: orderedQty
            });
          }
        });
        setCart(syncedCart);
      } else {
        setCart(parsedCart);
      }
    } else {
      setCart([]);
    }
  }, [activeTable, orders, menuItems]);

  // --- THEME SYNC ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- LOCALSTORAGE PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem('svd_tables', JSON.stringify(tables));
  }, [tables]);



  useEffect(() => {
    localStorage.setItem('svd_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('svd_upi_id', upiId);
  }, [upiId]);

  useEffect(() => {
    localStorage.setItem('svd_qr_url', qrCodeUrl);
  }, [qrCodeUrl]);

  useEffect(() => {
    localStorage.setItem('svd_ratings', JSON.stringify(ratings));
  }, [ratings]);

  useEffect(() => {
    localStorage.setItem('svd_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('svd_parcel_items', JSON.stringify(parcelItems));
  }, [parcelItems]);

  useEffect(() => {
    localStorage.setItem('svd_payment_notifications', JSON.stringify(paymentNotifications));
  }, [paymentNotifications]);

  useEffect(() => {
    if (activeTable && cart.length > 0) {
      localStorage.setItem(`svd_cart_T${activeTable}`, JSON.stringify(cart));
    } else if (activeTable && cart.length === 0) {
      localStorage.removeItem(`svd_cart_T${activeTable}`);
    }
  }, [cart, activeTable]);

  // --- SYNC CART WITH LIVE MENU CHANGES ---
  useEffect(() => {
    setCart(prevCart => {
      if (prevCart.length === 0) return prevCart;
      let changed = false;
      const updatedCart = prevCart.map(cartItem => {
        const match = menuItems.find(m => m.id === cartItem.id);
        if (match && (
          cartItem.price !== match.price || 
          cartItem.name !== match.name || 
          cartItem.image !== match.image ||
          cartItem.description !== match.description ||
          cartItem.category !== match.category ||
          cartItem.type !== match.type
        )) {
          changed = true;
          return {
            ...cartItem,
            price: match.price,
            name: match.name,
            image: match.image,
            description: match.description,
            category: match.category,
            type: match.type
          };
        }
        return cartItem;
      });
      return changed ? updatedCart : prevCart;
    });
  }, [menuItems]);

  // --- BROADCAST SYNC EVENTS ---
  // We use BroadcastChannel to sync localStorage data (Tables, Menu, Invoices) across tabs instantly.
  // We DO NOT sync Orders here because Orders are handled robustly via Socket.io events.

  const syncChannel = React.useMemo(() => new BroadcastChannel('svd_restaurant_sync'), []);

  // Determine API URL based on environment (Vite dev port vs unified production)
  const isDev = window.location.port === '5173' || window.location.port === '5174';
  const API_URL = isDev ? `http://${window.location.hostname}:3000` : '';


  const triggerSync = () => {
    syncChannel.postMessage('sync');
  };

  useEffect(() => {
    const handleSync = (e: MessageEvent) => {
      if (e.data === 'sync') {
        const storedTables = localStorage.getItem('svd_tables');
        const storedInvoices = localStorage.getItem('svd_invoices');
        const storedUpi = localStorage.getItem('svd_upi_id');
        const storedQr = localStorage.getItem('svd_qr_url');
        const storedRatings = localStorage.getItem('svd_ratings');
        const storedMenuItems = localStorage.getItem('svd_menu_items');
        const storedParcelItems = localStorage.getItem('svd_parcel_items');
        const storedNotifications = localStorage.getItem('svd_payment_notifications');
        
        if (storedTables) setTables(JSON.parse(storedTables));
        if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
        if (storedUpi) setUpiId(storedUpi);
        if (storedQr) setQrCodeUrl(storedQr);
        if (storedRatings) setRatings(JSON.parse(storedRatings));
        if (storedMenuItems) setMenuItems(JSON.parse(storedMenuItems));
        if (storedParcelItems) setParcelItems(JSON.parse(storedParcelItems));
        if (storedNotifications) setPaymentNotifications(JSON.parse(storedNotifications));

        // Note: Orders are INTENTIONALLY ignored here. Socket.io 'new-order' handles them.
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, [syncChannel]);

  // --- ACTIVE ORDER SELECTOR ---
  const activeOrder = activeTable 
    ? orders.find(o => o.tableNo === activeTable && o.status !== 'PAID') || null
    : null;

  // --- THEME MUTATOR ---
  const setTheme = (t: 'dark' | 'light') => {
    setThemeState(t);
  };

  // --- TABLE ACTIONS ---
  const reserveTable = (tableNo: string, customerName: string, customerPhone: string, slot?: string) => {
    const updated = tables.map(t => {
      if (t.number === tableNo && t.status === 'AVAILABLE') {
        return { 
          ...t, 
          status: 'OCCUPIED' as const, 
          bookingTimeSlot: slot || null,
          customerName,
          customerPhone
        };
      }
      return t;
    });

    const success = updated.some((t, idx) => t.status === 'OCCUPIED' && tables[idx].status === 'AVAILABLE');
    if (success) {
      localStorage.setItem('svd_tables', JSON.stringify(updated));
      setTables(updated);
      triggerSync();
    }
    return success;
  };

  const releaseTable = (tableNo: string) => {
    const updated = tables.map(t => {
      if (t.number === tableNo) {
        return { 
          ...t, 
          status: 'AVAILABLE' as const, 
          bookingTimeSlot: null,
          customerName: null,
          customerPhone: null
        };
      }
      return t;
    });
    localStorage.setItem('svd_tables', JSON.stringify(updated));
    setTables(updated);
    if (activeTable === tableNo) {
      setCart([]);
    }
    localStorage.removeItem(`svd_cart_T${tableNo}`);
    triggerSync();
  };


  // --- SETTINGS ACTIONS ---
  const updateUpiSettings = (newUpi: string, newQrUrl: string) => {
    localStorage.setItem('svd_upi_id', newUpi);
    localStorage.setItem('svd_qr_url', newQrUrl);
    setUpiId(newUpi);
    setQrCodeUrl(newQrUrl);
    triggerSync();
  };

  const addRating = (customerName: string, customerPhone: string, food: number, service: number, ambience: number, comment?: string) => {
    const newRating: Rating = {
      id: 'RTG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName,
      customerPhone,
      food,
      service,
      ambience,
      comment,
      timestamp: Date.now()
    };
    const updated = [...ratings, newRating];
    localStorage.setItem('svd_ratings', JSON.stringify(updated));
    setRatings(updated);
    triggerSync();
  };

  const getAverageRating = () => {
    if (ratings.length === 0) return 4.8;
    const total = ratings.reduce((sum, r) => sum + (r.food + r.service + r.ambience) / 3, 0);
    return Math.round((total / ratings.length) * 10) / 10;
  };

  const updateMenu = (newMenu: any[]) => {
    localStorage.setItem('svd_menu_items', JSON.stringify(newMenu));
    setMenuItems(newMenu);
    triggerSync();
  };

  const updateParcelMenu = (newMenu: any[]) => {
    localStorage.setItem('svd_parcel_items', JSON.stringify(newMenu));
    setParcelItems(newMenu);
    triggerSync();
  };

  // --- CART ACTIONS ---
  const addToCart = (item: any) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id);
      if (idx > -1) {
        const next = [...prev];
        // Create a new object reference to avoid React StrictMode double mutation
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId: number, change: number) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === itemId);
      if (idx === -1) return prev;
      
      const activeOrd = orders.find(o => o.tableNo === activeTable && o.status !== 'PAID');
      const orderedQty = activeOrd?.items.find(i => i.id === itemId)?.quantity || 0;

      const next = [...prev];
      const newQty = next[idx].quantity + change;
      
      if (newQty <= 0 || (change < 0 && newQty < orderedQty)) {
        if (orderedQty > 0) {
          // Create a new object reference
          next[idx] = { ...next[idx], quantity: orderedQty };
          return next;
        }
        return prev.filter(c => c.id !== itemId);
      }
      
      // Create a new object reference to avoid StrictMode double mutation
      next[idx] = { ...next[idx], quantity: newQty };
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  // --- ORDER PLACEMENT ---
  const placeOrder = (customerName: string, customerPhone: string, specialNotes?: string, isParcel = false, pickupTime?: string) => {
    if (cart.length === 0) return false;

    const activeOrd = orders.find(o => o.tableNo === activeTable && o.status !== 'PAID');
    let finalOrders = orders;
    let finalTables = tables;

    if (activeOrd) {
      // Append or update items in existing active order
      const updatedItems = [...activeOrd.items];
      cart.forEach(cartItem => {
        // Quantities that are already in the order (excluding any additional items from this exact session)
        const existingIdx = updatedItems.findIndex(i => i.id === cartItem.id && !i.isAdditional);
        const orderedQty = existingIdx > -1 ? updatedItems[existingIdx].quantity : 0;
        
        if (cartItem.quantity > orderedQty) {
          const additionalQty = cartItem.quantity - orderedQty;
          
          const addIdx = updatedItems.findIndex(i => i.id === cartItem.id && i.isAdditional);
          if (addIdx > -1) {
            updatedItems[addIdx].quantity = additionalQty;
            updatedItems[addIdx].addedAt = Date.now();
          } else {
            updatedItems.push({
              id: cartItem.id,
              name: cartItem.name,
              price: cartItem.price,
              quantity: additionalQty,
              isAdditional: true,
              addedAt: Date.now()
            });
          }
        }
      });

      finalOrders = orders.map(o => {
        if (o.id === activeOrd.id) {
          const updatedOrder = {
            ...o,
            items: updatedItems,
            status: 'PLACED' as const,
            timestamp: Date.now(),
            specialNotes: specialNotes || o.specialNotes
          };
          fetch(`${API_URL}/api/orders/${updatedOrder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedOrder)
          });
          return updatedOrder;
        }
        return o;
      });

      // Map table back to Occupied/Pending
      finalTables = tables.map(t => {
        if (t.number === activeTable) {
          return { ...t, status: 'OCCUPIED' as const };
        }
        return t;
      });
    } else {
      // Create new order
      const newOrderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newOrder: Order = {
        id: newOrderId,
        tableNo: activeTable || 'Takeaway',
        customerName,
        customerPhone,
        status: 'PLACED',
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        timestamp: Date.now(),
        isParcel,
        specialNotes,
        pickupTime
      };

      fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      finalOrders = [...orders, newOrder];

      if (activeTable) {
        finalTables = tables.map(t => {
          if (t.number === activeTable) {
            return { ...t, status: 'OCCUPIED' as const };
          }
          return t;
        });
      }
    }

    localStorage.setItem('svd_tables', JSON.stringify(finalTables));
    setOrders(finalOrders);
    setTables(finalTables);
    triggerSync();
    return true;
  };

  const placeParcelOrder = async (
    item: any,
    quantity: number,
    customerName: string,
    customerPhone: string,
    specialNotes?: string,
    paymentMethod?: string
  ) => {
    const newOrderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newOrder: Order = {
      id: newOrderId,
      tableNo: 'Takeaway',
      customerName,
      customerPhone,
      status: 'NEW',
      items: [{
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity
      }],
      timestamp: Date.now(),
      isParcel: true,
      specialNotes,
      paymentMethod
    };

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (!response.ok) throw new Error('Failed to create order');
      
      setOrders(prev => [...prev, newOrder]);
      triggerSync();
      return newOrderId;
    } catch (err) {
      console.error('Error placing parcel order:', err);
      return null;
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    let nextTables = tables;
    const nextOrders = orders.map(o => {
      if (o.id === orderId) {
        const nextOrder = { ...o, status };
        
        // If order status advances to PREPARING, map table status to occupied
        if (status === 'PREPARING' && o.tableNo !== 'Takeaway') {
          nextTables = tables.map(t => {
            if (t.number === o.tableNo) return { ...t, status: 'OCCUPIED' as const };
            return t;
          });
        }
        // If order status advances to BILLING (Ready for Billing), map table to PENDING (Orange)
        if (status === 'BILLING' && o.tableNo !== 'Takeaway') {
          nextOrder.timestamp = Date.now(); // Mark exact start time of Billing Pending
          nextTables = tables.map(t => {
            if (t.number === o.tableNo) return { ...t, status: 'PENDING' as const };
            return t;
          });
        }
        
        fetch(`${API_URL}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextOrder)
        });
        return nextOrder;
      }
      return o;
    });

    localStorage.setItem('svd_tables', JSON.stringify(nextTables));
    setOrders(nextOrders);
    setTables(nextTables);
    triggerSync();
  };

  // --- BILL SETTLEMENT & RELEASE TABLE ---
  const settleBillAndReleaseTable = (orderId: string, paymentMethod: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = 0;
    const serviceCharge = 0;
    const total = subtotal;

    const newInvoice: Invoice = {
      invoiceNo: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: order.id,
      tableNo: order.tableNo,
      customerName: order.customerName,
      items: order.items,
      subtotal,
      tax,
      serviceCharge,
      total,
      timestamp: Date.now(),
      isParcel: order.isParcel,
      paymentMethod
    };

    const nextInvoices = [...invoices, newInvoice];
    setInvoices(nextInvoices);
    localStorage.setItem('svd_invoices', JSON.stringify(nextInvoices));
    
    // Mark order as PAID
    const nextOrders = orders.map(o => {
      if (o.id === orderId) {
        const nextOrder = { ...o, status: 'PAID' as const };
        fetch(`${API_URL}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextOrder)
        });
        return nextOrder;
      }
      return o;
    });
    setOrders(nextOrders);

    // Release table & set to AVAILABLE (Green)
    let nextTables = tables;
    if (order.tableNo !== 'Takeaway') {
      nextTables = tables.map(t => {
        if (t.number === order.tableNo) {
          return { 
            ...t, 
            status: 'AVAILABLE' as const,
            bookingTimeSlot: null,
            customerName: null,
            customerPhone: null
          };
        }
        return t;
      });
      setTables(nextTables);
      localStorage.setItem('svd_tables', JSON.stringify(nextTables));
      // Clear current tab's active cart if this was the table
      if (activeTable === order.tableNo) {
        setCart([]);
      }
      localStorage.removeItem(`svd_cart_T${order.tableNo}`);
    }

    // Automatically push real-time Admin notification
    const newNotification: PaymentNotification = {
      id: 'NTF-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      orderId: order.id,
      tableNo: order.tableNo,
      customerName: order.customerName,
      amount: total,
      timestamp: Date.now()
    };
    const nextNotifications = [newNotification, ...paymentNotifications];
    setPaymentNotifications(nextNotifications);
    localStorage.setItem('svd_payment_notifications', JSON.stringify(nextNotifications));

    triggerSync();
  };

  // --- AUTH SERVICES ---
  const login = (role: 'admin' | 'kitchen', email: string) => {
    sessionStorage.setItem(`svd_session_${role}`, email);
    if (role === 'admin') setAdminSession(email);
    else setKitchenSession(email);
  };

  const logout = (role: 'admin' | 'kitchen') => {
    sessionStorage.removeItem(`svd_session_${role}`);
    if (role === 'admin') setAdminSession(null);
    else setKitchenSession(null);
  };

  const dismissNotification = (id: string) => {
    const nextNotifications = paymentNotifications.filter(n => n.id !== id);
    localStorage.setItem('svd_payment_notifications', JSON.stringify(nextNotifications));
    setPaymentNotifications(nextNotifications);
    triggerSync();
  };

  const dismissAllNotifications = () => {
    localStorage.setItem('svd_payment_notifications', JSON.stringify([]));
    setPaymentNotifications([]);
    triggerSync();
  };

  return (
    <AppContext.Provider value={{
      tables,
      orders,
      invoices,
      activeTable,
      cart,
      theme,
      adminSession,
      kitchenSession,
      upiId,
      qrCodeUrl,
      ratings,
      menuItems,
      setTheme,
      reserveTable,
      releaseTable,
      addToCart,
      updateCartQty,
      clearCart,
      placeOrder,
      updateOrderStatus,
      settleBillAndReleaseTable,
      login,
      logout,
      activeOrder,
      triggerSync,
      updateUpiSettings,
      addRating,
      getAverageRating,
      updateMenu,
      paymentNotifications,
      dismissNotification,
      dismissAllNotifications,
      parcelItems,
      updateParcelMenu,
      bgImage,
      setBgImage,
      placeParcelOrder
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
