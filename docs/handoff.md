# 인수인계 (2026-11-03)

새 세션은 이 문서, `docs/plan.md`, `docs/specimen-guide.md` 순서로 읽는다. 공통 틀은 `node_modules/@koohoo/gallery-kit/docs/` (kit-guide, design).

## 지금 상태

- 표본 3개: 기준 샘플 `state-player-actions`, `observer-health-events` (구독 세션), 워커 파일럿 `command-undo-replay` (구현 + 수정 잡 약 $6.5). 모두 독립 리뷰를 반영했다.
- 배포: GitHub `KooHoo-Dev/edu-lecture-pattern-gallery` (공개). main push 마다 kit 의 재사용 워크플로가 빌드, `gallery check`, Pages 배포를 한다.

## 규칙

- Jay 와는 한국어로 이야기한다. 권고는 하나로 한다. 되돌릴 수 있는 결정은 정하고 알린다. 질문은 끝에 모은다.
- 커밋과 push 는 Jay 가 허가한 리포에서만 한다. kit 리포(`C:\Users\user\edu-lecture-gallery-kit`)도 같다.
- API 키는 Jay 만 넣는다. 대화나 화면으로 키를 받지 않는다.
- 이 PC 에는 `gh` 가 없다. 리포 생성과 설정(Pages Source, 공개 범위)은 Jay 가 한다.

## 명령

```bash
npm run build                                   # 타입 검사 + 단일 HTML
node tools/truth.mjs <id>                       # dotnet 으로 C# 기록 만들고 sim 과 대조
node tools/gallery.mjs check <id>               # 표본 검사 (kit 공통 + 도메인)
node tools/gallery.mjs check                    # 전체 검사 (용량, 오프라인, Skill 최신 포함)
node tools/gallery.mjs unity-compile [id]       # Unity 6.3 Roslyn 컴파일 (C# 9)
node tools/gallery.mjs live <id> --query="auto=1&t=1.3" wait:600 stage:final
node tools/gallery.mjs thumbs [id]              # 무대 썸네일
node tools/gallery.mjs skill                    # Skill 폴더와 zip
npm run kit:sync                                # 로컬 kit 변경을 node_modules 에 복사 (확인용, 커밋 전 태그 설치로 되돌린다)
```

## 표본 작업 흐름 (워커)

1. `docs/selection.md` 카드와 `src/registry.ts` 의 PLANNED 항목을 먼저 넣는다.
2. `tools/workflow/specs-pilot.mjs` 형식으로 명세를 쓰고 `node tools/workflow/make-jobs.mjs <명세.mjs>` 로 `jobs/<id>.md` 를 만든다.
3. 돌리기 전에 `dispatch status` 로 남은 추정액을 본다. `dispatch run --repo C:/Users/user/edu-lecture-pattern-gallery <id>`.
4. 리뷰 화면을 찍어 `_review/<id>/` 에 모으고, general-purpose 서브에이전트에게 `tools/workflow/review-brief.md` 대로 독립 리뷰를 맡긴다.
5. 구현 브랜치를 main 에 병합 → 지적을 수정 명세(`fix: true`)로 → 수정 잡 → 병합.
6. 마무리: `node tools/gallery.mjs thumbs`, `npm run build`, `node tools/gallery.mjs skill`, `node tools/gallery.mjs check` → 커밋, push.

## 함정

- Node 가 `meta.ts`, `sim.ts`, `src/stage/runner.ts` 를 직접 읽는다. 타입은 `import type`, 상대 경로 import 는 `.ts` 확장자, 생성자 매개변수 속성 금지.
- sim 의 float 계산은 연산마다 `Math.fround`. 빠뜨리면 타이머가 한 프레임 어긋나 상태 줄이 달라진다.
- check-domain 의 Core 검사는 주석을 빼고 본다 ("UnityEngine 을 쓰지 않는다" 같은 설명 때문에).
- 무대 캡처의 상태 배지는 검사와 썸네일이 숨긴다. `live` 화면에는 남는다.
