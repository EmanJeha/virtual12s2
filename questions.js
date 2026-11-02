/* Questions for both games. Edit text here; keep the structure.
   Question types:
     mc    – multiple choice (options + answer index)
     order – tap tiles into the right order
     line  – tap a line of code
     guess – live "higher or lower" number game (lo, hi, max guesses)
     mid   – tap the middle item of the range first..last
     hunt  – run a whole Binary Search: tap the middle each step until the key is found
   Any question can have its own "seconds". */
window.SITE_INFO = {
 badge: "Grade 12 · Unit 4 · Week 9 · Session 2 · Virtual",
 titleText: "Binary Search Games",
 warmup: { label: "Warm-up", sub: "Guess today’s topic" },
 wrapup: { label: "Wrap-up", sub: "Split it, find it" },
 lab: { label: "Explore", name: "Binary Lab", sub: "Watch the search, step by step" },
 titleHTML: "<span class=\"c1\">B</span><span class=\"c2\">i</span><span class=\"c3\">n</span><span class=\"c4\">a</span><span class=\"c5\">r</span><span class=\"c1\">y</span> <span class=\"c2\">S</span><span class=\"c3\">e</span><span class=\"c4\">a</span><span class=\"c5\">r</span><span class=\"c1\">c</span><span class=\"c2\">h</span> <span class=\"c3\">G</span><span class=\"c4\">a</span><span class=\"c5\">m</span><span class=\"c1\">e</span><span class=\"c2\">s</span>"
};

const BS_CODE = [
 "myList=[2,3,5,8,13,21,32,47,56,62]",
 "key=int(input(\"Enter a number: \"))",
 "N=len(myList)",
 "first=0",
 "last=N-1",
 "found=False",
 "while first<=last and found==False:",
 "    mid=(first+last)//2",
 "    if myList[mid]==key:",
 "        found=True",
 "        pos=mid",
 "    elif key<myList[mid]:",
 "        last=mid-1",
 "    else:",
 "        first=mid+1",
 "if found:",
 "    print(\"Found at index\",pos)",
 "else:",
 "    print(\"Not in this list\")"
];
const NUMS = [2, 3, 5, 8, 13, 21, 32, 47, 56, 62];
const NAMES = ["Ahmed", "Hana", "Khalid", "Lina", "Omar", "Sara", "Yusuf"];

