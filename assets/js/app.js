/**
 * Policy Pulse – main application script.
 * Loads public config (pixel ID, fallback URL), initializes Meta Pixel, then runs app logic.
 */
(function () {
    'use strict';

    window.APP_CONFIG = { pixelId: '', offerFallbackUrl: '' };

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.async = true;
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function initPixel(pixelId) {
        if (!pixelId || typeof pixelId !== 'string') return Promise.resolve();
        return loadScript('https://connect.facebook.net/en_US/fbevents.js').then(function () {
            if (window.fbq) {
                window.fbq('init', pixelId);
            }
        });
    }

    function boot() {
        var configUrl = '/.netlify/functions/config-public';
        fetch(configUrl)
            .then(function (r) { return r.json(); })
            .then(function (c) {
                window.APP_CONFIG = c || window.APP_CONFIG;
                return initPixel(c && c.pixelId);
            })
            .catch(function () {})
            .then(function () { runApp(); });
    }

    function runApp() {
        var angles = {
            one_bill_away: {
                headline: "One Unexpected Bill Away from Losing Everything Built – Smart Families Act First",
                subheadline: "Medical bills are a leading cause of personal bankruptcies. Many families now secure their finances before an accident strikes – 60‑second coverage check, no obligation.",
                cta: "🔍 Am I Protected From Financial Ruin?",
                bottomCta: "🛡️ Take Control Now"
            },
            family_shield: {
                headline: "Smart Parents Shield Their Savings – Before the $50K ER Bill Arrives",
                subheadline: "No parent should have to choose between a child's health and family savings. Thousands of families this year have locked in affordable coverage. Get instant access to plans that help parents protect both children and household finances.",
                cta: "Is My Family's Future Secure?",
                bottomCta: "Shield My Family Now"
            },
            freelancer_safety: {
                headline: "Independent & Thriving – One Slip Could Cost Months of Income",
                subheadline: "Successful freelancers and 1099 pros don't leave it to chance. One accident could shut down months of income – successful independents lock in protection before disaster strikes.",
                cta: "Can I Afford to Get Sick?",
                bottomCta: "Secure My Independence"
            }
        };

        var urlParams = new URLSearchParams(window.location.search);
        var primaryAngle = urlParams.get('angle') || urlParams.get('utm_term') || 'one_bill_away';
        var timeOnPage = Date.now();
        var initialScrollY = 0;

        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
        }

        function revealContent() {
            document.querySelectorAll('.dynamic-content').forEach(function (el, index) {
                setTimeout(function () { el.classList.add('visible'); }, index * 200);
            });
        }

        async function fireEventToPixelAndServer(eventName, eventData) {
            eventData = eventData || {};
            if (window.botDetected || window.eventsBlocked) return false;
            if (eventName === 'PageView' && !window.humanBehaviorValidated) {
                if (typeof window.validateHumanBehavior !== 'function' || !window.validateHumanBehavior()) return false;
                window.humanBehaviorValidated = true;
            }

            var serverData = {};
            try {
                var r = await fetch('/.netlify/functions/get-ip');
                if (r.ok) serverData = await r.json();
            } catch (e) {}

            var fbp = '';
            var fbc = '';
            var clientIpFromParamBuilder = '';
            if (typeof clientParamBuilder !== 'undefined' && clientParamBuilder.getFbp && clientParamBuilder.getFbc) {
                fbp = clientParamBuilder.getFbp() || '';
                fbc = clientParamBuilder.getFbc() || '';
                clientIpFromParamBuilder = clientParamBuilder.getClientIpAddress() || '';
            }
            if (!fbp && window.paramBuilderFbp) fbp = window.paramBuilderFbp;
            else if (!fbp) fbp = getCookie('_fbp') || '';
            if (!fbc && window.paramBuilderFbc) fbc = window.paramBuilderFbc;
            else if (!fbc) fbc = getCookie('_fbc') || '';
            var clientIp = clientIpFromParamBuilder || window.paramBuilderClientIp || (serverData && serverData.ip) || 'unknown';

            var cleanEventData = {
                primary_angle: primaryAngle,
                client_user_agent: navigator.userAgent,
                client_ip_address: clientIp,
                page_url: window.location.href,
                referrer: document.referrer,
                _fbp: fbp,
                _fbc: fbc
            };
            for (var k in eventData) if (eventData.hasOwnProperty(k)) cleanEventData[k] = eventData[k];

            var eventId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));

            if (typeof fbq !== 'undefined') {
                if (eventName === 'PageView') {
                    fbq('track', 'PageView', cleanEventData, { eventID: eventId });
                } else {
                    fbq('trackCustom', eventName, cleanEventData, { eventID: eventId });
                }
            }

            fetch('/.netlify/functions/facebook-capi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify(Object.assign({
                    event_name: eventName,
                    _fbp: fbp,
                    fbc: fbc,
                    event_id: eventId
                }, cleanEventData))
            }).then(function (response) {
                if (!response.ok) return response.text().then(function (t) { throw new Error(t); });
                return response.json();
            }).then(function (data) {
                if (data && data.recommended_cookies && data.recommended_cookies.length) {
                    var domain = document.location.hostname ? ('.' + document.location.hostname) : '';
                    data.recommended_cookies.forEach(function (cookie) {
                        document.cookie = (cookie.name + '=' + (cookie.value || '') + '; max-age=' + (cookie.maxAge || 0) + '; path=/; domain=' + (cookie.domain || domain) + '; SameSite=Lax');
                    });
                }
            }).catch(function () {});

            return true;
        }

        if (angles[primaryAngle] && primaryAngle !== 'one_bill_away') {
            setTimeout(function () {
                var a = angles[primaryAngle];
                var h = document.getElementById('main-headline');
                var s = document.querySelector('.subheadline');
                var c1 = document.querySelector('.cta-primary');
                var c2 = document.getElementById('bottom-cta');
                if (h) h.textContent = a.headline;
                if (s) s.textContent = a.subheadline;
                if (c1) c1.textContent = a.cta;
                if (c2) c2.textContent = a.bottomCta;
            }, 800);
        }

        (async function initClientParamBuilder() {
            try {
                if (typeof clientParamBuilder === 'undefined') {
                    setTimeout(initClientParamBuilder, 100);
                    return;
                }
                var getIpFn = async function () {
                    var fetchWithTimeout = function (url, timeout) {
                        timeout = timeout || 3000;
                        return Promise.race([
                            fetch(url),
                            new Promise(function (_, rej) { setTimeout(function () { rej(new Error('Timeout')); }, timeout); })
                        ]);
                    };
                    try {
                        var r6 = await fetchWithTimeout('https://api64.ipify.org?format=text', 3000);
                        if (r6.ok) {
                            var ip6 = await r6.text();
                            if (ip6.indexOf(':') !== -1) return ip6;
                        }
                    } catch (e) {}
                    try {
                        var r4 = await fetchWithTimeout('https://api.ipify.org?format=text', 3000);
                        if (r4.ok) return await r4.text();
                    } catch (e) {}
                    return null;
                };
                await clientParamBuilder.processAndCollectAllParams(window.location.href, getIpFn);
                window.paramBuilderFbp = clientParamBuilder.getFbp() || '';
                window.paramBuilderFbc = clientParamBuilder.getFbc() || '';
                window.paramBuilderClientIp = clientParamBuilder.getClientIpAddress() || '';
            } catch (e) {}
        })();

        function trackCTAClick(ctaType) {
            fireEventToPixelAndServer('CTAClicked', {
                page_duration: Math.round((Date.now() - timeOnPage) / 1000),
                conversion_trigger: ctaType || 'direct_cta'
            });
        }

        async function handleCTAClick(event) {
            if (event) event.preventDefault();
            trackCTAClick('direct_cta');

            var fbp = getCookie('_fbp') || ('fb.1.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9));
            var fbc = getCookie('_fbc') || ('fb.1.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9));
            var serverData = {};
            try {
                var r = await fetch('/.netlify/functions/get-ip');
                if (r.ok) serverData = await r.json();
            } catch (e) {}

            var trackingData = {
                angle: primaryAngle,
                fbp: fbp,
                fbc: fbc,
                user_ip: (serverData && serverData.ip) || 'unknown',
                user_agent: navigator.userAgent
            };

            try {
                var res = await fetch('/.netlify/functions/go-firstquote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(trackingData)
                });
                if (res.ok) {
                    var result = await res.json();
                    if (result.redirectUrl) {
                        window.location.href = result.redirectUrl;
                        return;
                    }
                }
            } catch (e) {}

            var fallback = (window.APP_CONFIG && window.APP_CONFIG.offerFallbackUrl) || '/';
            if (fallback) window.location.href = fallback;
        }

        window.handleCTAClick = handleCTAClick;
        window.fireEventToPixelAndServer = fireEventToPixelAndServer;

        function init() {
            if (typeof window.resetBotDetectionState === 'function') window.resetBotDetectionState();
            initialScrollY = window.scrollY;
            if (typeof window.initializeBotD === 'function') window.initializeBotD().catch(function () {});
            if (typeof window.setupHoneypotMonitoring === 'function') window.setupHoneypotMonitoring();
            if (typeof window.setupTabVisibilityMonitoring === 'function') window.setupTabVisibilityMonitoring();
            if (typeof window.setupMotionTracking === 'function') window.setupMotionTracking();
            setTimeout(function () { fireEventToPixelAndServer('PageView'); }, 2000);
            setTimeout(revealContent, 600);
        }

        window.addEventListener('scroll', function () {
            if (Math.abs(window.scrollY - initialScrollY) > 10) {
                window.hasScrolled = true;
                if (!window.humanBehaviorValidated && !window.eventsBlocked && typeof fireEventToPixelAndServer === 'function') {
                    fireEventToPixelAndServer('PageView');
                }
            }
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    boot();
})();
