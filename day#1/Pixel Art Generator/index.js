let container = document.querySelector('.container')
let gridButton = document.getElementById('submit-grid')
let clearGridButton = document.getElementById('clear-grid')
let gridWidth = document.getElementById('width-range')
let gridHeight = document.getElementById('height-range')
let colorButton = document.getElementById('color-input')
let eraseBtn = document.getElementById('erase-btn')
let paintBtn = document.getElementById('paint-btn')
let widthValue = document.getElementById('width-value')
let heightValue = document.getElementById('height-value')

let events = {
  mouse: {
    down: 'mousedown',
    up: 'mouseup',
    move: 'mousemove',
  },
  touch: {
    down: 'touchstart',
    up: 'touchend',
    move: 'touchmove',
  },
}

let deviceType = ''

let draw = false
let erase = false

const isTouchDevice = () => {
  try {
    document.createEvent('TouchEvent')
    deviceType = 'touch'
    return true
  } catch (e) {
    deviceType = 'mouse'
    return false
  }
}

isTouchDevice()

gridButton.addEventListener('click', () => {
  container.innerHTML = ''
  let count = 0
  for (let i = 0; i < gridHeight.value; i++) {
    count += 2
    let div = document.createElement('div')
    div.classList.add('gridRow')

    for (let j = 0; j < gridWidth.value; j++) {
      count += 2
      let col = document.createElement('div')
      col.classList.add('gridCol')
      col.setAttribute('id', `gridCol${count}`)
      col.addEventListener(events[deviceType].down, (e) => {
        draw = true
        if (erase) {
          e.target.style.backgroundColor = 'transparent'
        } else {
          e.target.style.backgroundColor = colorButton.value
        }
      })
      col.addEventListener(events[deviceType].move, (e) => {
        let elementId = document.elementFromPoint(
          !isTouchDevice() ? e.clientX : e.touches[0].clientX,
          !isTouchDevice() ? e.clientY : e.touches[0].clientY
        ).id
        checker(elementId)
      })
      col.addEventListener(events[deviceType].up, () => {
        draw = false
      })

      div.appendChild(col)
    }
    container.appendChild(div)
  }
})

function checker(elementId) {
  let gridCols = document.querySelectorAll('.gridCol')
  gridCols.forEach((col) => {
    if (col.id === elementId && draw) {
      if (erase) {
        col.style.backgroundColor = 'transparent'
      } else {
        col.style.backgroundColor = colorButton.value
      }
    }
  })
}

clearGridButton.addEventListener('click', () => {
  container.innerHTML = ''
})

eraseBtn.addEventListener('click', () => {
  erase = true
})

paintBtn.addEventListener('click', () => {
  erase = false
})

gridWidth.addEventListener('input', () => {
  widthValue.innerHTML =
    gridWidth.value < 9 ? `0${gridWidth.value}` : gridWidth.value
})

gridHeight.addEventListener('input', () => {
  heightValue.innerHTML =
    gridHeight.value < 9 ? `0${gridHeight.value}` : gridHeight.value
})

window.onload = () => {
  gridWidth.value = 0
  gridHeight.value = 0
}
