const RAPIDAPI_KEY = 'cb54eadfe0msh770031f495d1569p19f2cejsn069f6d16e1af'
const RAPIDAPI_HOST = 'chatgpt-42.p.rapidapi.com'
const MODEL = 'gpt-4o-mini-2024-07-18'
const ENDPOINT_URL = `https://${RAPIDAPI_HOST}/chat`

const chatLog = document.getElementById('chat-log')
const userInput = document.getElementById('user-input')
const sendBtn = document.getElementById('sendBtn')
const sendIcon = document.getElementById('send-icon')

let isLoading = false

sendBtn.addEventListener('click', sendMessage)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

function sendMessage() {
  if (isLoading) return

  // lấy nội dung; giữ xuống dòng; bỏ khoảng trắng đầu/cuối
  const message = userInput.value.replace(/\r\n/g, '\n').trim()
  if (!message) return

  // hiển thị tin của user trước
  appendMessage('user', message)

  // reset ô nhập
  userInput.value = ''

  // (tuỳ chọn) nhánh demo
  if (message === 'developer') {
    setTimeout(
      () => appendMessage('bot', 'This is a response from the bot.'),
      600
    )
    return
  }

  // gọi API thật
  askBot(message)
}

async function askBot(message) {
  // đổi icon -> spinner
  setLoading(true)

  // payload
  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: '' },
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    max_tokens: 256,
  }

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      // có lỗi HTTP (403, 429, …) -> in thông báo
      appendMessage(
        'bot',
        `Lỗi ${res.status}: ${data.message || 'request thất bại'}`
      )
      return
    }

    // lấy nội dung trả lời theo chuẩn OpenAI
    const text = data?.choices?.[0]?.message?.content || '(không có nội dung)'
    appendMessage('bot', text)
  } catch (err) {
    appendMessage('bot', 'Lỗi mạng hoặc máy chủ. Thử lại nhé.')
    console.error(err)
  } finally {
    setLoading(false) // trả icon về giấy máy bay
  }
}

function setLoading(on) {
  isLoading = on
  sendBtn.disabled = on
  sendIcon.classList.toggle('fa-paper-plane', !on)
  sendIcon.classList.toggle('fa-spinner', on)
  sendIcon.classList.toggle('fa-pulse', on)
}

function appendMessage(sender, text) {
  const row = document.createElement('div') // .chat-box
  const icon = document.createElement('div') // .icon
  const msg = document.createElement('div') // .user | .bot
  const iTag = document.createElement('i')

  row.className = 'chat-box'
  icon.className = 'icon'
  msg.className = sender
  msg.textContent = text // dùng textContent để an toàn XSS

  // fallback cho CSS (nếu trình duyệt không hỗ trợ :has)
  row.classList.add(sender === 'user' ? 'row-user' : 'row-bot')

  // icon
  iTag.classList.add('fas', sender === 'user' ? 'fa-user' : 'fa-robot')
  icon.appendChild(iTag)

  // ráp vào DOM
  row.append(icon, msg)
  chatLog.appendChild(row)

  // cuộn xuống cuối
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' })
}
