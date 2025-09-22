document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('language')
  const btn = document.getElementById('translate')

  languages.forEach(({ code, name }) => {
    const opt = document.createElement('option')
    opt.value = code
    opt.textContent = `${name}`
    langSelect.appendChild(opt)
  })

  btn.addEventListener('click', () => {
    const language = langSelect.value || 'vi'

    chrome.runtime.sendMessage({ type: 'TRANSLATE_PAGE', language })
  })
})
