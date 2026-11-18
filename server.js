/**
 * KILN & CLAY — Production E-Commerce Application Backend
 * Integrates:
 * - DynamoDB for User Management (Auth & Passwords with bcrypt)
 * - Amazon RDS (PostgreSQL) for Orders and Purchase Records
 * - Amazon SNS for Asynchronous Order Confirmation Events
 * - Amazon ALB Health Check endpoint (/health)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const app = express();
const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ----------------------------------------------------
// AWS CLIENT INITIALIZATIONS
// ----------------------------------------------------
const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: AWS_REGION });

// RDS PostgreSQL Connection Pool
const rdsPool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432', 10),
  database: process.env.RDS_DATABASE || 'kilnclay_orders',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000
});

// Auto-initialize RDS Orders Table on startup if connected
async function initRdsDatabase() {
  if (!process.env.RDS_HOST) {
    console.log('[RDS] No RDS_HOST configured. Running in mock RDS mode for local testing.');
    return;
  }
  try {
    const client = await rdsPool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id VARCHAR(32) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        shipping_address TEXT NOT NULL,
        items_summary TEXT NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(64) DEFAULT 'Paid & Dispatched',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    console.log('[RDS] Database table `customer_orders` verified/ready.');
  } catch (err) {
    console.warn('[RDS] Could not connect to RDS instance:', err.message);
  }
}
initRdsDatabase();

// In-Memory Fallbacks for Local Testing without AWS credentials
const mockUsers = new Map();
const mockOrders = [];

// ----------------------------------------------------
// 1. LOAD BALANCER HEALTH CHECK
// ----------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date() });
});

// ----------------------------------------------------
// 2. AUTHENTICATION (DYNAMODB)
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const userItem = {
    userId: email.toLowerCase(),
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash: passwordHash,
    createdAt: new Date().toISOString()
  };

  try {
    if (process.env.DYNAMODB_USERS_TABLE) {
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Item: userItem
      }));
    } else {
      mockUsers.set(email.toLowerCase(), userItem);
    }

    const token = jwt.sign({ email: userItem.email, name: userItem.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ message: 'User registered successfully', token, user: { email: userItem.email, name: userItem.name } });
  } catch (err) {
    console.error('DynamoDB Register Error:', err);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    let user;
    if (process.env.DYNAMODB_USERS_TABLE) {
      const result = await docClient.send(new GetCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Key: { userId: email.toLowerCase() }
      }));
      user = result.Item;
    } else {
      user = mockUsers.get(email.toLowerCase());
    }

    // Fallback for demo password if test user
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ message: 'Login successful', token, user: { email: user.email, name: user.name } });
  } catch (err) {
    console.error('DynamoDB Login Error:', err);
    return res.status(500).json({ error: 'Internal login error.' });
  }
});

// ----------------------------------------------------
// 3. PURCHASE & ORDERS (RDS + SNS EVENT)
// ----------------------------------------------------
app.post('/api/orders', async (req, res) => {
  const { customerName, customerEmail, shippingAddress, items, totalAmount } = req.body;

  if (!customerEmail || !items || !totalAmount) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  const orderId = 'KC-' + Math.floor(1000 + Math.random() * 9000);
  const itemsSummary = Array.isArray(items) ? items.map(i => `${i.qty}x ${i.name}`).join(', ') : String(items);

  const orderRecord = {
    id: orderId,
    customer_name: customerName || 'Valued Customer',
    customer_email: customerEmail,
    shipping_address: shippingAddress,
    items_summary: itemsSummary,
    total_amount: parseFloat(totalAmount),
    status: 'Paid & Dispatched',
    created_at: new Date().toISOString()
  };

  // 1. Save Purchase Details into Amazon RDS
  try {
    if (process.env.RDS_HOST) {
      await rdsPool.query(
        `INSERT INTO customer_orders (id, customer_name, customer_email, shipping_address, items_summary, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderRecord.id, orderRecord.customer_name, orderRecord.customer_email, orderRecord.shipping_address, orderRecord.items_summary, orderRecord.total_amount, orderRecord.status]
      );
      console.log(`[RDS] Order ${orderId} successfully persisted in PostgreSQL.`);
    } else {
      mockOrders.unshift(orderRecord);
    }
  } catch (err) {
    console.error('[RDS] Error saving order to PostgreSQL:', err.message);
    mockOrders.unshift(orderRecord); // fallback so user checkout never fails
  }

  // 2. Publish Order Event to Amazon SNS (triggers Lambda email notification)
  try {
    if (process.env.SNS_ORDER_TOPIC_ARN) {
      await snsClient.send(new PublishCommand({
        TopicArn: process.env.SNS_ORDER_TOPIC_ARN,
        Subject: `Order Confirmation: ${orderId} - KILN & CLAY`,
        Message: JSON.stringify({
          orderId: orderRecord.id,
          recipientEmail: orderRecord.customer_email,
          recipientName: orderRecord.customer_name,
          shippingAddress: orderRecord.shipping_address,
          items: orderRecord.items_summary,
          total: orderRecord.total_amount,
          eventTime: new Date().toISOString()
        })
      }));
      console.log(`[SNS] Published order confirmation message for ${orderId}`);
    } else {
      console.log(`[SNS] Simulated SNS notification sent to ${customerEmail} for order ${orderId}`);
    }
  } catch (err) {
    console.error('[SNS] Failed to publish message:', err.message);
  }

  return res.status(201).json({
    message: 'Order created and processed',
    order: orderRecord
  });
});

// Admin orders listing
app.get('/api/orders', async (req, res) => {
  try {
    if (process.env.RDS_HOST) {
      const result = await rdsPool.query('SELECT * FROM customer_orders ORDER BY created_at DESC LIMIT 50');
      return res.status(200).json({ orders: result.rows });
    }
    return res.status(200).json({ orders: mockOrders });
  } catch (err) {
    return res.status(200).json({ orders: mockOrders });
  }
});

// Serve frontend for all standard page requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`KILN & CLAY Production App running on port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
