import { ExtendedDashboardMetrics } from '../types';

export const generateMockDashboardData = (realMetrics: { totalSessions: number, avgEngagement: number, avgWinProb: number, totalObjections: number }): ExtendedDashboardMetrics => {
    return {
        overallScore: Math.round((realMetrics.avgEngagement + realMetrics.avgWinProb) / 2) || 78,
        avgWinProb: realMetrics.avgWinProb || 32,
        avgEngagement: realMetrics.avgEngagement || 85,
        practiceStreakDays: 4,
        trends: {
            score: 'up',
            winProb: 'up',
            engagement: 'flat'
        },
        conversationQuality: {
            talkToListenRatio: 0.55, // 55% talk
            questionToStatementRatio: 0.4,
            discoveryTimeMs: 1000 * 60 * 5, // 5 mins
            pitchTimeMs: 1000 * 60 * 3, // 3 mins
            fillerWordsPerMinute: 2.5,
            speakingPaceWpm: 145,
            frameworkAdherenceScore: 82
        },
        skills: [
            { name: 'Opening & Framing', score: 92, trend: 'up', description: 'Strong agenda setting' },
            { name: 'Discovery', score: 78, trend: 'flat', description: 'Missed 2 key pain points' },
            { name: 'Value Presentation', score: 85, trend: 'up', description: 'Clear ROI articulation' },
            { name: 'Objection Handling', score: 65, trend: 'down', description: 'Struggled with price pushback' },
            { name: 'Negotiation', score: 70, trend: 'flat', description: 'Good trade-offs offered' },
            { name: 'Closing', score: 88, trend: 'up', description: 'Confident next steps' }
        ],
        objections: [
            { type: 'Price Too High', count: 12, successRate: 45, avgResponseTimeMs: 2500 },
            { type: 'Competitor Feature', count: 8, successRate: 75, avgResponseTimeMs: 1800 },
            { type: 'Not Right Time', count: 5, successRate: 60, avgResponseTimeMs: 2100 },
            { type: 'Need Approval', count: 15, successRate: 80, avgResponseTimeMs: 1500 }
        ],
        sentiment: {
            start: 65,
            end: 85,
            timeline: [
                { timestamp: 0, score: 65, trigger: 'Intro' },
                { timestamp: 60000, score: 70, trigger: 'Rapport' },
                { timestamp: 180000, score: 60, trigger: 'Budget Q' },
                { timestamp: 300000, score: 75, trigger: 'Value Prop' },
                { timestamp: 420000, score: 55, trigger: 'Objection' },
                { timestamp: 540000, score: 80, trigger: 'Resolution' },
                { timestamp: 600000, score: 85, trigger: 'Close' }
            ]
        },
        recentFeedback: [
            { id: '1', date: 'Today', tag: 'Discovery', feedback: 'Great use of open-ended questions, but you interrupted the prospect twice.', impact: '+5% Win Rate' },
            { id: '2', date: 'Yesterday', tag: 'Objection', feedback: 'Your response to the price objection was defensive. Try the "Feel, Felt, Found" method.', impact: '+12% Win Rate' },
            { id: '3', date: 'Nov 22', tag: 'Closing', feedback: 'Excellent trial close. You locked in the next meeting effectively.', impact: 'High Impact' }
        ],
        productKnowledge: {
            keywordsUsed: ['ROI', 'Scalability', 'Integration', 'Automated'],
            keywordsMissed: ['Security', 'Compliance'],
            accuracyScore: 88
        },
        nextActions: [
            { id: 'a1', title: 'Run 2 Pricing Objection Drills', type: 'drill' },
            { id: 'a2', title: 'Review "Feel, Felt, Found" Framework', type: 'learning' },
            { id: 'a3', title: 'Practice Discovery for "The Skeptic"', type: 'drill' }
        ]
    };
};
