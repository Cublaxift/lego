const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = 8092;
const MONGODB_URI = 'mongodb+srv://cublaxift2:77qPN7zhtsZyQQyzH@cluster0.kioho.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const client = new MongoClient(MONGODB_URI);
let db, dealsCollection, salesCollection;

// Connexion MongoDB
async function start() {
  try {
    await client.connect();
    db = client.db('lego'); // Nom de ta base
    dealsCollection = db.collection('deals');
    salesCollection = db.collection('sales');
    console.log('🧩 Connected to MongoDB');

    // Lancement du serveur
    app.listen(PORT, () => {
      console.log(`📡 Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
  }
}

// Routes
app.get('/', (req, res) => {
  res.send({ ack: true });
});

// GET /deals/:id
app.get('/deals/:id', async (req, res) => {
  try {
    const deal = await dealsCollection.findOne({ _id: req.params.id });
    if (!deal) return res.status(404).send({ error: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    res.status(500).send({ error: 'Server error' });
  }
});

// GET /deals/search
app.get('/deals/search', async (req, res) => {
  const limit = parseInt(req.query.limit) || 12;
  const price = parseFloat(req.query.price);
  const date = req.query.date ? new Date(req.query.date).getTime() / 1000 : null;
  const filterBy = req.query.filterBy;

  let query = {};
  if (!isNaN(price)) query.price = { $lte: price };
  if (date) query.published = { $gte: date };

  try {
    let deals = await dealsCollection.find(query).limit(limit).toArray();

    // Tri
    if (filterBy === 'best-discount') {
      deals.sort((a, b) => b.discount - a.discount);
    } else if (filterBy === 'most-commented') {
      deals.sort((a, b) => b.comments - a.comments);
    } else {
      deals.sort((a, b) => a.price - b.price);
    }

    res.json({
      limit,
      total: deals.length,
      results: deals
    });
  } catch (err) {
    res.status(500).send({ error: 'Server error' });
  }
});

// GET /sales/search
app.get('/sales/search', async (req, res) => {
  const limit = parseInt(req.query.limit) || 12;
  const legoSetId = req.query.legoSetId;

  let query = {};
  if (legoSetId) {
    query.title = { $regex: legoSetId, $options: 'i' };
  }

  try {
    const sales = await salesCollection
      .find(query)
      .sort({ published: -1 })
      .limit(limit)
      .toArray();

    res.json({
      limit,
      total: sales.length,
      results: sales
    });
  } catch (err) {
    res.status(500).send({ error: 'Server error' });
  }
});

// Démarrer l'API
start();
