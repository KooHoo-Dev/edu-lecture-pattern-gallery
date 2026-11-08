---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs update-method-drone-list
  - node tools/gallery.mjs check update-method-drone-list
  - node tools/gallery.mjs unity-compile update-method-drone-list
  - node tools/gallery.mjs thumbs update-method-drone-list
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/update-method-drone-list/**
  - truth/update-method-drone-list/**
  - src/specimens/update-method-drone-list/**
  - src/shots/update-method-drone-list/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: update-method-drone-list

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을, 모아 두었다 나중에 처리하는 구조는 `event-queue-sound` 를 참고한다.
4. `docs/selection.md` 의 `update-method-drone-list` 카드.

## 표본별

- ID `update-method-drone-list`, namespace `PatternGallery.UpdateMethodDroneList`. 제목 `업데이트 메서드: 드론 목록 한 프레임`, 그룹 A, 순서 5, 난이도 2, `pattern: '업데이트 메서드'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: `DroneSwarm` 이 드론 목록을 매 프레임 돌며 `drone.Update(dt)` 를 부른다 (Unity 의 `Update` 대신 매니저가 도는 구조, Nystrom 의 업데이트 메서드). 드론은 오른쪽에서 기지(왼쪽)로 같은 속도로 나란히 움직인다. 드론은 자기 `Update` 안에서 기지에 닿거나 HP 가 0 이면 **스스로 목록에서 빠지기를 요청**하고, 분열 드론은 정해진 시각에 자기 `Update` 안에서 **새 드론을 만든다**. 드론마다 업데이트 횟수를 센다.
- **입력과 키**: `spawn` 드론 하나, `splitter` 분열 드론 하나, `emp` 모든 드론에 피해 1 (여러 드론이 같은 프레임에 파괴). `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `Drone.Update(float dt, DroneSwarm swarm)` 와 `DroneSwarm.Tick(dt)`. 업데이트 중의 제거는 `swarm.Despawn(this)` 가 **표시만** 하고(`IsDead`), 추가는 `swarm.Spawn(d)` 가 **대기 목록**에 넣는다. 루프가 끝난 뒤 죽은 드론을 한꺼번에 지우고(`RemoveAll`) 대기 목록을 합친다. 새 드론은 다음 프레임부터 업데이트된다. 일어난 일은 C# event (`Spawned`, `Despawned`, `Split` 등).
- **나쁜 예 (Naive/)**: `for (int i = 0; i < drones.Count; i++) drones[i].Update(dt);` 안에서 드론이 바로 `drones.Remove(this)` 하고, 분열 드론이 바로 `drones.Add(child)` 하는 흔한 코드. ✖ `업데이트 건너뜀` (지워진 드론 바로 다음 드론이 그 프레임에 안 움직여 한 프레임 뒤처짐), ✖ `태어난 프레임에 움직임` (새 드론이 만들어진 프레임에 바로 업데이트). 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다. 한 프레임 뒤처짐은 화면에서 작으므로 **업데이트 횟수 숫자**와 "있어야 할 자리" 점선으로 이어서 보이게 한다 (가이드 4절). `foreach` 로 바꾸면 `InvalidOperationException` 으로 루프가 멈춘다는 것은 `mistakes` 에.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 드론 몇 대 → 분열 드론 → EMP (여러 대 파괴, 건너뜀) → 분열. 앞쪽 드론이 기지에 닿아 빠지는 순간도 들어가면 좋다. 두 번째: 분열만 여러 번 (나쁜 예는 연쇄로 같은 프레임에 더 나뉘는지 — 분열 규칙에 따라. 글과 맞게). 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: `moveSpeed`, `splitDelay`, 그 밖에 화면 차이가 큰 것. 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 왼쪽 기지(`box`), 땅 위 드론 `actor` (`role: 'enemy'`, 라벨 `D1`… 와 업데이트 횟수 `u 58`), 분열 드론은 다른 라벨·`scale`, 파괴는 짧은 `ring`. 왼쪽 위에 `목록 n · 이번 프레임 업데이트 n · 대기 n · 지울 것 n`. 나쁜 예는 건너뛴 드론의 횟수가 이웃보다 작고 "있어야 할 자리" 점선 `box` 가 앞에 남는 것, 태어난 프레임에 움직인 드론의 표시가 이어서 보여야 한다.
- **구조 그림**: SwarmRunner(연결 컴포넌트) → DroneSwarm (`Tick`) → Drone (`object`, `Update`), 그리고 DroneSwarm 의 `지울 목록`, `대기 목록` 노드. 나쁜 예 구조 그림은 루프 안에서 Drone 이 목록을 직접 `Remove`/`Add` 하는 모양. 단계: 1 매니저가 목록을 처음부터 돌며 드론마다 `Update` 를 부른다, 2 드론이 빠지겠다고 하면 표시만 한다, 3 새 드론은 대기 목록에 넣는다, 4 루프가 끝나면 표시된 드론을 지우고 대기 목록을 합친다.
- **Unity 연결 컴포넌트 (Unity/)**: `SwarmRunner : MonoBehaviour` 의 `Update` 가 `Tick(Time.deltaTime)` 하고, 드론 오브젝트는 프리팹으로 만들어 코어 드론과 짝짓고 `Despawned` 에서 `Destroy` (Unity 의 `Destroy` 는 프레임 끝까지 미뤄진다는 것도 같은 생각이라고 글에). 드론 오브젝트에는 자기 `Update` 를 두지 않는다 (매니저가 도는 구조. 수백 대에서 `Update` 호출 비용을 줄이는 이유와 함께).
- **글**: 증상 "EMP 로 여러 대를 잡았더니 남은 드론 하나가 줄에서 뒤처진다" 에서 시작한다. Unity 의 `MonoBehaviour.Update` 자체가 업데이트 메서드 패턴이라는 것, 직접 목록을 돌 때 생기는 일을 한 문장씩. `mistakes` 후보: 도는 중에 `Remove` 로 건너뜀, `foreach` 에서 지워 예외, 도는 중에 `Add` 해 태어난 프레임에 업데이트, 거꾸로 돌아 지우기는 되지만 추가는 여전히 문제, 파괴된 오브젝트를 목록에 남겨 `MissingReferenceException`. `references`: https://gameprogrammingpatterns.com/update-method.html (Nystrom: Update Method), https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.removeall (Microsoft `List<T>.RemoveAll`), https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.removeat (Microsoft `List<T>.RemoveAt`). `related`: `object-pool-projectiles`, `event-queue-sound`.
- **묶음 2~4 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. 미니 월드의 ✖ 표시는 기록과 같은 판정이다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대와 프리셋마다 글·그림이 겹치지 않는지 `live` 로 본다 (`p.<key>=` , `preset=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로. 패턴도 같은 증상이면 ✖ 를 달지 않는다 (가이드 4절). (9) `// [!]` 설명은 한 줄 안팎 (무대 문제 줄 칸에 보인다). 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄을 둔다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 5 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 내용을 글에 녹일 수 있으나 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs update-method-drone-list` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check update-method-drone-list`, `node tools/gallery.mjs unity-compile update-method-drone-list` 통과.
3. `node tools/gallery.mjs live update-method-drone-list --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
