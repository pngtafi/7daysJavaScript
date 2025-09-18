let movieNameRef = document.getElementById('movie-name')
let movieYearRef = document.getElementById('movie-year')
let searchBtn = document.getElementById('search-btn')
let result = document.getElementById('result')

const TMDB_KEY = 'd60c537cbe6c28a64f65cbdcad8a3ff7'
const BASE = 'https://api.themoviedb.org/3'
const imgURL = (p) =>
  p
    ? `https://image.tmdb.org/t/p/w500${p}`
    : 'https://via.placeholder.com/300x450?text=No+Image'

const debounced = (fn, wait = 300) => {
  let t
  return (...a) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), wait)
  }
}

function toSlug(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD') // tách dấu
    .replace(/\p{Diacritic}/gu, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd') // đ -> d
    .replace(/[^a-z0-9]+/g, '-') // non-alnum -> -
    .replace(/^-+|-+$/g, '') // cắt - đầu/cuối
    .replace(/-{2,}/g, '-') // gộp ---
}

const norm = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const prefixMatch = (title, q) => {
  const t = norm(title),
    n = norm(q)
  if (!n) return false
  return t.split(' ').some((w) => w.startsWith(n))
}

function normalizeMovieData(d) {
  const title = d.title || d.name || '—'
  const dateStr = d.release_date || d.first_air_date || ''
  const year = dateStr ? dateStr.slice(0, 4) : ''
  return {
    id: d.id,
    title,
    year,
    rating:
      typeof d.vote_average === 'number' ? d.vote_average.toFixed(1) : '—',
    description: (d.overview || '').trim(),
    poster: imgURL(d.poster_path),
    popularity: d.popularity ?? 0,
  }
}

// Lấy runtime (phút), certification (rated) và genres
async function fetchExtra(movieId) {
  const url = `${BASE}/movie/${movieId}?api_key=${TMDB_KEY}&language=vi-VN&append_to_response=release_dates`
  const j = await fetch(url).then((r) => {
    if (!r.ok) throw new Error('detail error')
    return r.json()
  })

  const runtime = typeof j.runtime === 'number' ? `${j.runtime} min` : ''

  // genres là mảng object { id, name } -> lấy name
  const genres = Array.isArray(j.genres) ? j.genres.map((g) => g.name) : []

  // rated (PG-13...) trong release_dates; ưu tiên VN rồi US
  let rated = ''
  const lists = j.release_dates?.results || []
  const pick = (cc) =>
    lists
      .find((x) => x.iso_3166_1 === cc)
      ?.release_dates?.find((r) => r.certification)?.certification
  rated = pick('VN') || pick('US') || ''

  return { runtime, rated, genres }
}

// Lấy trailer YouTube từ TMDB và nhúng <iframe> vào #player
async function loadTrailer(movieId) {
  const urlVI = `${BASE}/movie/${movieId}/videos?api_key=${TMDB_KEY}&language=vi-VN`
  const urlEN = `${BASE}/movie/${movieId}/videos?api_key=${TMDB_KEY}&language=en-US`

  // gọi VI trước, không có thì fallback EN
  const vidsVI = await fetch(urlVI)
    .then((r) => (r.ok ? r.json() : { results: [] }))
    .catch(() => ({ results: [] }))
  let vids = vidsVI.results || []

  if (!vids.length) {
    const vidsEN = await fetch(urlEN)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
    vids = vidsEN.results || []
  }

  // Ưu tiên Trailer trên YouTube; nếu không có Trailer thì lấy bất kỳ video YouTube
  const yt =
    vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    vids.find((v) => v.site === 'YouTube')

  const player = document.getElementById('player')
  if (!player) return

  if (!yt) {
    player.textContent = 'Không có trailer khả dụng.'
    return
  }

  const src = `https://www.youtube.com/embed/${yt.key}`
  player.innerHTML = `
    <iframe
      width="100%"
      height="315"
      src="${src}"
      title="YouTube trailer"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  `
}

// Hỏi TMDB xem phim đang có trên nền tảng nào ở quốc gia X
async function whereToWatch(movieId, country = 'VN') {
  const url = `${BASE}/movie/${movieId}/watch/providers?api_key=${TMDB_KEY}`
  const j = await fetch(url).then((r) => r.json())
  const entry = j.results?.[country]
  return entry
    ? {
        link: entry.link || '', // trang tổng của TMDB trỏ sang nền tảng
        flatrate: entry.flatrate || [], // gói thuê bao
        rent: entry.rent || [], // thuê lẻ
        buy: entry.buy || [], // mua
      }
    : { link: '', flatrate: [], rent: [], buy: [] }
}

// 2) Render các nút/link dẫn sang nền tảng (logo từ TMDB)
function renderProviders(prov, mountId = 'providers') {
  const el = document.getElementById(mountId)
  if (!el) return

  const group = (title, arr) =>
    arr.length
      ? `
    <div class="wp-group">
      <h4>${title}</h4>
      <div class="wp-logos">
        ${arr
          .map(
            (p) => `
          <a class="wp-provider" href="${
            prov.link || '#'
          }" target="_blank" rel="noopener" title="${p.provider_name}">
            ${
              p.logo_path
                ? `<img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="${p.provider_name}">`
                : p.provider_name
            }
          </a>
        `
          )
          .join('')}
      </div>
    </div>`
      : ''

  el.innerHTML =
    prov.flatrate.length || prov.rent.length || prov.buy.length
      ? group('Thuê bao (flatrate)', prov.flatrate) +
        group('Thuê lẻ (rent)', prov.rent) +
        group('Mua (buy)', prov.buy)
      : `<div class="wp-empty">Chưa có nền tảng khả dụng cho quốc gia này.</div>`
}