window.GAMES = {
 warmup: {
  badge: "Unit 4 · Week 9 · Session 2 · Warm-up",
  name: "Higher or Lower!",
  titleHTML: "<span class=\"c1\">H</span><span class=\"c2\">i</span><span class=\"c3\">g</span><span class=\"c4\">h</span><span class=\"c5\">e</span><span class=\"c1\">r</span> <span class=\"c2\">o</span><span class=\"c3\">r</span><br><span class=\"c4\">L</span><span class=\"c5\">o</span><span class=\"c1\">w</span><span class=\"c2\">e</span><span class=\"c3\">r</span><span class=\"c4\">!</span>",
  intro: "A secret number, a few clever guesses and a hidden topic. Every correct answer flips two letters. Answer fast, build a streak, and crack the topic for +200!",
  rules: [
   "Play on your own device (or with your breakout partner)",
   "Faster answers = more points",
   "3 right in a row = 🔥 streak bonus",
   "Crack the topic early: +200",
   "Watch your name climb on the teacher’s screen"
  ],
  seconds: 40,
  points: 100,
  floaters: ["1…100", "↑", "↓", "50", "½", "mid", "?", "25"],
  topic: "Binary Search",
  mystery: {
   label: "Today’s mystery topic",
   phrase: "BINARY SEARCH",
   order: [12, 4, 8, 1, 10, 3, 11, 5, 9, 2, 0, 7],
   perCorrect: 2,
   bonus: 200,
   accept: ["binary search", "binarysearch", "binary", "binary search algorithm", "half interval search", "binary chop"],
   finalQ: "Put all the clues together. What is today’s topic?",
   finalOptions: ["Linear Search", "Binary Search", "Bubble Sort", "Counting Sort"],
   finalAnswer: 1,
   finalWhy: "Every clue was about jumping to the MIDDLE and throwing away half of a SORTED range. That is Binary Search."
  },
  questions: [
   {
    type: "guess", ctx: "Secret number", skill: "Apply", seconds: 75, lo: 1, hi: 100, max: 7,
    q: "I picked a secret number from 1 to 100. Guess it in 7 tries or fewer!",
    sub: "After each guess you only hear: higher or lower.",
    why: "The smart move is to guess the middle every time (50, then 25 or 75…). Each guess cuts the range in half, so 7 guesses are always enough."
   },
   {
    type: "mc", ctx: "First guess", skill: "Analyze",
    q: "New round, numbers 1 to 100. Which FIRST guess is the smartest?",
    options: ["1", "50", "99", "10"], answer: 1,
    why: "50 is the middle. Whatever the answer is (higher or lower), half of the numbers are gone in one guess."
   },
   {
    type: "mc", ctx: "Half is gone", skill: "Apply",
    q: "You guessed 50 and heard “Higher!”. How many numbers are still possible?",
    scene: "<span class=\"chip dim\">1 … 50</span><span class=\"arrow\">✗</span><span class=\"chip\" style=\"background:#10C6B4\">51 … 100</span>",
    options: ["49", "50", "51", "100"], answer: 1,
    why: "Only 51 to 100 are left: that is 50 numbers. One guess threw away half of the range."
   },
   {
    type: "order", ctx: "Shrinking range", skill: "Understand",
    q: "Each guess halves the range. Put the range sizes in order, from the start.",
    sub: "Tap the tiles in order.",
    tiles: ["13", "100", "7", "50", "25"],
    answer: ["100", "50", "25", "13", "7"],
    why: "100 → 50 → 25 → 13 → 7 → 4 → 2 → 1. Halving shrinks the range very quickly."
   },
   {
    type: "mc", ctx: "Dictionary", skill: "Apply",
    q: "You look up the word “python”. You open the dictionary in the middle and land on “M”. What next?",
    scene: "<span class=\"chip\" style=\"background:#FF5C8A\">A … L</span><span class=\"chip\" style=\"background:#7B5CFF\">M</span><span class=\"chip\" style=\"background:#2F80FF\">N … Z</span>",
    options: ["Go back to page 1", "Look only in the right half (after M)", "Look only in the left half (before M)", "Read every page"], answer: 1,
    why: "P comes after M, so the word can only be in the right half. You drop the whole left half at once."
   },
   {
    type: "mc", ctx: "The secret", skill: "Evaluate",
    q: "Why does jumping to the middle work in a dictionary, but NOT in a messy pile of papers?",
    options: ["Dictionaries are shorter", "The words are in order (sorted)", "Papers are heavier", "It works in both"], answer: 1,
    why: "Halving only works when the data is SORTED. In a messy pile, the item could be anywhere, so you cannot throw half away."
   },
   {
    type: "mc", ctx: "Worst case", skill: "Analyze",
    q: "Using the halving trick, what is the MOST number of guesses you ever need for 1 to 100?",
    options: ["7", "10", "50", "100"], answer: 0,
    why: "100 → 50 → 25 → 13 → 7 → 4 → 2 → 1: seven halvings. Checking one by one could take 100 guesses."
   }
  ],
  endHTML: "<div class=\"reveal\"><span class=\"pill\">Today's topic</span><div class=\"big\">Binary Search</div><p class=\"lede\">Compare the key with the MIDDLE item of a sorted list, then throw away half. Repeat.</p></div>\n<div class=\"recap\"><div><b>Sorted first</b>Only works on sorted data</div><div><b>Check the middle</b>Compare the key with list[mid]</div><div><b>Discard half</b>Go left or right, never back</div></div>"
 },

 wrapup: {
  badge: "Unit 4 · Week 9 · Session 2 · Wrap-up",
  name: "Split Showdown",
  titleHTML: "<span class=\"c1\">S</span><span class=\"c2\">p</span><span class=\"c3\">l</span><span class=\"c4\">i</span><span class=\"c5\">t</span><br><span class=\"c1\">S</span><span class=\"c2\">h</span><span class=\"c3\">o</span><span class=\"c4\">w</span><span class=\"c5\">d</span><span class=\"c1\">o</span><span class=\"c2\">w</span><span class=\"c3\">n</span>",
  intro: "Ten challenges: find the middle, run real searches with your finger, read the code. Prove you can split it and find it!",
  rules: [
   "Play on your own device (or with your breakout partner)",
   "Faster answers = more points",
   "3 right in a row = 🔥 streak bonus",
   "Tap the MIDDLE tile in search challenges",
   "Watch your name climb on the teacher’s screen"
  ],
  seconds: 60,
  points: 100,
  floaters: ["first", "last", "mid", "//2", "<=", "sorted", "+1", "-1"],
  topic: "Binary Search",
  exit: {
   q: "What must be true about the data? What is compared at each step? Which three variables track the search?",
   placeholder: "The data must be...",
   model: "The list must be SORTED. At each step the key is compared with the middle item, myList[mid]. The three variables are first, last and mid (mid = (first + last) // 2). If key < myList[mid] then last = mid - 1, otherwise first = mid + 1, until the key is found or first > last."
  },
  questions: [
   {
    type: "order", ctx: "The steps", skill: "Remember",
    q: "Put the Binary Search steps in order.",
    sub: "Tap the tiles in order.",
    tiles: ["Compare the key with myList[mid]", "Set first = 0 and last = N - 1", "Move first or last, then repeat", "Find mid = (first + last) // 2"],
    answer: ["Set first = 0 and last = N - 1", "Find mid = (first + last) // 2", "Compare the key with myList[mid]", "Move first or last, then repeat"],
    why: "Set the range, find the middle, compare, then drop half by moving first or last. Repeat while first <= last."
   },
   {
    type: "mc", ctx: "The rule", skill: "Understand",
    q: "What MUST be true about a list before you use Binary Search?",
    options: ["It has 10 items", "It is sorted", "It has no repeats", "It has only numbers"], answer: 1,
    why: "Binary Search throws away half of the list after one comparison. That is only safe when the list is sorted."
   },
   {
    type: "mid", ctx: "Find the middle", skill: "Apply",
    q: "first = 0, last = 9. Tap the item at <code>mid</code>.",
    sub: "mid = (first + last) // 2",
    list: NUMS, first: 0, last: 9, answer: 4,
    why: "mid = (0 + 9) // 2 = 4 (floor division drops the .5). myList[4] is 13."
   },
   {
    type: "hunt", ctx: "Run the search", skill: "Apply", seconds: 75,
    q: "Find <code>56</code>. Tap the MIDDLE tile at every step.",
    sub: "The game drops the half you don't need. No guessing!",
    list: NUMS, key: 56,
    why: "mid = 4 (13), 56 is bigger so first = 5. mid = 7 (47), bigger again so first = 8. mid = 8 (56): found in 3 repetitions."
   },
   {
    type: "line", ctx: "The middle", skill: "Analyze",
    q: "Tap the line that calculates the middle index.",
    code: BS_CODE, answer: 7,
    why: "mid=(first+last)//2 finds the middle index of the current range. // is floor division, so mid is always a whole number."
   },
   {
    type: "line", ctx: "Drop a half", skill: "Analyze",
    q: "The key is SMALLER than <code>myList[mid]</code>. Tap the line that throws away the RIGHT half.",
    code: BS_CODE, answer: 12,
    why: "last=mid-1 moves the end of the range to just before mid, so only the left half is searched next."
   },
   {
    type: "mc", ctx: "Count it", skill: "Apply",
    q: "What is printed?",
    show: [
     "myList=[4,9,15,22,30]",
     "key=30",
     "first=0",
     "last=len(myList)-1",
     "count=0",
     "found=False",
     "while first<=last and found==False:",
     "    count=count+1",
     "    mid=(first+last)//2",
     "    if myList[mid]==key:",
     "        found=True",
     "    elif key<myList[mid]:",
     "        last=mid-1",
     "    else:",
     "        first=mid+1",
     "print(found,count)"
    ],
    options: ["True 5", "True 3", "True 4", "False 3"], answer: 1,
    why: "mid = 2 (15) → first = 3. mid = 3 (22) → first = 4. mid = 4 (30) → found. 3 repetitions, so it prints True 3."
   },
   {
    type: "mc", ctx: "Not found", skill: "Analyze",
    q: "You search for <code>50</code> in <code>[2,3,5,8,13,21,32,47,56,62]</code>. Why does the loop finally stop?",
    options: ["first becomes greater than last", "mid becomes 0", "found becomes True", "last reaches 9"], answer: 0,
    why: "mid = 4 (13) → first = 5; mid = 7 (47) → first = 8; mid = 8 (56) → last = 7. Now first (8) > last (7): the range is empty, so 50 is not in the list."
   },
   {
    type: "hunt", ctx: "Strings too", skill: "Apply", seconds: 75,
    q: "Find <code>\"Omar\"</code> in the sorted names. Tap the MIDDLE tile at every step.",
    sub: "Names are compared in alphabetical order.",
    list: NAMES, key: "Omar",
    why: "mid = 3 (Lina): Omar comes after, first = 4. mid = 5 (Sara): Omar comes before, last = 4. mid = 4 (Omar): found in 3 repetitions."
   },
   {
    type: "mc", ctx: "Why so fast?", skill: "Evaluate",
    q: "A SORTED list has 1,000 items. About how many checks does Binary Search need at most?",
    options: ["10", "100", "500", "1,000"], answer: 0,
    why: "1000 → 500 → 250 → 125 → 63 → 32 → 16 → 8 → 4 → 2 → 1: about 10 halvings. Linear Search could need 1,000 checks."
   }
  ],
  endHTML: "<div class=\"recap\"><div><b>Sorted first</b>Binary Search needs a sorted list</div><div><b>Halve the range</b>Compare with mid, move first or last</div><div><b>Fast</b>Far fewer checks than Linear Search</div></div>"
 }
};
