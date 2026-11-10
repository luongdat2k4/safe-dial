// Kiểm tra tên icon lucide dùng trong src/ có tồn tại trong bộ icon đóng gói không.
// Icon sai tên render trống mà không báo lỗi, nên chạy: npm run check:icons
// Chỉ bắt các dạng tường minh: icon: 'x' | icon="x" | name="x" | icon: cond ? 'x' : 'y'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const lucide = JSON.parse(readFileSync('node_modules/@iconify-json/lucide/icons.json', 'utf8'))
const known = new Set([...Object.keys(lucide.icons), ...Object.keys(lucide.aliases ?? {})])

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(f)) out.push(p)
  }
  return out
}

const KEY = /(?:\b(?:icon|iconName|leadingIcon)\s*[:=]\s*|\bname=|\bicon=)/
let bad = 0
for (const file of walk('src')) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = line.match(KEY)
      if (!m) return
      const rest = line.slice(m.index)
      for (const s of rest.matchAll(/['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)['"]/g)) {
        const name = s[1]
        if (known.has(name) || name.includes(' ')) continue
        // Bỏ qua class Tailwind và giá trị kích thước nằm cùng dòng
        if (/^(bg|text|border|size|w|h|px|py|p|m|rounded|shadow|sm|md|lg|xl)(-|$)/.test(name)) continue
        // Bỏ qua giá trị không phải icon (ví dụ name="primary", từ khoá cấu hình)
        if (!/-/.test(name) && !/(icon)/i.test(rest.slice(0, s.index))) continue
        console.log(`${file}:${i + 1}  icon không tồn tại? "${name}"`)
        bad++
      }
    })
}
console.log(bad ? `\n${bad} cảnh báo (kiểm tra thủ công, có thể là dương tính giả).` : 'OK: không thấy tên icon lạ.')
