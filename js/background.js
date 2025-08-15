// Manifest V3 Service Worker for Redirector
// Most redirect functionality is now handled by declarativeNetRequest

function log(msg, force) {
  if (log.enabled || force) {
    console.log('REDIRECTOR V3: ' + msg);
  }
}
// Enable logging in development (unpacked) builds, disable in production (store) builds
log.enabled = !chrome.runtime.getManifest().key;

var enableNotifications = false;
var storageArea = chrome.storage.local; // Default to local storage

// Default to light mode
let isDarkModeEnabled = false;

// Listen for theme changes from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'theme-changed') {
    isDarkModeEnabled = message.isDarkMode;
    updateIcon();
  }
});

var isFirefox = false; // Service workers don't have navigator.userAgent directly

function setIcon(image) {
  var data = {
    path: {}
  };

  for (let nr of [16, 19, 32, 38, 48, 64, 128]) {
    data.path[nr] = `images/${image}-${nr}.png`;
  }

  chrome.action.setIcon(data, function () {
    var err = chrome.runtime.lastError;
    if (err) {
      log('Error in SetIcon: ' + err.message);
    }
  });
}

// Update icon based on disabled status
function updateIcon() {
  chrome.storage.local.get({ disabled: false }, function (obj) {
    // Set icon based on theme
    if (isDarkModeEnabled) {
      setIcon('icon-dark-theme');
    } else {
      setIcon('icon-light-theme');
    }

    // Set badge
    if (obj.disabled) {
      chrome.action.setBadgeText({ text: 'off' });
      chrome.action.setBadgeBackgroundColor({ color: '#fc5953' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// Convert V2 redirect to V3 declarativeNetRequest rule
function convertRedirectToV3Rule(redirect, ruleId) {
  log(`Converting redirect rule: "${redirect.description}"`);
  log(
    `  Pattern: ${redirect.includePattern} (${
      redirect.patternType === 'R' ? 'Regex' : 'Wildcard'
    })`
  );
  log(`  Target: ${redirect.redirectUrl}`);
  log(
    `  Applies to: ${
      redirect.appliesTo ? redirect.appliesTo.join(', ') : 'main_frame'
    }`
  );

  // Valid resourceTypes for Manifest V3
  const validResourceTypes = [
    'csp_report',
    'font',
    'image',
    'main_frame',
    'media',
    'object',
    'other',
    'ping',
    'script',
    'stylesheet',
    'sub_frame',
    'webbundle',
    'websocket',
    'webtransport',
    'xmlhttprequest'
  ];

  // Filter and map resourceTypes to valid V3 values
  let resourceTypes = redirect.appliesTo || ['main_frame'];
  const originalTypes = [...resourceTypes];

  resourceTypes = resourceTypes
    .map((type) => {
      // Map old V2 types to V3 equivalents
      if (type === 'imageset') {
        log(`    🔄 Mapping resourceType: ${type} → image`);
        return 'image';
      }
      if (type === 'object_subrequest') {
        log(`    🔄 Mapping resourceType: ${type} → object`);
        return 'object';
      }
      if (type === 'history') {
        log(
          `    ❌ Removing invalid resourceType: ${type} (not supported in V3)`
        );
        return null;
      }
      return type;
    })
    .filter((type) => type && validResourceTypes.includes(type));

  // Log any filtered types
  const filteredTypes = originalTypes.filter(
    (type) =>
      !resourceTypes.includes(type) &&
      type !== 'imageset' &&
      type !== 'object_subrequest' &&
      type !== 'history'
  );
  if (filteredTypes.length > 0) {
    log(`    ❌ Filtered invalid resourceTypes: ${filteredTypes.join(', ')}`);
  }

  // Ensure we always have at least one valid resourceType
  if (resourceTypes.length === 0) {
    log(`    ⚠️  No valid resourceTypes found, defaulting to main_frame`);
    resourceTypes = ['main_frame'];
  }

  log(`    → Final resourceTypes: ${resourceTypes.join(', ')}`);

  const rule = {
    id: ruleId,
    priority: 1,
    condition: {
      resourceTypes
    },
    action: {
      type: 'redirect'
    }
  };

  // Handle pattern conversion
  if (redirect.patternType === 'R') {
    // Regex pattern
    rule.condition.regexFilter = redirect.includePattern;
    rule.action.redirect = {
      regexSubstitution: redirect.redirectUrl.replace(/\$(\d+)/g, '\\$1')
    };
    log(
      `  → V3 Regex: ${rule.condition.regexFilter} → ${rule.action.redirect.regexSubstitution}`
    );
  } else {
    // Wildcard pattern - convert to urlFilter if simple, otherwise regex
    if (
      redirect.includePattern.includes('*') &&
      redirect.redirectUrl.includes('$')
    ) {
      // Complex wildcard with capture groups - convert to regex
      const regexPattern = redirect.includePattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\\*/g, '(.*?)'); // Convert * to capture groups

      rule.condition.regexFilter = '^' + regexPattern + '$';
      rule.action.redirect = {
        regexSubstitution: redirect.redirectUrl.replace(/\$(\d+)/g, '\\$1')
      };
      log(
        `  → V3 Wildcard→Regex: ${rule.condition.regexFilter} → ${rule.action.redirect.regexSubstitution}`
      );
    } else {
      // Simple pattern - use urlFilter
      rule.condition.urlFilter = redirect.includePattern;
      rule.action.redirect = {
        url: redirect.redirectUrl
      };
      log(
        `  → V3 Simple URL: ${rule.condition.urlFilter} → ${rule.action.redirect.url}`
      );
    }
  }

  if (redirect.excludePattern) {
    log(
      `  Note: Exclude pattern "${redirect.excludePattern}" not supported in V3`
    );
  }

  log(`  ✅ Created rule ID ${ruleId}`);
  return rule;
}

// Update declarativeNetRequest rules from storage
function updateDynamicRules() {
  log('🔄 Starting dynamic rules update...');

  storageArea.get({ redirects: [] }, function (obj) {
    const allRedirects = obj.redirects || [];
    const enabledRedirects = allRedirects.filter((r) => !r.disabled);
    const disabledRedirects = allRedirects.filter((r) => r.disabled);

    log(`📊 Redirect statistics:`);
    log(`  Total redirects in storage: ${allRedirects.length}`);
    log(`  Enabled redirects: ${enabledRedirects.length}`);
    log(`  Disabled redirects: ${disabledRedirects.length}`);

    if (disabledRedirects.length > 0) {
      log(`⏸️  Disabled redirects:`);
      disabledRedirects.forEach((r, i) => {
        log(`    ${i + 1}. "${r.description}" (${r.includePattern})`);
      });
    }

    if (enabledRedirects.length === 0) {
      log('⚠️  No active redirects found in storage');

      // Clear any existing dynamic rules
      chrome.declarativeNetRequest.getDynamicRules(function (existingRules) {
        if (existingRules.length > 0) {
          const existingRuleIds = existingRules.map((rule) => rule.id);
          log(`🗑️  Removing ${existingRules.length} existing dynamic rules`);

          chrome.declarativeNetRequest.updateDynamicRules(
            {
              removeRuleIds: existingRuleIds,
              addRules: []
            },
            function () {
              if (chrome.runtime.lastError) {
                log(
                  '❌ Error clearing dynamic rules: ' +
                    chrome.runtime.lastError.message
                );
              } else {
                log('✅ Successfully cleared all dynamic rules');
              }
            }
          );
        } else {
          log('✅ No existing dynamic rules to clear');
        }
      });
      return;
    }

    log(
      `🔧 Converting ${enabledRedirects.length} active redirects to V3 rules:`
    );

    // Convert V2 redirects to V3 rules
    const newRules = enabledRedirects.map(
      (redirect, index) => convertRedirectToV3Rule(redirect, index + 1000) // Start from 1000 to avoid conflicts
    );

    // Get existing dynamic rules to remove them
    chrome.declarativeNetRequest.getDynamicRules(function (existingRules) {
      const existingRuleIds = existingRules.map((rule) => rule.id);

      if (existingRules.length > 0) {
        log(`🗑️  Removing ${existingRules.length} existing dynamic rules`);
        existingRules.forEach((rule, i) => {
          log(`    Removing rule ID ${rule.id}`);
        });
      }

      log(`➕ Adding ${newRules.length} new dynamic rules`);

      // Update rules
      chrome.declarativeNetRequest.updateDynamicRules(
        {
          removeRuleIds: existingRuleIds,
          addRules: newRules
        },
        function () {
          if (chrome.runtime.lastError) {
            log(
              '❌ Error updating dynamic rules: ' +
                chrome.runtime.lastError.message
            );
          } else {
            log('✅ Successfully updated dynamic redirect rules!');
            log(`📋 Active redirect patterns:`);
            newRules.forEach((rule, i) => {
              const pattern =
                rule.condition.regexFilter || rule.condition.urlFilter;
              const target =
                rule.action.redirect.regexSubstitution ||
                rule.action.redirect.url;
              log(`  ${i + 1}. [ID ${rule.id}] ${pattern} → ${target}`);
            });
            log(
              '🎯 Redirects are now active and will intercept matching requests'
            );
          }
        }
      );
    });
  });
}

// Storage change monitoring
chrome.storage.onChanged.addListener(function (changes, namespace) {
  log(`📦 Storage changes detected in ${namespace}:`);

  if (changes.logging) {
    const oldValue = changes.logging.oldValue;
    const newValue = changes.logging.newValue;
    log.enabled = newValue;
    log(
      `🔍 Logging ${oldValue ? 'disabled' : 'enabled'} → ${
        newValue ? 'enabled' : 'disabled'
      }`
    );
  }

  if (changes.enableNotifications) {
    const oldValue = changes.enableNotifications.oldValue;
    const newValue = changes.enableNotifications.newValue;
    enableNotifications = newValue;
    log(
      `🔔 Notifications ${oldValue ? 'disabled' : 'enabled'} → ${
        newValue ? 'enabled' : 'disabled'
      }`
    );
  }

  if (changes.redirects) {
    const oldCount = changes.redirects.oldValue
      ? changes.redirects.oldValue.length
      : 0;
    const newCount = changes.redirects.newValue
      ? changes.redirects.newValue.length
      : 0;
    log(`🔄 Redirects changed: ${oldCount} → ${newCount} rules`);

    if (changes.redirects.newValue) {
      const newRedirects = changes.redirects.newValue;
      log(`📝 Updated redirect rules:`);
      newRedirects.forEach((redirect, i) => {
        const status = redirect.disabled ? '⏸️ [DISABLED]' : '✅ [ENABLED]';
        log(`  ${i + 1}. ${status} "${redirect.description}"`);
        log(`      ${redirect.includePattern} → ${redirect.redirectUrl}`);
      });
    }

    log('🔄 Triggering dynamic rules update...');
    updateDynamicRules();
  }

  if (changes.disabled) {
    const newValue = changes.disabled.newValue;
    log(`🔘 Extension ${newValue ? 'disabled' : 'enabled'}`);
    updateIcon();
  }
});

// Message handling
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == 'update-icon') {
    updateIcon();
    sendResponse({ success: true });
  } else if (request.type == 'get-status') {
    chrome.storage.local.get(
      {
        disabled: false,
        logging: false,
        enableNotifications: false
      },
      function (obj) {
        sendResponse(obj);
      }
    );
    return true; // Keep sendResponse alive
  } else if (request.type == 'get-redirects') {
    // Handle get-redirects message for the redirector page
    storageArea.get({ redirects: [] }, function (obj) {
      log('Got redirects from storage: ' + obj.redirects.length + ' rules');
      sendResponse(obj);
    });
    return true; // Keep sendResponse alive
  } else if (request.type == 'save-redirects') {
    // Handle save-redirects message from import/edit
    log('💾 Received save-redirects request');
    log(`📊 Redirects to save: ${request.redirects.length}`);

    // Log details of redirects being saved
    request.redirects.forEach((redirect, i) => {
      const status = redirect.disabled ? '⏸️ [DISABLED]' : '✅ [ENABLED]';
      log(`  ${i + 1}. ${status} "${redirect.description}"`);
      log(
        `      Pattern: ${redirect.includePattern} (${
          redirect.patternType === 'R' ? 'Regex' : 'Wildcard'
        })`
      );
      log(`      Target: ${redirect.redirectUrl}`);
      if (redirect.excludePattern) {
        log(`      Exclude: ${redirect.excludePattern}`);
      }
    });

    const redirectsToSave = { redirects: request.redirects };
    log(
      `💾 Saving to ${
        storageArea === chrome.storage.sync ? 'sync' : 'local'
      } storage...`
    );

    storageArea.set(redirectsToSave, function () {
      if (chrome.runtime.lastError) {
        if (
          chrome.runtime.lastError.message.indexOf(
            'QUOTA_BYTES_PER_ITEM quota exceeded'
          ) > -1
        ) {
          log('❌ Redirects failed to save - quota exceeded');
          sendResponse({
            message:
              "Redirects failed to save as size of redirects larger than what's allowed by Sync. Refer Help Page"
          });
        } else {
          log('❌ Error saving redirects: ' + chrome.runtime.lastError.message);
          sendResponse({
            message:
              'Error saving redirects: ' + chrome.runtime.lastError.message
          });
        }
      } else {
        log('✅ Successfully saved redirects to storage');
        sendResponse({
          message: 'Redirects saved'
        });
        // Update dynamic rules after saving
        log('🔄 Updating dynamic rules after save...');
        updateDynamicRules();
      }
    });
    return true; // Keep sendResponse alive
  } else if (request.type == 'toggle-sync') {
    // Handle sync toggle
    const newStorageArea = request.isSyncEnabled
      ? chrome.storage.sync
      : chrome.storage.local;

    chrome.storage.local.set(
      { isSyncEnabled: request.isSyncEnabled },
      function () {
        storageArea = newStorageArea;

        if (request.isSyncEnabled) {
          sendResponse({ message: 'sync-enabled' });
        } else {
          sendResponse({ message: 'sync-disabled' });
        }
      }
    );
    return true; // Keep sendResponse alive
  } else {
    log('Unexpected message: ' + JSON.stringify(request));
    sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// Initialize on startup
function initialize() {
  updateIcon();

  // Load settings and set storage area
  chrome.storage.local.get(
    {
      logging: false,
      enableNotifications: false,
      isSyncEnabled: false
    },
    function (obj) {
      log.enabled = obj.logging;
      enableNotifications = obj.enableNotifications;
      storageArea = obj.isSyncEnabled
        ? chrome.storage.sync
        : chrome.storage.local;

      log('Redirector V3 initialized', true);

      if (obj.logging) {
        log(
          '🔍 Logging is ENABLED - you will see detailed redirect information'
        );
        log('📝 To view logs: Open Chrome DevTools (F12) → Console tab');
        log(
          '💡 To disable logging: Click Redirector icon → Uncheck "Enable logging"'
        );
      } else {
        log(
          '🔍 Logging is DISABLED - enable it for detailed redirect information',
          true
        );
      }

      // Update dynamic rules from storage on startup
      updateDynamicRules();
    }
  );
}

// Service worker lifecycle events
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    log('Extension installed', true);
  } else if (details.reason === 'update') {
    log('Extension updated', true);
  }
  initialize();
});

// Keep-alive mechanism
const KEEP_ALIVE_INTERVAL = 25; // seconds

function keepAlive() {
  // Create an alarm that fires every KEEP_ALIVE_INTERVAL seconds
  chrome.alarms.create('keepAlive', {
    periodInMinutes: KEEP_ALIVE_INTERVAL / 60
  });

  // Listen for the alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
      // Perform a lightweight operation to keep the service worker alive
      log('Service worker keep-alive ping');
      updateIcon();
    }
  });

  // Also keep alive on any tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      updateIcon();
    }
  });
}

// Initialize immediately when service worker starts
initialize();
keepAlive();
