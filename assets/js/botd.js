const botdPromise = import('https://openfpcdn.io/botd/v1').then((Botd) => Botd.load());

let botDetected = false;
let honeypotInteractions = 0;
let humanBehaviorValidated = false;
let eventsBlocked = false;
let sessionStartTime = Date.now();
let tabVisible = false;
let hasScrolled = false;
let hasPointerMoved = false;
let motionEntropy = [];
let botdResult = null;
let botdClassification = null;

function calculateMotionEntropy(movements) {
  if (movements.length < 2) return 0;
  let totalDistance = 0;
  let directionChanges = 0;
  let lastDirection = null;
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1];
    const curr = movements[i];
    const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
    totalDistance += distance;
    const direction = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    if (lastDirection !== null) {
      const angleDiff = Math.abs(direction - lastDirection);
      if (angleDiff > Math.PI / 6) {
        directionChanges++;
      }
    }
    lastDirection = direction;
  }
  return directionChanges / Math.max(totalDistance, 1);
}

async function initializeBotD() {
  try {
    const botd = await botdPromise;
    botdResult = await botd.detect();
    botdClassification = botdResult.bot;
    if (botdClassification === 'bad' || botdClassification === 'suspect') {
      botDetected = true;
      eventsBlocked = true;
    }
  } catch (error) {
    console.error('🚨 [bot-detection] BotD initialization failed:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Check if behavior indicates human (lightweight behavioral gates)
function validateHumanBehavior() {
  const timeSpent = (Date.now() - sessionStartTime) / 1000;
  const failures = [];
  
  // Check each behavioral gate
  if (timeSpent < 2) {
    failures.push(`Time spent too short: ${timeSpent.toFixed(2)}s (required: 2s+)`);
  }
  if (!tabVisible) {
    failures.push('Tab not visible (page hidden/background)');
  }
  if (!hasScrolled && !hasPointerMoved && timeSpent < 5) {
    failures.push(`No interaction: no scroll, no pointer movement, only ${timeSpent.toFixed(2)}s on page (required: 5s+ if no interaction)`);
  }
  if (hasPointerMoved && motionEntropy.length > 3) {
    const entropy = calculateMotionEntropy(motionEntropy);
    if (entropy < 0.01) {
      failures.push(`Low motion entropy: ${entropy.toFixed(6)} (required: 0.01+) - motion too mechanical/patterned`);
    }
  }
  
  if (failures.length > 0) return false;
  return true;
}

function blockBotSession(reason) {
  botDetected = true;
  eventsBlocked = true;
  document.querySelectorAll('.cta-primary').forEach(cta => {
    cta.style.display = 'none';
    cta.onclick = null;
  });
}

// Enhanced form field monitoring
function setupHoneypotMonitoring() {
  const formSelectors = [
    '.form-field input',
    '.form-field-alt input',
    '.form-field-overflow input',
    '.form-btn'
  ];
  formSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      ['focus', 'input', 'change', 'click', 'mousedown', 'mouseup'].forEach(eventType => {
        element.addEventListener(eventType, () => {
          honeypotInteractions++;
          botDetected = true;
          blockBotSession('Honeypot interaction');
        });
      });
    });
  });
}

// Tab visibility monitoring
function setupTabVisibilityMonitoring() {
  const handleVisibilityChange = () => {
    if (!document.hidden) tabVisible = true;
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (!document.hidden) tabVisible = true;
}

// Motion tracking for entropy calculation
function setupMotionTracking() {
  document.addEventListener('mousemove', (e) => {
    hasPointerMoved = true;
    const currentPos = { x: e.clientX, y: e.clientY };
    motionEntropy.push(currentPos);
    if (motionEntropy.length > 20) motionEntropy.shift();
    if (!humanBehaviorValidated && !eventsBlocked) {
      if (typeof fireEventToPixelAndServer === 'function') {
        fireEventToPixelAndServer('PageView');
      }
    }
  });
  document.addEventListener('touchmove', (e) => {
    hasPointerMoved = true;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      motionEntropy.push(currentPos);
      if (motionEntropy.length > 20) motionEntropy.shift();
    }
  });
}

function resetBotDetectionState() {
  botDetected = false;
  honeypotInteractions = 0;
  humanBehaviorValidated = false;
  eventsBlocked = false;
  sessionStartTime = Date.now();
  tabVisible = false;
  hasScrolled = false;
  hasPointerMoved = false;
  motionEntropy = [];
  botdResult = null;
  botdClassification = null;
}

window.initializeBotD = initializeBotD;
window.validateHumanBehavior = validateHumanBehavior;
window.blockBotSession = blockBotSession;
window.setupHoneypotMonitoring = setupHoneypotMonitoring;
window.setupTabVisibilityMonitoring = setupTabVisibilityMonitoring;
window.setupMotionTracking = setupMotionTracking;
window.resetBotDetectionState = resetBotDetectionState;

