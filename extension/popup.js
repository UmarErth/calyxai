const state = document.querySelector('.state')
document.querySelector('#share').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ title: document.title, url: location.href, text: document.body.innerText.slice(0, 20_000) }) })
  await chrome.storage.session.set({ pageContext: result, sharedAt: Date.now() })
  state.innerHTML = '<span style="background:#718a6c"></span>Page shared for this session'
})
document.querySelector('#open').addEventListener('click', () => chrome.tabs.create({ url: 'http://localhost:5173' }))
