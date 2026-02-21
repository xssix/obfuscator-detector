import joblib
import sys
import os
import time
from collections import Counter

MODEL_FILE = "detect.model"
NGRAM_SIZE = 3
AMPLIFICATION_POWER = 8
def get_ngrams(text):
    text = "".join(text.split())
    return [text[i:i+NGRAM_SIZE] for i in range(len(text)-NGRAM_SIZE+1)]

def calculate_similarity(target_dist, profile_dist):
    overlap = 0
    for ngram, freq in target_dist.items():
        if ngram in profile_dist:
            overlap += min(freq, profile_dist[ngram])
    return overlap

def detect_math(content, profiles):
    target_ngrams = get_ngrams(content[:20000])
    if not target_ngrams: return []
    
    counts = Counter(target_ngrams)
    total = sum(counts.values())
    target_dist = {ngram: (count / total) * 100 for ngram, count in counts.items()}

    results = []
    for category, dist in profiles.items():
        score = calculate_similarity(target_dist, dist)
        results.append({"name": category, "prob": score ** AMPLIFICATION_POWER})

    total_prob = sum(r["prob"] for r in results)
    if total_prob > 0:
        for r in results:
            r["confidence"] = (r["prob"] / total_prob) * 100
    else:
        for r in results: r["confidence"] = 0

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results

def main():
    if len(sys.argv) < 2:
        print("Usage: python detect.py <file.lua>")
        return

    target_file = sys.argv[1]
    if not os.path.exists(target_file):
        print(f"Error: File {target_file} not found.")
        return

    if not os.path.exists(MODEL_FILE):
        print("Error: model not found please download from github")
        return

    print(f"[*] LOADING MATHEMATICAL ENGINE...")
    profiles = joblib.load(MODEL_FILE)

    print(f"[*] ANALYZING: {os.path.basename(target_file)}")
    start_time = time.time()

    with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    results = detect_math(content, profiles)
    end_time = time.time()
    
    if not results:
        print("[!] no script or no match.")
        return

    top = results[0]
    print("\n" + "="*45)
    print(f"PRIMARY DETECTION: {top['name'].upper()}")
    print(f"CONFIDENCE:        {top['confidence']:.2f}%")
    print("="*45)

    print("\n[INFO]")
    for r in results:
        bar_len = int(r["confidence"] / 2.5)
        bar = "#" * bar_len
        print(f"{r['name']:<15} | {bar:<40} | {r['confidence']:>6.2f}%")

    print(f"\nSeconds took: {(end_time - start_time) * 1000:.2f}ms")

if __name__ == "__main__":
    main()
