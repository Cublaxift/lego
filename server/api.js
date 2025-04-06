const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const { analyzeProfitability } = require('./src/exec/executeAnalysis');

const app = express();

const PORT=8092;

const MONGODB_URI = 'mongodb+srv://cublaxift2:7qPN7zhtsZyQQyzH@cluster0.kioho.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_DB_NAME = 'Lego';

// Middlewares
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.options('*', cors()); // For pre-flight requests

// MongoDB client setup
let db;

MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    console.log('📦 MongoDB connected');

    // Start server only after DB is ready
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await client.close();
      console.log('🛑 MongoDB connection closed');
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

/**
 * ROUTES
 */

// Test endpoint
app.get('/', (_, res) => res.json({ ack: true }));

// GET /deals/search
app.get('/deals/search', async (req, res) => {
  try {
    const {
      limit = 12,
      price,
      date,
      filterBy,
    } = req.query;

    const analyzesCollection = db.collection('analyzes');

    const query = {};
    if (price) query['sourceDeal.price'] = { $lte: parseFloat(price) };
    if (date && !isNaN(Date.parse(date))) query.timestamp = { $gte: new Date(date).toISOString() };

    const sortMap = {
      'best-discount': { dealScore: -1 },
      'most-commented': { 'sourceDeal.commentsCount': -1 },
    };

    const sortCriteria = sortMap[filterBy] || { 'sourceDeal.price': 1 };

    const results = await analyzesCollection
      .find(query)
      .sort(sortCriteria)
      .limit(parseInt(limit))
      .toArray();

    const total = await analyzesCollection.countDocuments(query);

    const formatted = results.map(({ _id, sourceDeal, dealScore, estimatedNetProfit, recommendation }) => ({
      _id: _id.toString(),
      sourceDeal: {
        ...sourceDeal,
        postedDate: sourceDeal.postedDate
          ? Math.floor(new Date(sourceDeal.postedDate).getTime() / 1000)
          : null,
      },
      dealScore,
      estimatedNetProfit,
      recommendation,
    }));

    res.json({ limit: parseInt(limit), total, results: formatted });
  } catch (err) {
    console.error('❌ Error in /deals/search:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /deals/:id
app.get('/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid deal ID' });

    const analysis = await db.collection('analyzes').findOne({ _id: new ObjectId(id) });
    if (!analysis) return res.status(404).json({ error: 'Deal not found' });

    const {
      _id,
      sourceDeal,
      dealScore,
      estimatedNetProfit,
      recommendation,
      scoreBreakdown,
      averageSellingPrice,
      medianSellingPrice,
      lowerQuartilePrice,
      upperQuartilePrice,
      coefficientOfVariation,
      averageCondition,
      averageFavorites,
      newConditionListingsCount,
    } = analysis;

    res.json({
      _id: _id.toString(),
      sourceDeal,
      dealScore,
      estimatedNetProfit,
      recommendation,
      scoreBreakdown,
      vintedStats: {
        averageSellingPrice,
        medianSellingPrice,
        priceRange: `${lowerQuartilePrice}€ - ${upperQuartilePrice}€`,
        priceStability: coefficientOfVariation,
        averageCondition,
        averageFavorites,
        listingsCount: newConditionListingsCount,
      },
    });
  } catch (err) {
    console.error('❌ Error in /deals/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sales/search
app.get('/sales/search', async (req, res) => {
  try {
    const { limit = 12, legoSetId } = req.query;
    const query = legoSetId ? { setNumber: legoSetId } : {};

    const sales = await db.collection('sales')
      .find(query)
      .sort({ postedDate: -1 })
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('sales').countDocuments(query);

    const results = sales.map(({ _id, link, price, title, postedDate }) => ({
      _id: _id.toString(),
      link,
      price,
      title,
      published: postedDate ? Math.floor(new Date(postedDate).getTime() / 1000) : null,
    }));

    res.json({ limit: parseInt(limit), total, results });
  } catch (err) {
    console.error('❌ Error in /sales/search:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /analyze
app.post('/analyze', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Input is required' });

    const analysis = await analyzeProfitability(input);
    if (!analysis) return res.status(404).json({ error: 'No analysis result' });

    const savedAnalysis = await db.collection('analyzes').findOne({ setNumber: analysis.sourceDeal.setNumber });

    res.json({
      _id: savedAnalysis._id.toString(),
      sourceDeal: analysis.sourceDeal,
      dealScore: analysis.dealScore,
      estimatedNetProfit: analysis.estimatedNetProfit,
      recommendation: analysis.recommendation,
      vintedStats: {
        averageSellingPrice: analysis.averageSellingPrice,
        medianSellingPrice: analysis.medianSellingPrice,
        priceRange: `${analysis.lowerQuartilePrice}€ - ${analysis.upperQuartilePrice}€`,
        priceStability: analysis.coefficientOfVariation,
        averageCondition: analysis.averageCondition,
        averageFavorites: analysis.averageFavorites,
        listingsCount: analysis.newConditionListingsCount,
      },
    });
  } catch (err) {
    console.error('❌ Error in /analyze:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend (React or other) - MUST BE LAST
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
