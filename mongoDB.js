const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// === Variables d'environnement ===
const MONGODB_URI = 'mongodb+srv://cublaxift2:7qPN7zhtsZyQQyzH@cluster0.kioho.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_DB_NAME = 'Lego';

const client = new MongoClient(MONGODB_URI);

async function connectDB() {
    await client.connect();
    return client.db(MONGODB_DB_NAME);
}

async function insertDeals(db) {
    const collection = db.collection('deals');
    const filePath = path.join(__dirname, './server/dealabsDeals.json');
    const deals = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const result = await collection.insertMany(deals);
    console.log(`${result.insertedCount} deals insérés`);
}

async function insertSales(db) {
    const collection = db.collection('sales');
    const filePath = path.join(__dirname, './server/vintedSales.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const salesData = JSON.parse(rawData);

    const sales = [];
    for (const legoSetId in salesData) {
        const salesList = salesData[legoSetId].map(sale => ({
            ...sale,
            legoSetId
        }));
        sales.push(...salesList);
    }

    const result = await collection.insertMany(sales);
    console.log(`${result.insertedCount} ventes insérées`);
}

async function runQueries(db) {
    const deals = db.collection('deals');
    const sales = db.collection('sales');

    async function findBestDiscountDeals() {
        return await deals.find()
            .sort({ discount: -1 })
            .project({ _id: 0, id: 1, title: 1, price: 1, discount: 1, comments: 1 })
            .limit(5)
            .toArray();
    }

    async function findMostCommentedDeals() {
        return await deals.find()
            .sort({ comments: -1 })
            .project({ _id: 0, id: 1, title: 1, price: 1, discount: 1, comments: 1 })
            .limit(5)
            .toArray();
    }

    async function findDealsSortedByPrice(order = 'asc') {
        return await deals.find()
            .sort({ price: order === 'asc' ? 1 : -1 })
            .project({ _id: 0, id: 1, title: 1, price: 1, discount: 1, comments: 1 })
            .toArray();
    }

    async function findDealsSortedByDate(order = 'desc') {
        return await deals.find()
            .sort({ published: order === 'asc' ? 1 : -1 })
            .project({ _id: 0, id: 1, title: 1, price: 1, discount: 1, comments: 1, published: 1 })
            .toArray();
    }

    async function findSalesByLegoSetId(legoSetId) {
        return await sales.find({ legoSetId })
            .project({ _id: 0, legoSetId: 1, title: 1, price: 1, published: 1 })
            .toArray();
    }

    async function findRecentSales() {
        const threeWeeksAgo = new Date();
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
        return await sales.find({ published: { $gte: threeWeeksAgo } })
            .project({ _id: 0, legoSetId: 1, title: 1, price: 1, published: 1 })
            .toArray();
    }

    // Affichage des résultats
    console.log("5 best discount :\n", await findBestDiscountDeals());
    console.log("5 most commented deals :\n", await findMostCommentedDeals());
    console.log("all deals sorted by price :\n", await findDealsSortedByPrice('desc'));
    console.log("all deals sorted by date :\n", await findDealsSortedByDate());
    console.log("all sales for LEGO set ID 10363 :\n", await findSalesByLegoSetId('10363'));
    console.log("all sales scraped less than 3 weeks :\n", await findRecentSales());
}

async function main() {
    try {
        const db = await connectDB();
        await insertDeals(db);
        await insertSales(db);
        await runQueries(db);
    } catch (error) {
        console.error('Erreur dans l\'exécution :', error);
    } finally {
        await client.close();
        console.log('Connexion MongoDB fermée');
    }
}

main().catch(console.error);
