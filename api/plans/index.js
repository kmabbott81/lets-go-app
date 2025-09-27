// In-memory storage for demo (use a database in production)
let plans = new Map();
let votes = new Map();

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Create a new plan
        const planId = generateId();
        const plan = {
            id: planId,
            ...req.body,
            createdAt: new Date(),
            activities: []
        };

        plans.set(planId, plan);
        votes.set(planId, []);

        return res.json({ success: true, planId, plan });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}