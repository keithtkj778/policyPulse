// FingerprintJS BotD loader
// Initialize an agent at application startup, once per page/app.
const botdPromise = import('https://openfpcdn.io/botd/v1').then((Botd) => Botd.load());

// ===== FINGERPRINTJS BOTD + BEHAVIORAL GATES =====

// Bot detection state
let botDetected = false;
let honeypotInteractions = 0;
let humanBehaviorValidated = false;
let eventsBlocked = false;
let sessionStartTime = Date.now();
let tabVisible = false;
let hasScrolled = false;
let hasPointerMoved = false;
let motionEntropy = [];

// FingerprintJS BotD state
let botdResult = null;
let botdClassification = null;

// Disposable email domains list
const disposableEmailDomains = [
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.org',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'yopmail.com', 'sharklasers.com', 'guerrillamail.biz', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com',
  'mailnesia.com', 'mailnull.com', 'spamgourmet.com', 'spamhole.com',
  'spammotel.com', 'spamobox.com', 'spamspot.com', 'spamthis.co.uk',
  'spamthisplease.com', 'spamtrail.com', 'spamtroll.net', 'spamwc.cf',
  'spamwc.ga', 'spamwc.gq', 'spamwc.ml', 'spamwc.tk', 'spamwc.xyz',
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
  'trashmailer.com', 'trashymail.com', 'trashymail.net', 'trashymail.org',
  'trbvm.com', 'trbvm.net', 'trbvm.org', 'trbvm.ws', 'trbvm.xyz',
  'trbvm.gq', 'trbvm.ga', 'trbvm.ml', 'trbvm.tk', 'trbvm.cf'
];

// leave it here can be used in future
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableEmailDomains.includes(domain)) return false;
  const localPart = email.split('@')[0];
  if (domain === 'gmail.com' && (localPart.length < 6 || localPart.length > 64)) return false;
  return true;
}

// Motion entropy calculation - less strict
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

// Initialize FingerprintJS BotD (Open Source)
async function initializeBotD() {
  try {
    const botd = await botdPromise;
    botdResult = await botd.detect();
    botdClassification = botdResult.bot;
    
    console.log(`🤖 [bot-detection] FingerprintJS BotD result:`, {
      classification: botdClassification,
      confidence: botdResult?.confidence || 'unknown',
      details: botdResult || 'no details'
    });
    
    if (botdClassification === 'bad' || botdClassification === 'suspect') {
      botDetected = true;
      eventsBlocked = true;
      console.error(`🚨 [bot-detection] BOT DETECTED: FingerprintJS BotD flagged as "${botdClassification}"`, {
        reason: 'FingerprintJS BotD detection',
        classification: botdClassification,
        confidence: botdResult?.confidence || 'unknown',
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        action: 'All events blocked, CTAs hidden'
      });
    } else {
      console.log(`✅ [bot-detection] FingerprintJS BotD: Human-like (${botdClassification})`);
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
  
  if (failures.length > 0) {
    console.warn(`⚠️  [bot-detection] Human behavior validation FAILED:`, {
      failures: failures,
      behavior: {
        time_spent: `${timeSpent.toFixed(2)}s`,
        tab_visible: tabVisible,
        has_scrolled: hasScrolled,
        has_pointer_moved: hasPointerMoved,
        motion_samples: motionEntropy.length
      },
      timestamp: new Date().toISOString()
    });
    return false;
  }
  
  console.log(`✅ [bot-detection] Human behavior validated:`, {
    time_spent: `${timeSpent.toFixed(2)}s`,
    tab_visible: tabVisible,
    has_scrolled: hasScrolled,
    has_pointer_moved: hasPointerMoved,
    motion_samples: motionEntropy.length
  });
  return true;
}

// Block all events silently
function blockBotSession(reason = 'Unknown') {
  botDetected = true;
  eventsBlocked = true;
  
  console.error(`🚨 [bot-detection] BOT SESSION BLOCKED: ${reason}`, {
    reason: reason,
    honeypot_interactions: honeypotInteractions,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    action: 'All events blocked, CTAs hidden'
  });
  
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
        element.addEventListener(eventType, (e) => {
          honeypotInteractions++;
          const fieldInfo = {
            selector: selector,
            field_id: element.id || 'no-id',
            field_name: element.name || 'no-name',
            field_type: element.type || 'no-type',
            event_type: eventType,
            interaction_count: honeypotInteractions
          };
          
          console.error(`🚨 [bot-detection] HONEYPOT TRIGGERED:`, {
            reason: 'Honeypot field interaction detected',
            details: fieldInfo,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            action: 'Bot session blocked'
          });
          
          botDetected = true;
          blockBotSession(`Honeypot field "${fieldInfo.field_id || fieldInfo.field_name}" interacted with via ${eventType}`);
        });
      });
    });
  });
  
  console.log(`✅ [bot-detection] Honeypot monitoring active: ${formSelectors.length} selectors monitored`);
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

// Reset bot detection state for fresh page load
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
    console.log(`✅ [bot-detection] State reset for fresh page load`, {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent?.substring(0, 50) || 'unknown'
    });
}

// Expose API if needed
window.initializeBotD = initializeBotD;
window.validateHumanBehavior = validateHumanBehavior;
window.blockBotSession = blockBotSession;
window.setupHoneypotMonitoring = setupHoneypotMonitoring;
window.setupTabVisibilityMonitoring = setupTabVisibilityMonitoring;
window.setupMotionTracking = setupMotionTracking;
window.resetBotDetectionState = resetBotDetectionState;


