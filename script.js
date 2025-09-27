class LetsGoApp {
    constructor() {
        this.currentScreen = 'planCreation';
        this.currentPlan = null;
        this.activities = [];
        this.currentActivityIndex = 0;
        this.userVotes = [];
        this.friends = [];
        this.planId = null;
        this.userId = this.generateUserId();
        this.apiBase = window.location.origin;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPlanFromURL();
    }

    bindEvents() {
        document.getElementById('createPlan').addEventListener('click', () => this.createPlan());
        document.getElementById('passBtn').addEventListener('click', () => this.voteOnActivity(false));
        document.getElementById('likeBtn').addEventListener('click', () => this.voteOnActivity(true));
        document.getElementById('spinWheel').addEventListener('click', () => this.spinForDecision());
        document.getElementById('inviteFriends').addEventListener('click', () => this.showFriendsScreen());
        document.getElementById('copyLink').addEventListener('click', () => this.copyPlanLink());
        document.getElementById('viewResults').addEventListener('click', () => this.showResults());
        document.getElementById('startOver').addEventListener('click', () => this.startOver());

        // Add swipe gesture support
        this.addSwipeGestures();
    }

    async createPlan() {
        const planName = document.getElementById('planName').value || 'Our Activity';
        const location = document.getElementById('location').value;
        const activityType = document.getElementById('activityType').value;
        const budget = document.getElementById('budget').value;

        if (!location) {
            alert('Please enter a location');
            return;
        }

        const planData = {
            name: planName,
            location: location,
            activityType: activityType,
            budget: budget
        };

        try {
            const response = await fetch(`${this.apiBase}/api/plans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });

            const result = await response.json();

            if (result.success) {
                this.currentPlan = result.plan;
                this.planId = result.planId;
                await this.generateActivities();
                this.showScreen('activitySelection');
                this.displayCurrentActivity();
            } else {
                alert('Failed to create plan. Please try again.');
            }
        } catch (error) {
            console.error('Error creating plan:', error);
            // Fallback to local mode
            this.currentPlan = planData;
            this.planId = this.generatePlanId();
            await this.generateActivities();
            this.showScreen('activitySelection');
            this.displayCurrentActivity();
        }
    }

    async generateActivities() {
        try {
            const response = await fetch(`${this.apiBase}/api/activities/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: this.currentPlan.location,
                    activityType: this.currentPlan.activityType,
                    budget: this.currentPlan.budget
                })
            });

            const result = await response.json();

            if (result.success && result.activities) {
                this.activities = this.shuffleArray([...result.activities]);
                this.currentActivityIndex = 0;
                return;
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        }

        // Fallback to mock data
        this.generateMockActivities();
    }

    generateMockActivities() {
        // Mock activity data - fallback when API fails
        const allActivities = [
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

        // Filter activities based on user preferences
        let filteredActivities = allActivities;

        if (this.currentPlan.activityType !== 'any') {
            filteredActivities = filteredActivities.filter(activity =>
                activity.type === this.currentPlan.activityType
            );
        }

        // If no activities match the filter, show all activities
        if (filteredActivities.length === 0) {
            filteredActivities = allActivities;
        }

        // Shuffle the activities for variety
        this.activities = this.shuffleArray([...filteredActivities]);
        this.currentActivityIndex = 0;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    displayCurrentActivity() {
        const cardStack = document.getElementById('activityCards');
        cardStack.innerHTML = '';

        if (this.currentActivityIndex >= this.activities.length) {
            this.showFriendsScreen();
            return;
        }

        const activity = this.activities[this.currentActivityIndex];
        const card = this.createActivityCard(activity);
        cardStack.appendChild(card);
    }

    createActivityCard(activity) {
        const card = document.createElement('div');
        card.className = 'activity-card';
        card.innerHTML = `
            <h3>${activity.name}</h3>
            <div class="category">${activity.category}</div>
            <div class="description">${activity.description}</div>
            <div class="details">
                <span class="rating">${activity.rating}</span>
                <span class="price">${activity.price}</span>
            </div>
        `;
        return card;
    }

    voteOnActivity(liked) {
        if (this.currentActivityIndex >= this.activities.length) return;

        const activity = this.activities[this.currentActivityIndex];
        this.userVotes.push({
            activity: activity,
            liked: liked,
            userId: 'creator'
        });

        this.currentActivityIndex++;
        this.displayCurrentActivity();
    }

    addSwipeGestures() {
        let startX = 0;
        let currentX = 0;
        let cardStack = null;

        document.addEventListener('touchstart', (e) => {
            cardStack = document.getElementById('activityCards');
            if (!cardStack.contains(e.target)) return;

            startX = e.touches[0].clientX;
        });

        document.addEventListener('touchmove', (e) => {
            if (!cardStack || !cardStack.contains(e.target)) return;

            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            const card = cardStack.querySelector('.activity-card');

            if (card) {
                card.style.transform = `translateX(${diffX}px) rotate(${diffX * 0.1}deg)`;
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!cardStack) return;

            const diffX = currentX - startX;
            const card = cardStack.querySelector('.activity-card');

            if (card) {
                if (Math.abs(diffX) > 100) {
                    this.voteOnActivity(diffX > 0);
                }
                card.style.transform = '';
            }

            cardStack = null;
        });
    }

    spinForDecision() {
        if (this.userVotes.length === 0) {
            alert('Vote on some activities first!');
            return;
        }

        const likedActivities = this.userVotes.filter(vote => vote.liked);

        if (likedActivities.length === 0) {
            alert('You need to like at least one activity to spin!');
            return;
        }

        const randomActivity = likedActivities[Math.floor(Math.random() * likedActivities.length)];

        // Show spinning animation
        const cardStack = document.getElementById('activityCards');
        cardStack.innerHTML = `
            <div class="activity-card spinning">
                <h3>🎲 Spinning...</h3>
                <p>Let fate decide!</p>
            </div>
        `;

        setTimeout(() => {
            cardStack.innerHTML = `
                <div class="activity-card winner-card">
                    <h3>🎉 ${randomActivity.activity.name}</h3>
                    <div class="category">${randomActivity.activity.category}</div>
                    <div class="description">${randomActivity.activity.description}</div>
                    <div class="details">
                        <span class="rating">${randomActivity.activity.rating}</span>
                        <span class="price">${randomActivity.activity.price}</span>
                    </div>
                    <p style="margin-top: 1rem; font-weight: bold; color: #667eea;">
                        The wheel has chosen! 🎯
                    </p>
                </div>
            `;
        }, 2000);
    }

    async showFriendsScreen() {
        // Submit votes to server
        await this.submitVotes();
        this.showScreen('friendsVoting');
        this.setupShareLink();
        this.displayVotingStatus();
    }

    setupShareLink() {
        const baseURL = window.location.origin + window.location.pathname;
        const planLink = `${baseURL}?plan=${this.planId}`;
        document.getElementById('planLink').value = planLink;
    }

    copyPlanLink() {
        const linkInput = document.getElementById('planLink');
        linkInput.select();
        document.execCommand('copy');

        const button = document.getElementById('copyLink');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }

    displayVotingStatus() {
        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';

        // Add creator status
        const creatorDiv = document.createElement('div');
        creatorDiv.className = 'friend-vote';
        creatorDiv.innerHTML = `
            <span>You</span>
            <span class="vote-status completed">Completed</span>
        `;
        friendsList.appendChild(creatorDiv);

        // Add friends (simulated for demo)
        this.friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend-vote';
            friendDiv.innerHTML = `
                <span>${friend.name}</span>
                <span class="vote-status ${friend.hasVoted ? 'completed' : 'pending'}">
                    ${friend.hasVoted ? 'Completed' : 'Pending'}
                </span>
            `;
            friendsList.appendChild(friendDiv);
        });
    }

    async showResults() {
        this.showScreen('results');
        await this.calculateAndDisplayResults();
    }

    async calculateAndDisplayResults() {
        const serverResults = await this.loadPlanResults();

        if (serverResults && serverResults.results.length > 0) {
            this.displayWinner(serverResults.results[0]);
            this.displayOtherOptions(serverResults.results.slice(1));
        } else {
            // Fallback to local calculation
            this.calculateLocalResults();
        }
    }

    calculateLocalResults() {
        // Combine all votes (user + friends)
        let allVotes = [...this.userVotes];

        // Add simulated friend votes for demo
        this.friends.forEach(friend => {
            if (friend.hasVoted) {
                allVotes = allVotes.concat(friend.votes);
            }
        });

        // Calculate vote tallies
        const voteTallies = {};
        allVotes.forEach(vote => {
            if (vote.liked) {
                const activityName = vote.activity.name;
                voteTallies[activityName] = (voteTallies[activityName] || 0) + 1;
            }
        });

        // Sort activities by vote count
        const sortedResults = Object.entries(voteTallies)
            .sort(([,a], [,b]) => b - a)
            .map(([name, votes]) => ({
                name,
                votes,
                activity: allVotes.find(v => v.activity.name === name)?.activity
            }));

        this.displayWinner(sortedResults[0]);
        this.displayOtherOptions(sortedResults.slice(1));
    }

    displayWinner(winner) {
        const winnerDiv = document.getElementById('winningActivity');
        if (winner && winner.activity) {
            winnerDiv.innerHTML = `
                <h3>🎉 ${winner.activity.name}</h3>
                <p>${winner.activity.description}</p>
                <p><strong>${winner.votes} votes</strong></p>
            `;
        } else {
            winnerDiv.innerHTML = `
                <h3>🤷‍♀️ No clear winner</h3>
                <p>Time to spin the wheel or try again!</p>
            `;
        }
    }

    displayOtherOptions(others) {
        const otherDiv = document.getElementById('otherActivities');
        const othersList = others.map(option => `
            <div class="activity-result">
                <span>${option.activity.name}</span>
                <span class="votes">${option.votes} votes</span>
            </div>
        `).join('');

        otherDiv.innerHTML = `
            <h3>Other Popular Options</h3>
            ${othersList}
        `;
    }

    async submitVotes() {
        if (!this.planId || this.userVotes.length === 0) return;

        try {
            const response = await fetch(`${this.apiBase}/api/plans/${this.planId}/votes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    userVotes: this.userVotes
                })
            });

            const result = await response.json();
            console.log('Votes submitted:', result);
        } catch (error) {
            console.error('Error submitting votes:', error);
        }
    }

    async loadPlanResults() {
        if (!this.planId) return null;

        try {
            const response = await fetch(`${this.apiBase}/api/plans/${this.planId}/results`);
            const results = await response.json();
            return results;
        } catch (error) {
            console.error('Error loading results:', error);
            return null;
        }
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    generatePlanId() {
        return Math.random().toString(36).substr(2, 9);
    }

    loadPlanFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('plan');

        if (planId) {
            // Load the actual plan from server
            this.planId = planId;
            this.loadRealPlan();
        }
    }

    async loadRealPlan() {
        try {
            const response = await fetch(`${this.apiBase}/api/plans/${this.planId}`);
            const result = await response.json();

            if (result.plan) {
                this.currentPlan = result.plan;
                await this.generateActivities();
                this.showScreen('activitySelection');
                this.displayCurrentActivity();
            } else {
                // Fallback for demo
                this.simulateFriendView();
            }
        } catch (error) {
            console.error('Error loading plan:', error);
            this.simulateFriendView();
        }
    }

    simulateFriendView() {
        // Fallback: Simulate friend joining an existing plan
        this.currentPlan = {
            name: 'Shared Activity Plan',
            location: 'Current City',
            activityType: 'any',
            budget: 'medium'
        };

        this.generateActivities();
        this.showScreen('activitySelection');
        this.displayCurrentActivity();

        // No simulated friends for real usage
        this.friends = [];
    }

    generateRandomVotes() {
        const votes = [];
        this.activities.forEach(activity => {
            if (Math.random() > 0.3) { // 70% chance of voting
                votes.push({
                    activity: activity,
                    liked: Math.random() > 0.4, // 60% chance of liking
                    userId: 'friend'
                });
            }
        });
        return votes;
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;
    }

    startOver() {
        this.currentPlan = null;
        this.activities = [];
        this.currentActivityIndex = 0;
        this.userVotes = [];
        this.friends = [];
        this.planId = null;

        // Clear form inputs
        document.getElementById('planName').value = '';
        document.getElementById('location').value = '';
        document.getElementById('activityType').value = 'any';
        document.getElementById('budget').value = 'low';

        this.showScreen('planCreation');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LetsGoApp();
});