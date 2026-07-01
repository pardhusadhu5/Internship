import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import mongoose from 'mongoose';
import { Notification, ActivityLog, KitchenHistory } from './models/mongo.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// --- PRISMA (PostgreSQL) INIT ---
const prisma = new PrismaClient();

// --- MONGOOSE (MongoDB) INIT ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svd_db')
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch(err => console.error('[MongoDB] Connection error:', err));


// --- API ENDPOINTS (PostgreSQL) ---

// Fetch all active orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
    });
    // Convert to frontend expected format
    const formattedOrders = orders.map(o => ({
      ...o,
      items: o.items.map(i => ({
        id: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        isAdditional: i.isAdditional,
        addedAt: i.addedAt,
      }))
    }));
    res.json(formattedOrders);
  } catch (err) {
    console.error('[Error] GET /api/orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  console.log('[Order Created] Received new order request');
  const newOrder = req.body;
  
  if (!newOrder || !newOrder.id) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  // Instantly broadcast to all tabs first to guarantee real-time UI sync
  io.emit('new-order', newOrder); 

  try {
    const createdOrder = await prisma.order.create({
      data: {
        id: newOrder.id,
        tableNo: newOrder.tableNo,
        customerName: newOrder.customerName || '',
        customerPhone: newOrder.customerPhone || '',
        status: newOrder.status,
        timestamp: newOrder.timestamp,
        isParcel: newOrder.isParcel || false,
        specialNotes: newOrder.specialNotes,
        pickupTime: newOrder.pickupTime,
        paymentMethod: newOrder.paymentMethod,
        items: {
          create: newOrder.items.map(i => ({
            menuItemId: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            isAdditional: i.isAdditional || false,
            addedAt: i.addedAt,
          }))
        }
      },
      include: { items: true }
    });

    console.log(`[Order Saved] Order ${createdOrder.id} saved to PostgreSQL.`);

    // Log to MongoDB
    await ActivityLog.create({
      id: 'ACT-' + Date.now(),
      action: 'ORDER_CREATED',
      details: { orderId: createdOrder.id, tableNo: createdOrder.tableNo }
    });

    res.status(201).json({ message: 'Order created', order: newOrder });

  } catch (err) {
    console.error('[Error] POST /api/orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order (e.g. status change, adding items)
app.put('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const updates = req.body;
  
  // Instantly broadcast for real-time UI
  io.emit('order_updated', updates);

  try {
    // Determine if we are updating items or just status
    if (updates.items) {
      // Clear existing items and recreate
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: updates.status,
          timestamp: updates.timestamp,
          specialNotes: updates.specialNotes,
          paymentMethod: updates.paymentMethod,
          items: {
            create: updates.items.map(i => ({
              menuItemId: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              isAdditional: i.isAdditional || false,
              addedAt: i.addedAt,
            }))
          }
        }
      });
    } else {
      // Just updating fields like status
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: updates.status, 
          timestamp: updates.timestamp,
          paymentMethod: updates.paymentMethod
        }
      });
    }

    console.log(`[Database Response] Order ${orderId} updated in PostgreSQL.`);

    // Log to MongoDB history if status changed
    if (updates.status) {
      await KitchenHistory.create({ orderId, status: updates.status });
      
      // If PAID, create notification in MongoDB
      if (updates.status === 'PAID') {
        const notifId = 'NTF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const notification = await Notification.create({
          id: notifId,
          orderId: orderId,
          tableNo: updates.tableNo || 'N/A',
          customerName: updates.customerName || 'Customer',
          amount: updates.amount || 0, // In reality, we'd calculate or receive this
          timestamp: Date.now()
        });
        
        console.log(`[Realtime Events] Emitted new_notification for ${orderId}`);
        io.emit('new_notification', notification);
      }
    }

    res.json({ message: 'Order updated', order: updates });

  } catch (err) {
    console.error('[Error] PUT /api/orders/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync (For Bulk updates / existing logic compatibility)
app.post('/api/orders/sync', async (req, res) => {
  // If the frontend tries to sync completely, we just broadcast to keep devices in sync
  io.emit('orders_synced', req.body);
  res.json({ message: 'Sync broadcasted' });
});

// --- SERVE STATIC FRONTEND FOR UNIFIED RENDER DEPLOYMENT ---
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback (Catch-all for React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log(`[Realtime Events] Client connected: ${socket.id}`);
  
  // Kitchen Fetch Response
  socket.on('request_orders', async () => {
    try {
      const orders = await prisma.order.findMany({ include: { items: true } });
      const formattedOrders = orders.map(o => ({
        ...o,
        items: o.items.map(i => ({
          id: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isAdditional: i.isAdditional,
          addedAt: i.addedAt,
        }))
      }));
      socket.emit('initial_orders', formattedOrders);
    } catch (err) {
      console.error('[Error] Fetching initial orders via socket:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Realtime Events] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Production Backend running on port ${PORT}`);
});
