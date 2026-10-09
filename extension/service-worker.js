chrome.runtime.onInstalled.addListener(() => chrome.storage.session.clear())
chrome.tabs.onActivated.addListener(() => chrome.storage.session.clear())
chrome.tabs.onUpdated.addListener((_tabId, change) => { if (change.url) chrome.storage.session.clear() })
