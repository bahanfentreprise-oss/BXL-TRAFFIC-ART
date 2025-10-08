
// ---- Global variables ----
let url;
let traffic;
let circles = [];
let lastUpdate = 0;
let updateInterval = 300 * 1000; // refresh every 5 minutes

// Fade control for update transitions
let fadeProgress = 1; // 0 = invisible, 1 = visible
let fadingIn = true;
let fadingOut = false;

// ---- Load live data ----
function preload() {
  url = "https://data.mobility.brussels/traffic/api/counts/?request=live&singleValue=true";
  traffic = loadJSON(url);
}

// ---- Setup canvas ----
function setup() {
  createCanvas(400, 400);
  strokeCap(ROUND);
  noFill();
  processData(); // parse initial data
}

// ---- Main animation loop ----
function draw() {
  // 1️⃣ Dark background and soft transparent overlay
  background(0,75);
  
  // Slight transparency over center to fade trails naturally over time
  

  // 2️⃣ Handle global fade transitions
  handleFade();

  // 3️⃣ Draw trails before dots (they appear beneath)
  drawTrails();

  // 4️⃣ Animate and draw dots
  for (let c of circles) {
    // Orbit speed depends on traffic speed
    // Base: one full orbit per minute at speed=0, up to 3x faster at speed=100
    let speedFactor = map(c.speed, 0, 100, 1, 3);
    let baseSpeed = TWO_PI / (60 * 60); // base orbit = 1 rotation per minute
    c.angle += baseSpeed * speedFactor; // faster traffic -> faster orbit

    // Subtle Perlin noise wobble
    let wobble = map(noise(c.noiseSeed, frameCount * 0.002), 0, 1, -5, 5);
    let r = c.orbitRadius + wobble;

    // Compute position
    c.x = width / 2 + cos(c.angle) * r;
    c.y = height / 2 + sin(c.angle) * r;

    // Add to trail
    c.trail.push({ x: c.x, y: c.y, d: c.diameter });
    if (c.trail.length > 180) c.trail.shift();

    // Map data to visuals
    let pinkValue = map(c.speed, 0, 100, 80, 180);
    let d = map(c.count, 0, 100, 3, 25);

    // Fade alpha together for dots and trails
    let alpha = 255 * fadeProgress;

    // Draw the orbiting circle
    fill(pinkValue, 0, 153, alpha);
    noStroke();
    circle(c.x, c.y, d);

    c.diameter = d;
  }

  // 5️⃣ Smooth data refresh
  if (millis() - lastUpdate > updateInterval && !fadingOut) {
    fadingOut = true;
  }

  if (fadingOut && fadeProgress <= 0.01) {
    loadJSON(url, (newData) => {
      traffic = newData;
      processData();
      lastUpdate = millis();
      fadingOut = false;
      fadingIn = true;
      print("🔄 Data refreshed smoothly");
    });
  }


  
}

// ---- Fade-in / fade-out control ----
function handleFade() {
  if (fadingOut) fadeProgress -= 0.01; // fade out
  else if (fadingIn) fadeProgress += 0.01; // fade in

  fadeProgress = constrain(fadeProgress, 0, 1);
  if (fadeProgress >= 1 && fadingIn) fadingIn = false;
}

// ---- Draw fading trails ----
function drawTrails() {
  noFill();
  for (let c of circles) {
    beginShape();
    for (let i = 0; i < c.trail.length; i++) {
      // Trail fades along its length and overall with fadeProgress
      let tAlpha = map(i, 0, c.trail.length, 0, 180) * fadeProgress;
      let pinkValue = map(c.speed, 0, 100, 80, 180);

      // Trail width matches circle diameter
      
      strokeWeight(c.diameter);
      stroke(pinkValue, 0, 153, tAlpha);
      vertex(c.trail[i].x, c.trail[i].y);
    }
    endShape();
  }
}

// ---- Process data into orbiting circles ----
function processData() {
  circles = [];
  if (!traffic || !traffic.data) {
    print("⚠️ No usable data yet.");
    return;
  }

  let keys = Object.keys(traffic.data);
  for (let k of keys) {
    let detector = traffic.data[k];
    if (!detector.results) continue;

    let result =
      detector.results["5m"] ||
      null;
    if (!result) continue;

    let count = result.count || 0;
    let speed = result.speed || 0;
    let angle = random(TWO_PI);
    let orbitRadius = random(50, 180);
    let noiseSeed = random(1000);

    // Store diameter so trail width can match
    let d = map(count, 0, 100, 3, 25);

    circles.push({
      x: 0,
      y: 0,
      angle,
      orbitRadius,
      count,
      speed,
      noiseSeed,
      trail: [],
      diameter: d
    });
  }

  fadeProgress = 0; // begin new data invisible
  fadingIn = true;
  print("✓ Parsed " + circles.length + " detectors");
}