function providerSearchLinks(title, year = '') {
  const q = encodeURIComponent(`${title} ${year}`.trim())
  return [
    {
      name: 'YouTube Movies',
      url: `https://www.youtube.com/results?search_query=${q}`,
    },
    {
      name: 'Motchill',
      url: `https://motchillr.fm/phim/${toSlug(title)}`,
    },
  ]
}

// render 1 phim
function renderMovie(m) {
  result.innerHTML = `
    <div class="info">
      <img src="${m.poster}" class="poster" alt="${m.title}">
      <div style="margin-left: 1.8em;">
        <h2>${m.title}</h2>
        <div class="rating">
          <img src="star-icon.svg" alt="" />
          <h4>${m.rating}</h4>
        </div>
         <div class="details">
          <span>${m.rated}</span>
          <span>${m.year}</span>
          <span>${m.runtime}</span>
        </div>
        <div class="genre">
          <div>${m.genres.join('</div><div>')}</div>
        </div>
        <div id="providers"></div>
      </div>
    </div>
    <h3>Overview:</h3>
    <p>${m.description || 'Chưa có mô tả.'}</p>
    <h3>Trailer</h3>
    <div id="player"></div>
  `
}

function renderProviderFallback(title, year) {
  const el = document.getElementById('providers')
  if (!el) return

  const links = providerSearchLinks(title, year)
  el.innerHTML = `
    <ul class="wp-fallback">
      ${links
        .map((l) => `<li><a href="${l.url}"  rel="noopener">${l.name}</a></li>`)
        .join('')}
    </ul>
  `
}

// gọi TMDB và render 1 phim duy nhất
let getMovie = debounced(async () => {
  const movieName = movieNameRef.value.trim()
  const yearInput = (movieYearRef?.value || '').trim()
  const year = /^\d{4}$/.test(yearInput) ? yearInput : '' // chỉ nhận 4 chữ số

  if (!movieName) {
    result.innerHTML = `<h3 class="msg">Please enter a movie name</h3>`
    return
  }

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    language: 'vi-VN',
    include_adult: 'false',
    query: movieName,
    page: '1',
  })
  if (year) params.append('year', year)

  try {
    const res = await fetch(`${BASE}/search/movie?${params.toString()}`)
    if (!res.ok) throw new Error('TMDB error')
    const data = await res.json()

    const results = data.results || []
    if (!results.length) {
      if (year) {
        params.delete('year')
        const res2 = await fetch(`${BASE}/search/movie?${params.toString()}`)
        const data2 = await res2.json()
        results = data2.results || []
      }

      result.innerHTML = `<h3 class="msg">Không tìm thấy phim phù hợp.</h3>`
      return
    }

    // Ưu tiên:
    // 1) tiêu đề có từ bắt đầu bằng query
    // 2) nếu có nhập năm -> đúng năm
    const dateOf = (d) => (d.release_date || d.first_air_date || '').slice(0, 4)
    const prefixMatches = results.filter((it) =>
      prefixMatch(it.title || it.name || '', movieName)
    )
    const yearFiltered = year
      ? (prefixMatches.length ? prefixMatches : results).filter(
          (it) => dateOf(it) === year
        )
      : []

    const pickRaw = yearFiltered.length
      ? [...yearFiltered].sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
        )[0]
      : prefixMatches.length
      ? [...prefixMatches].sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
        )[0]
      : results[0]

    let movie = normalizeMovieData(pickRaw)

    // lấy thêm runtime & rated để hiển thị ở .details
    try {
      const extra = await fetchExtra(movie.id)
      Object.assign(movie, extra)
    } catch (_) {}

    // 3) Fallback EN nếu mô tả VI rỗng
    if (!movie.description) {
      const det = await fetch(
        `${BASE}/movie/${movie.id}?api_key=${TMDB_KEY}&language=en-US`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
      if (det?.overview) movie.description = det.overview
    }

    // 4) Render duy nhất 1 phim
    renderMovie(movie)

    const COUNTRY = 'VN'
    whereToWatch(movie.id, COUNTRY)
      .then((prov) => {
        // Nếu TMDB có dữ liệu nền tảng → render logo/link
        if (prov.flatrate?.length || prov.rent?.length || prov.buy?.length) {
          renderProviders(prov)
        } else {
          // Không có dữ liệu → dùng fallback links
          renderProviderFallback(movie.title, movie.year)
        }
      })
      .catch(() => renderProviderFallback(movie.title, movie.year))

    loadTrailer(movie.id)
  } catch (e) {
    result.innerHTML = `<h3 class="msg">Xảy ra lỗi</h3>`
  }
}, 300)

// Sự kiện
searchBtn.addEventListener('click', getMovie)
movieNameRef.addEventListener('input', getMovie)
movieYearRef.addEventListener('input', getMovie)
window.addEventListener('load', getMovie)
