const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage for demo (use a database in production)
const plans = new Map();
const votes = new Map();

// API Routes

// Generate activities using Gemini AI
app.post('/api/activities/generate', async (req, res) => {
    try {
        const { location, activityType, budget } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Generate 8 real, specific activity suggestions for ${location}.

        Requirements:
        - Activity type preference: ${activityType === 'any' ? 'any type of activity' : activityType}
        - Budget: ${budget === 'any' ? 'any budget' : budget === 'low' ? 'budget-friendly ($)' : budget === 'medium' ? 'moderate ($$)' : 'premium ($$$)'}
        - Include actual business names, venues, or specific locations when possible
        - Provide realistic ratings (4.0-4.8 stars)
        - Include brief descriptions that sound appealing and spontaneous

        Return ONLY a valid JSON array with this exact format:
        [
            {
                "name": "Actual venue/activity name",
                "category": "Food|Entertainment|Outdoors|Nightlife|Culture|Sports",
                "description": "Brief appealing description (1-2 sentences)",
                "rating": "4.3★",
                "price": "$|$$|$$$|Free",
                "type": "food|entertainment|outdoors|nightlife|culture|sports"
            }
        ]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let activities;
        try {
            // Remove any markdown formatting that might be around the JSON
            const cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
            activities = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            // Fallback to mock data if parsing fails
            activities = getMockActivities(activityType);
        }

        res.json({ success: true, activities });
    } catch (error) {
        console.error('Error generating activities:', error);
        // Fallback to mock data
        const activities = getMockActivities(req.body.activityType);
        res.json({ success: true, activities });
    }
});

function getMockActivities(activityType) {
    const mockActivities = [
        {
            name: "The Rooftop Bar",
            category: "Nightlife",
            description: "Trendy rooftop bar with city views and craft cocktails",
            rating: "4.5★",
            price: "$$",
            type: "nightlife"
        },
        {
            name: "Local Art Museum",
            category: "Culture",
            description: "Contemporary art museum featuring local and international artists",
            rating: "4.2★",
            price: "$",
            type: "culture"
        },
        {
            name: "Riverside Park Trail",
            category: "Outdoors",
            description: "Scenic walking trail along the river with bike rentals available",
            rating: "4.7★",
            price: "Free",
            type: "outdoors"
        },
        {
            name: "Burger Junction",
            category: "Food",
            description: "Gourmet burgers with locally sourced ingredients",
            rating: "4.3★",
            price: "$$",
            type: "food"
        },
        {
            name: "Escape Room Adventure",
            category: "Entertainment",
            description: "Challenging escape rooms with various themes and difficulty levels",
            rating: "4.6★",
            price: "$$",
            type: "entertainment"
        },
        {
            name: "Downtown Bowling",
            category: "Sports",
            description: "Modern bowling alley with arcade games and food court",
            rating: "4.1★",
            price: "$",
            type: "sports"
        },
        {
            name: "Jazz Club Live",
            category: "Entertainment",
            description: "Intimate jazz club featuring live music every night",
            rating: "4.4★",
            price: "$$$",
            type: "entertainment"
        },
        {
            name: "Food Truck Festival",
            category: "Food",
            description: "Weekly gathering of local food trucks with diverse cuisines",
            rating: "4.5★",
            price: "$",
            type: "food"
        }
    ];

    if (activityType !== 'any') {
        return mockActivities.filter(activity => activity.type === activityType);
    }
    return mockActivities;
}

// Create a new plan
app.post('/api/plans', (req, res) => {
    const planId = generateId();
    const plan = {
        id: planId,
        ...req.body,
        createdAt: new Date(),
        activities: []
    };

    plans.set(planId, plan);
    votes.set(planId, []);

    res.json({ success: true, planId, plan });
});

// Get plan by ID
app.get('/api/plans/:planId', (req, res) => {
    const plan = plans.get(req.params.planId);
    if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
    }

    const planVotes = votes.get(req.params.planId) || [];
    res.json({ plan, votes: planVotes });
});

// Submit votes for a plan
app.post('/api/plans/:planId/votes', (req, res) => {
    const planId = req.params.planId;
    const { userId, userVotes } = req.body;

    if (!plans.has(planId)) {
        return res.status(404).json({ error: 'Plan not found' });
    }

    let planVotes = votes.get(planId) || [];

    // Remove any existing votes from this user
    planVotes = planVotes.filter(vote => vote.userId !== userId);

    // Add new votes
    userVotes.forEach(vote => {
        planVotes.push({
            ...vote,
            userId,
            timestamp: new Date()
        });
    });

    votes.set(planId, planVotes);

    res.json({ success: true, totalVotes: planVotes.length });
});

// Get voting results for a plan
app.get('/api/plans/:planId/results', (req, res) => {
    const planId = req.params.planId;
    const planVotes = votes.get(planId) || [];

    // Calculate vote tallies
    const voteTallies = {};
    const activityDetails = {};

    planVotes.forEach(vote => {
        if (vote.liked) {
            const activityName = vote.activity.name;
            voteTallies[activityName] = (voteTallies[activityName] || 0) + 1;
            activityDetails[activityName] = vote.activity;
        }
    });

    // Sort by vote count
    const results = Object.entries(voteTallies)
        .sort(([,a], [,b]) => b - a)
        .map(([name, voteCount]) => ({
            activity: activityDetails[name],
            votes: voteCount
        }));

    res.json({ results, totalVoters: new Set(planVotes.map(v => v.userId)).size });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

app.listen(PORT, () => {
    console.log(`Let's Go app running on http://localhost:${PORT}`);
});

module.exports = app;