import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
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
        const { activityDescription, location, activityType, budget } = req.body;

        // First, use Gemini to determine the best search terms for Google Places
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const searchTermsPrompt = `Given the activity request "${activityDescription || activityType}", what are the best 3-5 search terms to find relevant businesses on Google Places?

        For example:
        - "booze cruise" → ["boat tours", "harbor cruises", "party boats"]
        - "wine tasting" → ["wineries", "wine bars", "tasting rooms"]
        - "live music" → ["music venues", "concert halls", "bars with live music"]

        Return only a JSON array of search terms: ["term1", "term2", "term3"]`;

        const searchTermsResult = await model.generateContent(searchTermsPrompt);
        const searchTermsText = searchTermsResult.response.text();

        let searchTerms;
        try {
            searchTerms = JSON.parse(searchTermsText.replace(/```json\s*|\s*```/g, '').trim());
        } catch (e) {
            // Fallback search terms
            searchTerms = [activityDescription || activityType];
        }

        // Search Google Places for real businesses
        const realBusinesses = await searchGooglePlaces(searchTerms, location);

        if (realBusinesses.length > 0) {
            res.json({ success: true, activities: realBusinesses });
        } else {
            // Fallback to enhanced mock data
            const activities = getMockActivities(activityType, location);
            res.json({ success: true, activities });
        }

    } catch (error) {
        console.error('Error generating activities:', error);
        // Fallback to mock data
        const activities = getMockActivities(req.body.activityType, req.body.location);
        res.json({ success: true, activities });
    }
}

async function searchGooglePlaces(searchTerms, location) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const allBusinesses = [];

    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 search terms
        try {
            // Step 1: Text Search to find places
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term + ' ' + location)}&key=${apiKey}`;

            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            if (searchData.results && searchData.results.length > 0) {
                // Step 2: Get detailed info for each place
                for (const place of searchData.results.slice(0, 3)) { // Max 3 per search term
                    try {
                        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,formatted_address,rating,price_level,opening_hours,types&key=${apiKey}`;

                        const detailsResponse = await fetch(detailsUrl);
                        const detailsData = await detailsResponse.json();

                        if (detailsData.result) {
                            const business = formatPlaceData(detailsData.result, place);
                            if (business) {
                                allBusinesses.push(business);
                            }
                        }
                    } catch (detailError) {
                        console.error('Error fetching place details:', detailError);
                    }
                }
            }
        } catch (searchError) {
            console.error('Error searching places:', searchError);
        }
    }

    // Remove duplicates and limit to 8 results
    const uniqueBusinesses = allBusinesses.filter((business, index, arr) =>
        arr.findIndex(b => b.name === business.name) === index
    );

    return uniqueBusinesses.slice(0, 8);
}

function formatPlaceData(details, basicInfo) {
    const types = details.types || [];
    const category = getCategoryFromTypes(types);
    const priceLevel = details.price_level || 2;

    return {
        name: details.name,
        category: category,
        description: `${details.name} offers ${category.toLowerCase()} in a welcoming atmosphere.`,
        rating: details.rating ? `${details.rating}★` : "4.0★",
        price: getPriceFromLevel(priceLevel),
        type: category.toLowerCase(),
        phone: details.formatted_phone_number || null,
        website: details.website || null,
        address: details.formatted_address || null,
        hours: getHoursFromOpeningHours(details.opening_hours)
    };
}

function getCategoryFromTypes(types) {
    const typeMap = {
        'restaurant': 'Food',
        'bar': 'Nightlife',
        'tourist_attraction': 'Entertainment',
        'museum': 'Culture',
        'park': 'Outdoors',
        'gym': 'Sports',
        'night_club': 'Nightlife',
        'amusement_park': 'Entertainment',
        'zoo': 'Entertainment',
        'bowling_alley': 'Sports',
        'movie_theater': 'Entertainment'
    };

    for (const type of types) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }
    return 'Entertainment';
}

function getPriceFromLevel(level) {
    const priceMap = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$' };
    return priceMap[level] || '$$';
}

function getHoursFromOpeningHours(openingHours) {
    if (!openingHours || !openingHours.weekday_text) {
        return "Hours vary";
    }
    return openingHours.weekday_text[0] || "Hours vary";
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