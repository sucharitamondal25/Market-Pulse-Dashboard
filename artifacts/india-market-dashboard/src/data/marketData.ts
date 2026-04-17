export const tickerData = [
  { symbol: "NIFTY 50", value: "24,286.50", change: "+1.23%", up: true },
  { symbol: "SENSEX", value: "79,943.48", change: "+1.18%", up: true },
  { symbol: "BANKNIFTY", value: "52,341.20", change: "+0.87%", up: true },
  { symbol: "NIFTY IT", value: "38,124.30", change: "+2.14%", up: true },
  { symbol: "NIFTY PHARMA", value: "19,872.45", change: "-0.42%", up: false },
  { symbol: "NIFTY AUTO", value: "21,456.80", change: "+0.63%", up: true },
  { symbol: "NIFTY METAL", value: "8,921.55", change: "-1.24%", up: false },
  { symbol: "NIFTY FMCG", value: "54,312.90", change: "+0.31%", up: true },
  { symbol: "INDIA VIX", value: "13.42", change: "-3.21%", up: false },
  { symbol: "USD/INR", value: "83.47", change: "-0.15%", up: false },
  { symbol: "GOLD", value: "71,245", change: "+0.42%", up: true },
  { symbol: "CRUDE OIL", value: "6,874", change: "-0.87%", up: false },
  { symbol: "10Y G-SEC", value: "6.89%", change: "-0.04%", up: false },
  { symbol: "NIFTY MIDCAP", value: "52,834.75", change: "+1.54%", up: true },
  { symbol: "NIFTY SMALLCAP", value: "16,923.40", change: "+1.87%", up: true },
];

export const sectorPerformance = [
  { name: "IT", change: +2.14, strength: "Strong" },
  { name: "Auto", change: +1.82, strength: "Strong" },
  { name: "Realty", change: +1.54, strength: "Strong" },
  { name: "PSU Banks", change: +1.21, strength: "Moderate" },
  { name: "FMCG", change: +0.31, strength: "Weak" },
  { name: "Financials", change: -0.18, strength: "Weak" },
  { name: "Oil & Gas", change: -0.44, strength: "Weak" },
  { name: "Pharma", change: -0.42, strength: "Weak" },
  { name: "Metals", change: -1.24, strength: "Bearish" },
  { name: "Media", change: -1.67, strength: "Bearish" },
];

export const scoringWeights = [
  { label: "Trend", score: 88, weight: 25, color: "#00e676" },
  { label: "Momentum", score: 72, weight: 25, color: "#00e676" },
  { label: "Breadth", score: 65, weight: 20, color: "#ffea00" },
  { label: "Volatility", score: 78, weight: 15, color: "#00e676" },
  { label: "Macro", score: 58, weight: 15, color: "#ffea00" },
];

export const volatilityData = {
  indiaVix: { value: 13.42, label: "India VIX", sentiment: "Low Vol" },
  vixTrend: { value: "Falling", sentiment: "Bullish" },
  vixPercentile: { value: "28th", sentiment: "Normal" },
  pcr: { value: 1.12, sentiment: "Neutral" },
};

export const trendData = [
  { label: "NIFTY vs 20d SMA", status: "Above", sentiment: "Bullish" },
  { label: "NIFTY vs 50d SMA", status: "Above", sentiment: "Bullish" },
  { label: "NIFTY vs 200d SMA", status: "Above", sentiment: "Strong" },
  { label: "ADX Strength", status: "28.4 Strong", sentiment: "Trending" },
  { label: "Weekly Trend", status: "Uptrend", sentiment: "Bullish" },
  { label: "Regime", status: "Risk-On", sentiment: "Bullish" },
];

export const breadthData = [
  { label: "% above 50d MA", value: 64, sentiment: "Healthy" },
  { label: "% above 200d MA", value: 71, sentiment: "Healthy" },
  { label: "NSE Advance/Decline", value: "3.1:1", sentiment: "Strong" },
  { label: "New 52W Highs/Lows", value: "142/18", sentiment: "Bullish" },
];

export const momentumData = [
  { label: "Sectoral Leaders", value: "IT, Auto, Realty", status: "Leading" },
  { label: "Laggards", value: "Metals, Media", status: "Lagging" },
  { label: "Breadth Thrust", value: "Confirming", status: "Positive" },
  { label: "Participation", value: "Broad", status: "Selective" },
];

export const macroData = [
  { label: "RBI Policy", value: "Neutral", status: "Hold" },
  { label: "FII Flow", value: "+₹2,842 Cr", status: "Buying" },
  { label: "DII Flow", value: "+₹1,124 Cr", status: "Buying" },
  { label: "USD/INR", value: "83.47 Stable", status: "Stable" },
  { label: "Fed Stance", value: "Dovish", status: "Positive" },
  { label: "Crude Oil", value: "6,874 Neutral", status: "Neutral" },
];

export const executionWindow = [
  { question: "Breakouts working?", answer: "Yes", status: "Conviction" },
  { question: "Leaders holding?", answer: "Yes", status: "Holding" },
  { question: "Pullbacks bought?", answer: "Yes", status: "Support" },
  { question: "Follow-through?", answer: "Yes", status: "Confirming" },
];

export const totalScore = 74;

export const decisionData = {
  decision: "YES",
  score: 74,
  maxScore: 100,
  mode: "Swing Trading",
  positionSize: "FULL SIZE",
  risk: "Press Risk",
};

export const topStocks = [
  { symbol: "INFY", name: "Infosys", price: "1,842.30", change: "+3.21%", up: true, sector: "IT" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: "891.45", change: "+2.87%", up: true, sector: "Auto" },
  { symbol: "DLF", name: "DLF Ltd", price: "734.60", change: "+2.54%", up: true, sector: "Realty" },
  { symbol: "SBIN", name: "State Bank of India", price: "812.30", change: "+1.92%", up: true, sector: "PSU Bank" },
  { symbol: "RELIANCE", name: "Reliance Industries", price: "2,934.50", change: "+0.87%", up: true, sector: "Oil & Gas" },
];

export const recentAlerts = [
  { time: "10:32 AM", message: "NIFTY broke above 24,250 resistance with volume", type: "bullish" },
  { time: "10:15 AM", message: "FII net buying ₹2,842 Cr — 3rd consecutive day", type: "bullish" },
  { time: "09:58 AM", message: "India VIX fell 3.2% — fear declining", type: "bullish" },
  { time: "09:45 AM", message: "METALS sector showing relative weakness — avoid", type: "bearish" },
  { time: "09:30 AM", message: "Market opened gap-up 0.4% — bullish continuation", type: "bullish" },
];
