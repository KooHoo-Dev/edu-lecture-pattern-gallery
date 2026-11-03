import { galleryVite } from '@koohoo/gallery-kit/vite'
import { defineConfig } from 'vite'

// 결과물은 dist/index.html 한 개. 설정은 kit 이 같이 쓰는 것 (단일 HTML, 격리 빌드 GALLERY_ONLY=<id>)
export default defineConfig(galleryVite())
