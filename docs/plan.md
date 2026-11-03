# Pattern Gallery 계획서

유니티 개발자 양성과정의 강사와 수강생이 함께 보는 **게임 프로그래밍 패턴 갤러리**. 패턴 없이 짠 흔한 코드와 패턴을 쓴 코드를 같은 입력으로 돌려, 무엇이 왜 깨지고 어떻게 고쳐지는지 화면으로 보고, AI 에게 같은 구조를 지시해 자기 프로젝트에 넣을 수 있게 한다.

- 작성: 2026-11-03. 설계는 kit 리포의 `docs/design.md` 4-2절 (Jay 확인).
- 공통 틀: `@koohoo/gallery-kit` (`C:\Users\user\edu-lecture-gallery-kit`, GitHub `KooHoo-Dev/edu-lecture-gallery-kit`).

## 1. 확정된 결정

| 항목 | 결정 |
|---|---|
| 구조 | kit 셸의 `갤러리 -> 상세`. 무대는 패턴 갤러리 공통 '시나리오 무대' 하나 (미니 월드, 구조 그림, 사건 기록, 코드 줄) |
| 대상 | Unity 6.3 LTS (6000.3), C# 9, 새 Input System |
| 표본 | 패턴 하나 × 게임 상황 하나. 순수 C# 코어 + MonoBehaviour 어댑터 + 나쁜 예 |
| 웹 = Unity | 코어를 TS(sim.ts)로 같은 이름으로 옮기고, 같은 시나리오를 dotnet 으로 돌린 C# 기록과 줄마다 대조한다. Unity 는 컴파일만 자동으로 본다 |
| 파일럿 | 상태, 관찰자 (기준 샘플, 구독), 명령 (워커 파일럿) |
| 크레딧 | 회사 플랜 크레딧이 11-19 (UTC) 만료라 그 전에 워커 잡을 돌린다. 패턴 갤러리 몫은 약 $150 (UI 갤러리와 나눠 씀) |
| 언어 | UI·해설·주석은 한국어, 식별자와 파일명은 영어 |

## 2. 리포 구조

```text
edu-lecture-pattern-gallery/
├─ src/
│  ├─ main.tsx, gallery.config.tsx, registry.ts, ai.ts, theme.css
│  ├─ stage/            시나리오 무대 (types, runner, draw, ScenarioStage)
│  ├─ specimens/<id>/   meta.ts, sim.ts
│  └─ shots/<id>/       무대 썸네일 (gallery thumbs)
├─ unity/<id>/          Core/, Unity/, Naive/
├─ truth/               dotnet 하네스 (Harness.csproj, Runner/), <id>/Target.cs 와 기록
├─ tools/               gallery.mjs (kit 도구 진입점), truth.mjs, check-domain.mjs, kit-sync.mjs, workflow/
├─ jobs/                JayDispatch 잡
├─ skill/game-patterns/ Skill (생성물, 커밋)
└─ docs/                plan, handoff, specimen-guide, selection
```

## 3. 진행 기록

### 2026-11-03 뼈대와 기준 샘플

- kit v0.1.0 (`0bcd127`) 를 git 태그로 설치. kit 에 갤러리별 검사·썸네일 링크 옵션(`checkQuery`, `thumbQuery`), Unity 컴파일 임시 폴더 분리, 트랙 엔진의 지울 수 있는 문법 정리를 더했다 (kit 작업 트리, v0.1.1 로 낼 것).
- 시나리오 무대: 무대 시간은 언제나 프레임 경계(1/60)이고, 같은 설정과 입력이면 같은 화면이다. 자동 데모는 첫 시나리오를 반복하고 사람이 입력하면 그 주기를 넘겨받는다. 뒤로 가면 처음부터 다시 돈다. 조절 값이나 효과 끄기를 바꾸면 처음부터 다시 돈다.
- 대조: C# `float` 계산을 sim 에서 `Math.fround` 로 연산마다 맞췄더니 두 기준 샘플 모두 시나리오 6개가 첫 시도에 줄마다 같았다. 대조는 숫자를 0.02 까지 같게 본다 (한 프레임 어긋남 대비).
- 기록 맨 위에 C# 지문(`# src`)을 둬서, C# 를 고치고 기록을 다시 만들지 않으면 검사가 잡는다.
- Node 가 갤러리의 TS 를 직접 읽어 대조한다. 그래서 `verbatimModuleSyntax`, `erasableSyntaxOnly` 를 켰다 (kit 도 같게).
- 기준 샘플 `state-player-actions`, `observer-health-events`: truth 대조, gallery check, Unity 컴파일(C# 12개) 통과.
- 독립 리뷰 2건 (둘 다 "수정 후 병합") 반영:
  - 상태: `Exit` 가 실제로 공격 판정(`HitboxOn`)을 끈다. 받지 않는 입력은 `HandleInput` 이 `null` 을 돌려주고 `InputIgnored` 로 알린다 (상태 안에서 처리한 입력과 구분). 자동 데모에 공격 중 피격을 넣어 나쁜 예 버그 넷이 모두 나온다. 어댑터: 시작 위치 순간이동, 코어를 처음 읽을 때 만들기, 구독은 `OnEnable`/`OnDisable`, `InputActionType.Button`, `OnValidate`, 크기 보존.
  - 관찰자: 코어 구독자가 결과를 이벤트(`Updated`, `Played`, `Unlocked`, `Shown`)로 알리고 어댑터가 핸들러에서 바로 화면에 옮긴다 (이벤트를 플래그로 바꿔 매 프레임 읽던 구조를 버림. 이제 해제를 빼먹으면 Unity 에서도 MissingReferenceException 이 난다). `Died` 재진입 두 번 호출 막음, `GameOverPanel` 이 붙을 때 지금 상태를 맞춤, "끄기" 와 "파괴" 를 "없애기/다시 만들기" 로 통일, Unity 넣는 순서(Source Image, Fill Method, 항상 켜진 오브젝트, AudioClip) 고침. 사건 기록이 실제 호출 순서를 보여 다시 만든 바가 뒤로 가는 것이 보인다.
  - 공통: sim 의 `dt` 를 C# 와 같은 float 로, 대조는 줄 머리(시각)를 정확히, 나쁜 예 버그 종류가 모두 자동 데모에 나오는지 검사, 가이드 3~6절 보강.

## 4. 남은 일

1. 기준 샘플 독립 리뷰 반영.
2. kit v0.1.1 태그, 이 리포의 kit 의존성과 deploy.yml 태그 올리기.
3. GitHub 리포 연결(Jay 가 만든다), 첫 커밋, Pages 배포 확인 (Source 를 GitHub Actions 로).
4. 워커 파일럿 `command-undo-replay` (JayDispatch, Opus 5.5 high, 예산 $12) → 독립 리뷰 → 수정 잡 → 병합.
5. Jay 의 디자인 패턴 교안을 받아 `docs/selection.md` 3절 후보를 다시 고르고 묶음으로 만든다.
