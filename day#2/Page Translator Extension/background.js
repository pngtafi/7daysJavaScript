chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Translator installed')
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'TRANSLATE_PAGE') {
    translateActiveTab(msg.language).then(sendResponse)
    return true
  }
})

async function translateActiveTab(tl = 'vi') {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id || !tab.url) {
    return { ok: false, error: 'No active tab/url' }
  }

  const blocked = /^(chrome|edge|about|chrome-extension|file):/i.test(tab.url)
  if (blocked) {
    console.warn('This URL type cannot be translated:', tab.url)
    return { ok: false, error: 'Blocked URL scheme' }
  }

  const translateUrl = `https://translate.google.com/translate?sl=auto&tl=${encodeURIComponent(
    tl
  )}&u=${encodeURIComponent(tab.url)}`

  await chrome.tabs.update(tab.id, { url: translateUrl })

  return { ok: true }
}
