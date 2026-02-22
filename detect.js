const fs = require('fs');
const path = require('path');

const MODEL_FILE = 'model.json';
const NGRAM_SIZE = 3;
const AMPLIFICATION_POWER = 8;

function getNGrams(text) {
    const cleanText = text.replace(/\s+/g, '');
    const ngrams = [];
    for (let i = 0; i <= cleanText.length - NGRAM_SIZE; i++) {
        ngrams.push(cleanText.substring(i, i + NGRAM_SIZE));
    }
    return ngrams;
}

function calculateSimilarity(targetDist, profileDist) {
    let overlap = 0;
    for (const [ngram, freq] of Object.entries(targetDist)) {
        if (profileDist[ngram]) {
            overlap += Math.min(freq, profileDist[ngram]);
        }
    }
    return overlap;
}

function detectMath(content, profiles) {
    const targetNGrams = getNGrams(content.slice(0, 20000));
    if (targetNGrams.length === 0) return [];

    const counts = {};
    targetNGrams.forEach(ngram => {
        counts[ngram] = (counts[ngram] || 0) + 1;
    });

    const total = targetNGrams.length;
    const targetDist = {};
    for (const [ngram, count] of Object.entries(counts)) {
        targetDist[ngram] = (count / total) * 100;
    }

    const results = [];
    for (const [category, dist] of Object.entries(profiles)) {
        const score = calculateSimilarity(targetDist, dist);
        results.push({ name: category, prob: Math.pow(score, AMPLIFICATION_POWER) });
    }

    const totalProb = results.reduce((sum, r) => sum + r.prob, 0);
    results.forEach(r => {
        r.confidence = totalProb > 0 ? (r.prob / totalProb) * 100 : 0;
    });

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node detect.js <file.lua>");
        return;
    }

    const targetFile = args[0];
    if (!fs.existsSync(targetFile)) {
        console.log(`Error: File ${targetFile} not found.`);
        return;
    }

    if (!fs.existsSync(MODEL_FILE)) {
        console.log("Error: model.json not found. Please run convert_model.py first.");
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));

    let content;
    try {
        content = fs.readFileSync(targetFile, 'utf8');
    } catch (err) {
        content = fs.readFileSync(targetFile, 'binary');
    }

    const startTime = Date.now();
    const results = detectMath(content, profiles);
    const endTime = Date.now();

    if (results.length === 0) {
        console.log("[!] no script or no match.");
        return;
    }

    const top = results[0];
    console.log(`\n[+] DETECTION: ${top.name.toUpperCase()}`);
    console.log(`[+] CONFIDENCE: ${top.confidence.toFixed(2)}%`);

    console.log("\n[INFO]");
    results.forEach(r => {
        console.log(`${r.name.padEnd(15)} | ${r.confidence.toFixed(1)}`);
    });

    console.log(`\nSeconds took: ${(endTime - startTime).toFixed(2)}ms`);
    console.log("\n[!] if this was wrong please report to xss.in on discord");
}

main();
