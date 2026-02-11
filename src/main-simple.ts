import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock readiness config endpoint
app.get('/api/v1/readiness/config', (req, res) => {
  res.json([
    {
      id: 'default',
      name: 'Default Configuration',
      states: [
        { value: 0, label: 'NOT_STARTED', color: '#ef4444' },
        { value: 50, label: 'IN_PROGRESS', color: '#f59e0b' },
        { value: 100, label: 'COMPLETE', color: '#10b981' }
      ],
      colorMapping: {
        0: '#ef4444',
        50: '#f59e0b',
        100: '#10b981'
      },
      validationRules: []
    }
  ]);
});

// Mock readiness data endpoint
app.get('/api/v1/readiness', (req, res) => {
  res.json([]);
});

// Mock update endpoint
app.put('/api/v1/readiness/:nodeId', (req, res) => {
  res.json({ success: true, ...req.body });
});

// In-memory storage
let workItems = [
  {
    id: 'login-screen',
    title: 'Login Screen',
    type: 'SCREEN',
    description: 'Member authentication',
    x: 140,
    y: 100,
    readiness: {
      Requirements: 1.0,
      Design: 1.0,
      Frontend: 0.8,
      Backend: 0.6,
      Integration: 0.4,
      Test: 0.2
    },
    confidence: 'COMMITTED'
  },
  {
    id: 'balance-due',
    title: 'Balance Due',
    type: 'SCREEN',
    description: 'Shows payment amount',
    x: 140,
    y: 250,
    readiness: {
      Requirements: 1.0,
      Design: 1.0,
      Frontend: 0.6,
      Backend: 0.4,
      Integration: 0.2,
      Test: 0.0
    },
    confidence: 'BUBBLE'
  },
  {
    id: 'payment-entry',
    title: 'Payment Entry',
    type: 'SCREEN',
    description: 'CC/ACH form',
    x: 140,
    y: 400,
    readiness: {
      Requirements: 1.0,
      Design: 0.8,
      Frontend: 0.4,
      Backend: 0.2,
      Integration: 0.0,
      Test: 0.0
    },
    confidence: 'BUBBLE'
  },
  {
    id: 'auth-service',
    title: 'Auth Service',
    type: 'SERVICE',
    description: 'SiteMinder integration',
    x: 400,
    y: 100,
    readiness: {
      Requirements: 1.0,
      Design: 1.0,
      Frontend: 0.0,
      Backend: 0.8,
      Integration: 0.6,
      Test: 0.4
    },
    confidence: 'COMMITTED'
  },
  {
    id: 'billing-service',
    title: 'Billing Service',
    type: 'SERVICE',
    description: 'Facets real-time API',
    x: 400,
    y: 250,
    readiness: {
      Requirements: 1.0,
      Design: 0.6,
      Frontend: 0.0,
      Backend: 0.4,
      Integration: 0.2,
      Test: 0.0
    },
    confidence: 'BUBBLE'
  },
  {
    id: 'payment-service',
    title: 'Payment Service',
    type: 'SERVICE',
    description: 'Process CC/ACH',
    x: 400,
    y: 400,
    readiness: {
      Requirements: 0.8,
      Design: 0.4,
      Frontend: 0.0,
      Backend: 0.2,
      Integration: 0.0,
      Test: 0.0
    },
    confidence: 'DEFERRED'
  }
];

let dependencies = [
  { from: 'login-screen', to: 'auth-service', type: 'requires' },
  { from: 'balance-due', to: 'billing-service', type: 'requires' },
  { from: 'payment-entry', to: 'payment-service', type: 'requires' },
  { from: 'billing-service', to: 'payment-service', type: 'feeds-into' }
];

// Get all work items
app.get('/api/v1/work-items', (req, res) => {
  res.json({
    data: workItems,
    total: workItems.length,
    hasMore: false
  });
});

// Get dependencies
app.get('/api/v1/dependencies', (req, res) => {
  res.json({
    data: dependencies,
    total: dependencies.length
  });
});

// Update work item position
app.put('/api/v1/work-items/:id/position', (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;

  const item = workItems.find(item => item.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Work item not found' });
  }

  item.x = x;
  item.y = y;

  res.json({ success: true, data: item });
});

// Create dependency
app.post('/api/v1/dependencies', (req, res) => {
  const { from, to, type = 'requires' } = req.body;

  // Check if dependency already exists
  const exists = dependencies.find(dep => dep.from === from && dep.to === to);
  if (exists) {
    return res.status(400).json({ error: 'Dependency already exists' });
  }

  const dependency = { from, to, type };
  dependencies.push(dependency);

  res.json({ success: true, data: dependency });
});

// Delete dependency
app.delete('/api/v1/dependencies/:from/:to', (req, res) => {
  const { from, to } = req.params;

  const index = dependencies.findIndex(dep => dep.from === from && dep.to === to);
  if (index === -1) {
    return res.status(404).json({ error: 'Dependency not found' });
  }

  dependencies.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Mock backend running on http://localhost:${PORT}`);
});