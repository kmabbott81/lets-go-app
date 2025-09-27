const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { location, activityType, budget } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Generate 8 real, specific activity suggestions based on: "${location}".

        IMPORTANT: If the location contains activity keywords (like "booze cruise", "wine tasting", "hiking", etc.),
        treat it as an activity request and find relevant venues/businesses for that activity type.

        Requirements:
        - Activity type preference: ${activityType === 'any' ? 'any type of activity' : activityType}
        - Budget: ${budget === 'any' ? 'any budget' : budget === 'low' ? 'budget-friendly ($)' : budget === 'medium' ? 'moderate ($$)' : 'premium ($$$)'}
        - Include actual business names, venues, or specific locations when possible
        - Provide realistic ratings (4.0-4.8 stars)
        - Include brief descriptions that sound appealing and spontaneous
        - If user typed activity names in location field, find venues for those activities

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
            activities = getMockActivities(activityType, location);
        }

        res.json({ success: true, activities });
    } catch (error) {
        console.error('Error generating activities:', error);
        // Fallback to mock data
        const activities = getMockActivities(req.body.activityType, req.body.location);
        res.json({ success: true, activities });
    }
}

function getMockActivities(activityType, location) {
    // Enhanced mock data that can respond to specific location queries
    let mockActivities = [
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
        }
    ];

    // Add boat/cruise options if location suggests it
    if (location && (location.toLowerCase().includes('cruise') || location.toLowerCase().includes('boat') || location.toLowerCase().includes('booze cruise'))) {
        mockActivities.unshift(
            {
                name: "Harbor Booze Cruise",
                category: "Entertainment",
                description: "3-hour party cruise with open bar and live DJ",
                rating: "4.4★",
                price: "$$$",
                type: "entertainment"
            },
            {
                name: "Sunset Cocktail Cruise",
                category: "Nightlife",
                description: "Scenic evening cruise with craft cocktails and harbor views",
                rating: "4.6★",
                price: "$$",
                type: "nightlife"
            },
            {
                name: "Party Boat Experience",
                category: "Entertainment",
                description: "All-inclusive floating party with drinks, dancing, and music",
                rating: "4.3★",
                price: "$$$",
                type: "entertainment"
            }
        );
    }

    if (activityType !== 'any') {
        return mockActivities.filter(activity => activity.type === activityType);
    }
    return mockActivities;
}