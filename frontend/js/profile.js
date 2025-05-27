class ProfilePage {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.userStats = null;
        this.progressChart = null;
        
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.renderProfile();
        this.initializeCharts();
        this.generateActivityCalendar();
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.userStats = await response.json();
            } else {
                // Use mock data
                this.userStats = this.getMockUserStats();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.userStats = this.getMockUserStats();
        }
    }

    getMockUserStats() {
        return {
            username: 'student',
            name: 'John Doe',
            email: 'john.doe@example.com',
            avatar: 'https://via.placeholder.com/120',
            totalSolved: 45,
            globalRanking: 12543,
            reputation: 1250,
            easySolved: 25,
            easyTotal: 150,
            mediumSolved: 15,
            mediumTotal: 200,
            hardSolved: 5,
            hardTotal: 100,
            contestsAttended: 8,
            bestRanking: 234,
            contestRating: 1456,
            recentSubmissions: [
                {
                    problem: 'Two Sum',
                    status: 'Accepted',
                    language: 'JavaScript',
                    time: '2 hours ago'
                },
                {
                    problem: 'Add Two Numbers',
                    status: 'Wrong Answer',
                    language: 'Python',
                    time: '1 day ago'
                },
                {
                    problem: 'Longest Substring',
                    status: 'Accepted',
                    language: 'Java',
                    time: '2 days ago'
                }
            ],
            skills: ['Array', 'String', 'Dynamic Programming', 'Tree', 'Graph'],
            badges: [
                { name: 'First Solve', icon: '🎯' },
                { name: '10 Problems', icon: '🔟' },
                { name: 'Speed Demon', icon: '⚡' },
                { name: 'Consistent', icon: '📅' }
            ],
            activityData: this.generateMockActivity()
        };
    }

    generateMockActivity() {
        const data = [];
        const today = new Date();
        
        for (let i = 365; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const activity = Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0;
            data.push({
                date: date.toISOString().split('T')[0],
                count: activity
            });
        }
        
        return data;
    }

    renderProfile() {
        if (!this.userStats) return;

        // Update profile header
        const profileName = document.getElementById('profileName');
        const profileUsername = document.getElementById('profileUsername');
        const profileAvatar = document.getElementById('profileAvatar');
        const totalSolved = document.getElementById('totalSolved');
        const globalRanking = document.getElementById('globalRanking');
        const reputation = document.getElementById('reputation');

        if (profileName) profileName.textContent = this.userStats.name;
        if (profileUsername) profileUsername.textContent = `@${this.userStats.username}`;
        if (profileAvatar) profileAvatar.src = this.userStats.avatar;
        if (totalSolved) totalSolved.textContent = this.userStats.totalSolved;
        if (globalRanking) globalRanking.textContent = `#${this.userStats.globalRanking.toLocaleString()}`;
        if (reputation) reputation.textContent = this.userStats.reputation;

        // Update progress stats
        const easySolved = document.getElementById('easySolved');
        const easyTotal = document.getElementById('easyTotal');
        const mediumSolved = document.getElementById('mediumSolved');
        const mediumTotal = document.getElementById('mediumTotal');
        const hardSolved = document.getElementById('hardSolved');
        const hardTotal = document.getElementById('hardTotal');

        if (easySolved) easySolved.textContent = this.userStats.easySolved;
        if (easyTotal) easyTotal.textContent = this.userStats.easyTotal;
        if (mediumSolved) mediumSolved.textContent = this.userStats.mediumSolved;
        if (mediumTotal) mediumTotal.textContent = this.userStats.mediumTotal;
        if (hardSolved) hardSolved.textContent = this.userStats.hardSolved;
        if (hardTotal) hardTotal.textContent = this.userStats.hardTotal;

        // Update contest stats
        const contestsAttended = document.getElementById('contestsAttended');
        const bestRanking = document.getElementById('bestRanking');
        const contestRating = document.getElementById('contestRating');

        if (contestsAttended) contestsAttended.textContent = this.userStats.contestsAttended;
        if (bestRanking) bestRanking.textContent = `#${this.userStats.bestRanking}`;
        if (contestRating) contestRating.textContent = this.userStats.contestRating;

        // Render recent submissions
        this.renderRecentSubmissions();
        this.renderSkills();
        this.renderBadges();
    }

    renderRecentSubmissions() {
        const recentSubmissions = document.getElementById('recentSubmissions');
        if (!recentSubmissions || !this.userStats.recentSubmissions) return;

        recentSubmissions.innerHTML = this.userStats.recentSubmissions.map(submission => `
            <div class="submission-item">
                <div class="submission-info">
                    <div class="submission-problem">${submission.problem}</div>
                    <div class="submission-meta">${submission.language} • ${submission.time}</div>
                </div>
                <div class="submission-status submission-${submission.status.toLowerCase().replace(' ', '-')}">
                    ${submission.status}
                </div>
            </div>
        `).join('');
    }

    renderSkills() {
        const skillsList = document.getElementById('skillsList');
        if (!skillsList || !this.userStats.skills) return;

        skillsList.innerHTML = this.userStats.skills.map(skill => 
            `<span class="skill-tag">${skill}</span>`
        ).join('');
    }

    renderBadges() {
        const badgesList = document.getElementById('badgesList');
        if (!badgesList || !this.userStats.badges) return;

        badgesList.innerHTML = this.userStats.badges.map(badge => `
            <div class="badge-item">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    }

    initializeCharts() {
        const ctx = document.getElementById('progressChart');
        if (!ctx || typeof Chart === 'undefined') return;

        const data = {
            labels: ['Easy', 'Medium', 'Hard'],
            datasets: [{
                data: [
                    this.userStats.easySolved,
                    this.userStats.mediumSolved,
                    this.userStats.hardSolved
                ],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        };

        this.progressChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
    }

    generateActivityCalendar() {
        const activityCalendar = document.getElementById('activityCalendar');
        if (!activityCalendar || !this.userStats.activityData) return;

        activityCalendar.innerHTML = this.userStats.activityData.map(day => {
            const level = day.count === 0 ? '' : `level-${Math.min(day.count, 4)}`;
            return `<div class="activity-day ${level}" title="${day.date}: ${day.count} submissions"></div>`;
        }).join('');
    }
}

// Initialize the profile page
document.addEventListener('DOMContentLoaded', () => {
    new ProfilePage();
});
